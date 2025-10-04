"""Core transcription functionality."""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional

from openai import OpenAI

from .constants import DEFAULT_SR
from .segments import PreparedSegment
from .transcript_assembler import assemble_transcript


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
        prompt: Optional[str] = None,
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
        if prompt:
            params["prompt"] = prompt

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
        segments: List[PreparedSegment],
        model: str,
        response_format: str,
        language: Optional[str] = None,
        progress_callback=None,
    ) -> List[str]:
        """Transcribe multiple segments with optional progress callback."""
        chunks = []

        for i, segment in enumerate(segments, start=1):
            seg = segment.path
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

    def build_transcript_document(
        self,
        chunks: List[str],
        segments: List[PreparedSegment],
        model: str,
        response_format: str,
    ) -> Dict[str, object]:
        """Produce structured transcript metadata for downstream workflows."""
        return assemble_transcript(
            raw_chunks=chunks,
            segments=segments,
            response_format=response_format,
            model=model,
        )

    def transcribe_segments_comparison(
        self,
        segments: List[PreparedSegment],
        language: Optional[str] = None,
        progress_callback=None,
        models: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, object]:
        """Transcribe segments with both whisper-1 and gpt-4o-mini-transcribe."""

        model_plan = models or [
            {
                "label": "whisper-1",
                "model": "whisper-1",
                "response_format": "verbose_json",
            },
            {
                "label": "gpt-4o-mini-transcribe",
                "model": "gpt-4o-mini-transcribe",
                "response_format": "text",
            },
        ]

        chunks_output = []
        final_segments: List[Dict[str, object]] = []
        final_text_parts: List[str] = []
        tail_prompt = ""

        for i, segment in enumerate(segments, start=1):
            try:
                t0 = time.time()
                chunk_record: Dict[str, object] = {
                    "index": i - 1,
                    "start_sec": segment.start,
                    "end_sec": segment.end,
                    "files": {"audio_path": str(segment.path)},
                }

                for plan in model_plan:
                    prompt = None
                    if plan["model"].startswith("gpt-4o") and tail_prompt:
                        prompt = tail_prompt

                    raw = self.transcribe_segment(
                        model=plan["model"],
                        fpath=segment.path,
                        response_format=plan["response_format"],
                        language=language,
                        prompt=prompt,
                    )

                    if plan["response_format"].endswith("json"):
                        try:
                            parsed = json.loads(raw)
                        except json.JSONDecodeError:
                            parsed = {"text": raw}
                    else:
                        parsed = raw.strip()

                    chunk_record[plan["label"]] = {
                        "model": plan["model"],
                        "response": parsed,
                    }

                    if plan["model"].startswith("gpt-4o"):
                        if isinstance(parsed, str):
                            final_text_parts.append(parsed.strip())
                            words = parsed.strip().split()
                            tail_prompt = " ".join(words[-20:]) if words else ""
                        else:
                            text = parsed.get("text", "")
                            final_text_parts.append(text)
                            words = text.split()
                            tail_prompt = " ".join(words[-20:]) if words else ""
                    elif plan["model"] == "whisper-1":
                        segments_data = parsed.get("segments") if isinstance(parsed, dict) else None
                        if segments_data:
                            for seg_data in segments_data:
                                start_val = float(seg_data.get("start", 0.0)) + segment.start
                                end_val = float(seg_data.get("end", start_val)) + segment.start
                                final_segments.append(
                                    {
                                        "start_sec": start_val,
                                        "end_sec": end_val,
                                        "speaker": seg_data.get("speaker"),
                                        "text": seg_data.get("text", ""),
                                        "source": "whisper-1",
                                    }
                                )

                dt = time.time() - t0
                if progress_callback:
                    progress_callback(i, len(segments), segment.path, dt)

                chunks_output.append(chunk_record)
            except Exception as exc:
                raise RuntimeError(
                    f"Transcription failed on segment {i}: {exc}"
                ) from exc

        final_text = "\n\n".join(part for part in final_text_parts if part)

        return {
            "chunks": chunks_output,
            "final": {
                "segments": final_segments,
                "text_concat": final_text,
            },
            "meta": {
                "diarization": {"enabled": False},
                "models_compared": [plan["model"] for plan in model_plan],
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        }
