"""File management for transcripts."""

import json
from pathlib import Path

import streamlit as st

from .config import map_response_format_to_ext
from .utils import stable_filename


class TranscriptManager:
    """Manages transcript file storage and download functionality."""

    def __init__(self, output_dir: Path = Path("transcripts")):
        """Initialize transcript manager with output directory."""
        self.output_dir = output_dir
        self.output_dir.mkdir(exist_ok=True)

    def save_and_offer_download(
        self, content: str, model: str, response_format: str, source_name: str
    ) -> None:
        """Save transcript and offer download button."""
        ext = map_response_format_to_ext(response_format)
        stem = Path(source_name).stem
        fname = stable_filename(stem, model, ext)
        out_path = self.output_dir / fname
        out_path.write_text(content, encoding="utf-8")

        st.session_state.setdefault("downloads", {})
        st.session_state["downloads"][fname] = content.encode("utf-8")

        st.success("Transcription complete.")
        st.download_button(
            label="⬇️ Download transcript",
            data=st.session_state["downloads"][fname],
            file_name=fname,
            mime=(
                "text/plain"
                if ext in ("txt", "srt", "vtt")
                else "application/json"
            ),
            key=f"dl_{fname}",
        )
        st.caption(f"Saved at: {out_path.resolve()}")

    def save_structured(
        self,
        document: dict,
        model: str,
        source_name: str,
        label: str = "⬇️ Download structured JSON",
    ) -> Path:
        """Persist structured transcript document and register download."""
        stem = Path(source_name).stem
        fname = stable_filename(stem, f"{model}-structured", "json")
        out_path = self.output_dir / fname
        serialized = json.dumps(document, indent=2)
        out_path.write_text(serialized, encoding="utf-8")

        st.session_state.setdefault("downloads", {})
        st.session_state["downloads"][fname] = serialized.encode("utf-8")

        st.download_button(
            label=label,
            data=st.session_state["downloads"][fname],
            file_name=fname,
            mime="application/json",
            key=f"dl_{fname}",
        )
        st.caption(f"Structured JSON saved at: {out_path.resolve()}")
        return out_path

    def load_latest_structured(self) -> tuple[dict, str] | None:
        """Load the most recently modified structured transcript JSON from disk.

        Returns a tuple of (document, source_name) or None if none found.
        """
        candidates = sorted(
            self.output_dir.glob("*-structured.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        for path in candidates:
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                # Attempt to recover source name from filename
                stem = path.stem
                # stable_filename builds like: <source>__<model>-structured
                source_part = stem.split("__", 1)[0] if "__" in stem else stem
                return data, source_part
            except Exception:
                continue
        return None
