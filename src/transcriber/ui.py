"""Streamlit UI components."""

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

import streamlit as st

from .config import effective_output_formats
from .constants import SUPPORTED_EXTS
from .scoring import ScorecardResult
from .spreadsheet_ingestion import load_scorecard, ScorecardTable
from .redaction import redact_transcript_document


def render_sidebar(default_api_key: str = ""):
    """Render sidebar with API key and model selection."""
    with st.sidebar:
        api_key = st.text_input(
            "OpenAI API key", 
            type="password", 
            value=default_api_key,
            placeholder="sk-...",
            help="You can also set OPENAI_API_KEY in .env file"
        )
        model = st.selectbox(
            "Model",
            options=(
                "gpt-4o-transcribe",
                "gpt-4o-mini-transcribe",
                "whisper-1",
            ),
            index=0,
            help="Use whisper-1 if you specifically need SRT/VTT output.",
        )
        return api_key, model


def render_main_controls(model: str):
    """Render main controls for the application."""
    output_format = st.selectbox(
        "Output format", options=effective_output_formats(model), index=0
    )
    language = st.text_input(
        "Language (optional, e.g., 'en' or 'auto')", value="auto"
    )

    uploaded = st.file_uploader(
        "Upload audio/video file",
        type=SUPPORTED_EXTS,
        accept_multiple_files=False,
        help="MP4 for videos; also supports MP3, M4A, WAV, WEBM, MPEG/MPGA.",
    )

    return output_format, language, uploaded


def render_advanced_settings(target_kbps: int, cap_mb: int):
    """Render advanced settings expander."""
    with st.expander("Advanced settings", expanded=False):
        reencode = st.checkbox(
            "Re-encode to speech-optimized MP3 (mono 16 kHz, 32 kbps)",
            value=True,
        )
        target_kbps = st.slider(
            "Target MP3 bitrate (kbps)",
            min_value=16,
            max_value=96,
            value=target_kbps,
            step=16,
        )
        cap_mb = st.slider(
            "Per-segment size target (MB)",
            min_value=10,
            max_value=24,
            value=cap_mb,
            step=1,
        )
        playback_rate = st.slider(
            "Audio speed factor",
            min_value=0.5,
            max_value=2.0,
            value=1.0,
            step=0.1,
            help="Increase above 1.0 to speed up and shrink files (e.g., 1.2); decrease below 1.0 to slow down.",
        )
        compare_models = st.checkbox(
            "Enable silence-aware splitting and compare whisper-1 with gpt-4o-mini",
            value=True,
        )
        pii_redact = st.checkbox(
            "Redact PII (emails/phones) before scoring",
            value=True,
            help="Names are not aggressively redacted to preserve context; can be extended later.",
        )
        return reencode, target_kbps, cap_mb, playback_rate, compare_models, pii_redact


def render_info_expander():
    """Render information expander with usage notes."""
    with st.expander("Notes on formats, limits, and models", expanded=False):
        st.markdown(
            "- **Models**: default `gpt-4o-transcribe` (or `gpt-4o-mini-transcribe`).\n"
            "- **Input formats**: mp3, mp4, mpeg, mpga, m4a, wav, webm.\n"
            "- **Per-request cap**: ~25 MB; this app auto re-encodes and chunks to stay under the cap.\n"
            "- **Outputs**: `text`/`json` for the 4o‑transcribe models; use `whisper-1` for `srt`/`vtt`.\n"
            "We re-encode to **mono 16 kHz, 32 kbps MP3** to maximize length within the cap."
        )


def show_transcript_preview(transcript: str):
    """Display transcript preview."""
    st.subheader("Preview")
    st.text_area("Transcript", value=transcript, height=320)


def show_progress_callback(i: int, total: int, seg_path, duration: float):
    """Progress callback for transcription."""
    seg_size = seg_path.stat().st_size / (1024**2)
    st.write(f"Segment {i}/{total} — {seg_path.name} ({seg_size:.2f} MB)")
    st.caption(f"Segment {i} processed in {duration:.1f}s.")


