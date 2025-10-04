"""Main Streamlit application."""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

from .audio_processor import AudioProcessor
from .constants import (DEFAULT_COMPLIANCE_MODEL, POLICY_STORAGE_DIR,
                        SAFETY_MB, TARGET_MP3_KBPS)
from .file_manager import TranscriptManager
from .policy_ingestion import (DocumentExtractor, PolicyTemplate,
                               TemplateBuilder, TemplateStore)
from .spreadsheet_ingestion import load_scorecard
from .scoring import ComplianceScorer, ScorecardResult
from .transcription import TranscriptionService
from .ui import (render_advanced_settings, render_audit_controls,
                 render_audit_summary, render_info_expander,
                 render_main_controls, render_sidebar, show_final_info,
                 show_progress_callback, show_scorecard,
                 show_transcript_preview)

# Load environment variables
load_dotenv()


def get_default_api_key() -> str:
    """Get API key from environment or return empty string."""
    return os.getenv("OPENAI_API_KEY", "")


def main():
    """Main application entry point."""
    st.set_page_config(
        page_title="Meeting Transcriber (OpenAI)", layout="centered"
    )
    st.title("Meeting Transcriber (OpenAI Audio)")

    render_info_expander()

    default_api_key = get_default_api_key()
    api_key, model = render_sidebar(default_api_key)
    st.session_state["api_key"] = api_key

    transcription_tab, audit_tab = st.tabs(["Transcription", "Compliance Audit"])

    with transcription_tab:
        output_format, language, uploaded = render_main_controls(model)
        (
            reencode,
            target_kbps,
            cap_mb,
            playback_rate,
            compare_models,
        ) = render_advanced_settings(
            TARGET_MP3_KBPS, int(SAFETY_MB)
        )

        submit = st.button(
            "Transcribe",
            type="primary",
            use_container_width=True,
            key="transcribe_button",
        )

        if submit:
            if not api_key:
                st.error("Enter your OpenAI API key.")
            elif not uploaded:
                st.error("Upload a file first.")
            else:
                transcription_service = TranscriptionService(api_key)
                file_manager = TranscriptManager()
                audio_processor = AudioProcessor()

                try:
                    status = st.status("Preparing audio …", expanded=True)
                    try:
                        segments = audio_processor.prepare_audio(
                            uploaded_file=uploaded,
                            reencode=reencode,
                            target_kbps=target_kbps,
                            cap_mb=float(cap_mb),
                            playback_rate=playback_rate,
                            use_silence_splitting=compare_models,
                        )

                        if len(segments) > 1:
                            status.write(
                                f"Split into {len(segments)} segments to satisfy per-request cap."
                            )

                        status.update(label="Audio ready", state="complete")
                    except Exception as prep_err:
                        status.update(label="Preparing audio failed", state="error")
                        st.exception(prep_err)
                        return

                    progress = st.progress(0.0, text="Transcribing …")

                    def _progress_update(i, total, seg_path, dt):
                        progress.progress(i / total)
                        show_progress_callback(i, total, seg_path, dt)

                    try:
                        if compare_models:
                            comparison = transcription_service.transcribe_segments_comparison(
                                segments=segments,
                                language=language.strip() if language else None,
                                progress_callback=_progress_update,
                            )
                            final_content = comparison
                            preview_text = comparison.get("final", {}).get("text_concat", "")
                            download_model = "comparison"
                            download_format = "json"
                        else:
                            raw_chunks = transcription_service.transcribe_segments(
                                segments=segments,
                                model=model,
                                response_format=output_format,
                                language=language.strip() if language else None,
                                progress_callback=_progress_update,
                            )

                            transcript_doc = transcription_service.build_transcript_document(
                                chunks=raw_chunks,
                                segments=segments,
                                model=model,
                                response_format=output_format,
                            )

                            st.session_state["transcript_document"] = transcript_doc
                            st.session_state["transcript_source_name"] = uploaded.name
                            final_content = transcript_doc
                            preview_text = transcript_doc.get("text") or ""
                            download_model = model
                            download_format = output_format

                    except Exception as transcribe_err:
                        st.error(f"Transcription failed: {transcribe_err}")
                        return
                    finally:
                        progress.empty()

                    if compare_models:
                        serialized = json.dumps(final_content, indent=2)
                        show_transcript_preview(preview_text or serialized)
                        file_manager.save_and_offer_download(
                            content=serialized,
                            model=download_model,
                            response_format="json",
                            source_name=uploaded.name,
                        )
                    else:
                        chunks = raw_chunks
                        if output_format in ("json", "verbose_json"):
                            serialized = json.dumps(final_content, indent=2)
                            show_transcript_preview(preview_text)
                            file_manager.save_and_offer_download(
                                content=serialized,
                                model=download_model,
                                response_format="json",
                                source_name=uploaded.name,
                            )
                        elif output_format in ("srt", "vtt"):
                            merged = "\n\n".join(chunks)
                            show_transcript_preview(merged)
                            file_manager.save_and_offer_download(
                                content=merged,
                                model=download_model,
                                response_format=output_format,
                                source_name=uploaded.name,
                            )
                        else:
                            separator = "\n\n" + ("—" * 24) + "\n\n"
                            merged = separator.join(chunks)
                            show_transcript_preview(preview_text or merged)
                            file_manager.save_and_offer_download(
                                content=merged,
                                model=download_model,
                                response_format="text",
                                source_name=uploaded.name,
                            )

                        file_manager.save_structured(
                            document=final_content,
                            model=download_model,
                            source_name=uploaded.name,
                        )

                    show_final_info()

                finally:
                    audio_processor.cleanup()

    with audit_tab:
        transcript_doc = st.session_state.get("transcript_document")

        template_store = TemplateStore(Path(POLICY_STORAGE_DIR))
        stored_templates = template_store.list_templates()

        audit_inputs = render_audit_controls(
            has_transcript=transcript_doc is not None,
            stored_templates=stored_templates,
        )

        selected_template_schema: Optional[Dict[str, Any]] = None
        generated_template: Optional[PolicyTemplate] = None

        if audit_inputs.convert_policy and audit_inputs.policy_file is not None:
            try:
                document = DocumentExtractor.load(audit_inputs.policy_file)
                client = OpenAI(api_key=api_key) if api_key else None
                if client is None:
                    st.error("Enter your OpenAI API key to convert policies.")
                else:
                    builder = TemplateBuilder(client, DEFAULT_COMPLIANCE_MODEL)
                    scorecard_struct = None
                    if audit_inputs.scorecard_file is not None:
                        try:
                            table = load_scorecard(audit_inputs.scorecard_file)
                            scorecard_struct = {
                                "name": table.name,
                                "headers": table.headers,
                                "rows_sample": table.rows[:5],
                            }
                        except Exception as parse_err:
                            st.warning(f"Scorecard parsing failed, continuing without it: {parse_err}")
                    generated_template = builder.build_from_policy(
                        document,
                        audit_inputs.instructions,
                        scorecard_structure=scorecard_struct,
                    )
                    template_store.save(generated_template)
                    st.success(f"Template '{generated_template.name}' saved.")
                    stored_templates = template_store.list_templates()
            except Exception as policy_err:
                st.error(f"Failed to process policy: {policy_err}")

        if audit_inputs.template_file is not None:
            try:
                uploaded_template = TemplateBuilder.load_template_file(
                    audit_inputs.template_file
                )
                template_store.save(uploaded_template)
                st.success(f"Template '{uploaded_template.name}' uploaded.")
                stored_templates = template_store.list_templates()
            except Exception as template_err:
                st.error(f"Failed to load template: {template_err}")

        if audit_inputs.selected_template_name:
            selected_template_schema = stored_templates.get(
                audit_inputs.selected_template_name
            )

        if generated_template and not audit_inputs.selected_template_name:
            selected_template_schema = generated_template.schema

        render_audit_summary(stored_templates)

        if audit_inputs.run_audit:
            if not api_key:
                st.error("Enter your OpenAI API key to score transcripts.")
            elif not transcript_doc:
                st.error("Transcribe audio before running a compliance audit.")
            elif not selected_template_schema:
                st.error("Select or generate a template before scoring.")
            else:
                try:
                    scorer = ComplianceScorer(
                        api_key=api_key,
                        model=DEFAULT_COMPLIANCE_MODEL,
                    )
                    template_name = audit_inputs.selected_template_name
                    if not template_name and generated_template:
                        template_name = generated_template.name
                    template = PolicyTemplate(
                        name=template_name or "Compliance Template",
                        schema=selected_template_schema,
                        created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    )
                    scorecard = scorer.evaluate(
                        transcript=transcript_doc,
                        template=template,
                        additional_notes=audit_inputs.additional_notes,
                    )
                    st.session_state["scorecard_result"] = scorecard
                    st.success("Compliance audit completed.")
                except Exception as audit_err:
                    st.error(f"Compliance scoring failed: {audit_err}")

        scorecard_payload = st.session_state.get("scorecard_result")
        if isinstance(scorecard_payload, ScorecardResult):
            show_scorecard(scorecard_payload)


if __name__ == "__main__":
    main()
