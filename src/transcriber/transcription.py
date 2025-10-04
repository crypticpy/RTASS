"""Core transcription functionality."""

import time
from pathlib import Path
from typing import List, Optional

from openai import OpenAI

from .config import effective_output_formats, map_response_format_to_ext
from .constants import DEFAULT_SR


class TranscriptionService:
    """Service for handling audio transcription with OpenAI API."""

    def __init__(self, api_key: str):
        """Initialize transcription service with API key."""
        self.client = OpenAI(api_key=api_key)

    def transcribe_segment(
        self,
        model: str,
        fpath: Path,
        response_format: str,
        language: Optional[str] = None,
        _retry_count: int = 0,
    ) -> str:
        """
        Transcribe a single audio segment.
        Returns text for 'text'/'srt'/'vtt' formats, or JSON string for 'json'/'verbose_json'.
        """
        # Validate file before sending to API
        if not fpath.exists():
            raise FileNotFoundError(f"Audio file not found: {fpath}")
        
        file_size = fpath.stat().st_size
        if file_size == 0:
            raise ValueError(f"Audio file is empty: {fpath}")
        
        # Check if file is actually audio by trying to read it
        try:
            from pydub import AudioSegment
            test_audio = AudioSegment.from_file(fpath)
            if len(test_audio) == 0:
                raise ValueError(f"Audio file has no duration: {fpath}")
        except Exception as e:
            raise ValueError(f"File validation failed for {fpath}: {e}")
        
        params = {
            "model": model,
            "file": open(fpath, "rb"),
            "response_format": response_format,
        }

        if language and language.lower() != "auto":
            params["language"] = language

        try:
            result = self.client.audio.transcriptions.create(**params)
        except Exception as e:
            error_msg = str(e)
            is_unsupported = (
                "corrupted or unsupported" in error_msg.lower()
                or "audio format not supported" in error_msg.lower()
            )
            if _retry_count == 0 and is_unsupported:
                try:
                    fallback_path = self._convert_to_wav(fpath)
                except Exception:
                    fallback_path = None
                if fallback_path:
                    try:
                        return self.transcribe_segment(
                            model=model,
                            fpath=fallback_path,
                            response_format=response_format,
                            language=language,
                            _retry_count=_retry_count + 1,
                        )
                    finally:
                        try:
                            if fallback_path.exists():
                                fallback_path.unlink()
                        except Exception:
                            pass
            if is_unsupported:
                raise ValueError(
                    f"Audio format not supported by OpenAI API. "
                    f"File: {fpath.name}, Size: {file_size/1024/1024:.2f}MB. "
                    f"Try converting to a standard MP3 format."
                ) from e
            raise
        finally:
            params["file"].close()

        if isinstance(result, str):
            return result

        text_attr = getattr(result, "text", None)
        if text_attr is not None:
            return text_attr

        try:
            return result.to_json()
        except Exception:
            return str(result)

    def _convert_to_wav(self, src_path: Path) -> Path:
        """Convert audio file to mono 16 kHz WAV for retry."""
        try:
            from pydub import AudioSegment
        except Exception as e:
            raise RuntimeError("pydub is required for WAV fallback conversion") from e

        audio = AudioSegment.from_file(src_path)
        audio = audio.set_channels(1).set_frame_rate(DEFAULT_SR)
        fallback_path = src_path.with_suffix(".fallback.wav")
        audio.export(fallback_path, format="wav")
        if not fallback_path.exists() or fallback_path.stat().st_size == 0:
            raise RuntimeError("Failed to produce fallback WAV file")
        return fallback_path

    def transcribe_segments(
        self,
        segments: List[Path],
        model: str,
        response_format: str,
        language: Optional[str] = None,
        progress_callback=None,
    ) -> List[str]:
        """Transcribe multiple segments with optional progress callback."""
        chunks = []

        for i, seg in enumerate(segments, start=1):
            try:
                t0 = time.time()
                text = self.transcribe_segment(
                    model=model,
                    fpath=seg,
                    response_format=response_format,
                    language=language,
                )
                dt = time.time() - t0

                if progress_callback:
                    progress_callback(i, len(segments), seg, dt)

                chunks.append(text.strip())
            except Exception as e:
                raise RuntimeError(f"Transcription failed on segment {i}: {e}")

        return chunks

    def combine_transcript_chunks(
        self, chunks: List[str], response_format: str
    ) -> str:
        """Combine transcript chunks into final output."""
        if response_format in ("text", "srt", "vtt"):
            return ("\n\n" + ("—" * 24) + "\n\n").join(chunks)
        else:
            return "\n".join(chunks)  # JSONL for multi-segment case
