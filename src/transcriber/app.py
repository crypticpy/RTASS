"""Main Streamlit application."""

import json
import os
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

from .audio_processor import AudioProcessor
from .constants import SAFETY_MB, TARGET_MP3_KBPS
from .file_manager import TranscriptManager
from .transcription import TranscriptionService
from .ui import (render_advanced_settings, render_info_expander,
                 render_main_controls, render_sidebar, show_final_info,
                 show_progress_callback, show_transcript_preview)

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

    # Get default API key from environment
    default_api_key = get_default_api_key()
    
    api_key, model = render_sidebar(default_api_key)
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

    submit = st.button("Transcribe", type="primary", use_container_width=True)

    if not submit:
        return

    # Validation
    if not api_key:
        st.error("Enter your OpenAI API key.")
        return
    if not uploaded:
        st.error("Upload a file first.")
        return

    # Initialize services
    transcription_service = TranscriptionService(api_key)
    file_manager = TranscriptManager()
    audio_processor = AudioProcessor()

    try:
        # Prepare audio
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

        # Transcribe
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
                final_transcript = json.dumps(comparison, indent=2)
                preview_text = comparison.get("final", {}).get("text_concat", "")
                download_model = "comparison"
                download_format = "json"
            else:
                chunk_paths = [segment.path for segment in segments]
                chunks = transcription_service.transcribe_segments(
                    segments=chunk_paths,
                    model=model,
                    response_format=output_format,
                    language=language.strip() if language else None,
                    progress_callback=_progress_update,
                )

                final_transcript = transcription_service.combine_transcript_chunks(
                    chunks, output_format
                )
                preview_text = final_transcript
                download_model = model
                download_format = output_format

        except Exception as transcribe_err:
            st.error(f"Transcription failed: {transcribe_err}")
            return
        finally:
            progress.empty()

        # Display results
        show_transcript_preview(preview_text or final_transcript)
        file_manager.save_and_offer_download(
            content=final_transcript,
            model=download_model,
            response_format=download_format,
            source_name=uploaded.name,
        )
        show_final_info()

    finally:
        # Cleanup temporary files
        audio_processor.cleanup()


if __name__ == "__main__":
    main()