def show_final_info():
    """Show final information message."""
    st.info(
        "The download button remains available after clicking and the file is also saved under ./transcripts/. "
        "Nothing is uploaded anywhere except to the OpenAI API for transcription."
    )


@dataclass
class AuditInputs:
    policy_file: Optional[Any]
    scorecard_file: Optional[Any]
    template_file: Optional[Any]
    selected_template_name: Optional[str]
    convert_policy: bool
    run_audit: bool
    instructions: str
    additional_notes: str


def render_audit_controls(
    has_transcript: bool, stored_templates: Dict[str, Dict]
) -> AuditInputs:
    """Render controls for compliance auditing."""

    if not has_transcript:
        st.warning("Transcribe audio to enable compliance scoring.")

    policy_col, template_col = st.columns(2)
    with policy_col:
        policy_file = st.file_uploader(
            "Upload policy document",
            type=["txt", "md", "pdf", "docx", "json"],
            key="policy_upload",
        )
        scorecard_file = st.file_uploader(
            "Upload existing scorecard (XLSX/CSV)",
            type=["xlsx", "csv"],
            key="scorecard_upload",
            help="Optional: used to seed the template generation"
        )
        instructions = st.text_area(
            "Conversion instructions (optional)",
            key="policy_instructions",
            height=120,
        )
        convert_policy = st.button(
            "Convert policy to template",
            key="convert_policy_button",
            disabled=policy_file is None,
        )

    with template_col:
        template_file = st.file_uploader(
            "Upload existing template (JSON)",
            type=["json"],
            key="template_upload",
        )

        template_names = ["" ] + sorted(stored_templates.keys())
        selected_template_name = st.selectbox(
            "Select template",
            options=template_names,
            key="template_select",
        )

    additional_notes = st.text_area(
        "Notes for the auditor (optional)",
        key="audit_notes",
        height=120,
    )

    run_audit = st.button(
        "Generate report card",
        type="primary",
        key="run_audit_button",
        disabled=not has_transcript,
    )

    return AuditInputs(
        policy_file=policy_file,
        scorecard_file=scorecard_file,
        template_file=template_file,
        selected_template_name=selected_template_name or None,
        convert_policy=convert_policy,
        run_audit=run_audit,
        instructions=instructions.strip(),
        additional_notes=additional_notes.strip(),
    )


def render_audit_summary(stored_templates: Dict[str, Dict]) -> None:
    """Display available templates and hints."""
    if not stored_templates:
        st.info("No templates saved yet. Upload or generate one to begin.")
        return

    st.subheader("Saved templates")
    for name in sorted(stored_templates.keys()):
        st.caption(f"• {name}")


def show_scorecard(scorecard: ScorecardResult) -> None:
    """Render the compliance scorecard results."""
    st.subheader("Compliance scorecard")

    status_col, score_col = st.columns(2)
    status_col.metric("Status", scorecard.overall_status.title())
    if scorecard.overall_score is not None:
        score_col.metric("Overall score", f"{scorecard.overall_score:.2f}")
    else:
        score_col.metric("Overall score", "N/A")

    if scorecard.summary:
        st.write(scorecard.summary)

    for category in scorecard.categories:
        header = f"{category.name} — {category.status.title()}"
        with st.expander(header, expanded=False):
            if category.score is not None:
                st.caption(f"Score: {category.score:.2f}")
            if category.rationale:
                st.write(category.rationale)
            for criterion in category.criteria:
                st.markdown(
                    f"**{criterion.id}** — {criterion.status.title()}"
                )
                if criterion.score is not None:
                    st.caption(f"Score: {criterion.score:.2f}")
                if criterion.rationale:
                    st.write(criterion.rationale)
                if criterion.action_items:
                    st.markdown("Action items:")
                    for item in criterion.action_items:
                        st.markdown(f"- {item}")

    if scorecard.recommendations:
        st.subheader("Recommendations")
        for rec in scorecard.recommendations:
            st.markdown(f"- {rec}")

    serialized = json.dumps(scorecard.to_dict(), indent=2)
    st.download_button(
        label="⬇️ Download scorecard JSON",
        data=serialized.encode("utf-8"),
        file_name="scorecard.json",
        mime="application/json",
        key="download_scorecard",
    )
