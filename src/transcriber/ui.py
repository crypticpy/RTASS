"""Streamlit UI components."""

import streamlit as st

from .config import effective_output_formats
from .constants import SUPPORTED_EXTS


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
        return reencode, target_kbps, cap_mb, playback_rate, compare_models


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
