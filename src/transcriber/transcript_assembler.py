"""Utilities for composing structured transcript documents."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .segments import PreparedSegment


@dataclass
class TranscriptChunk:
    """Normalized transcription chunk with timing metadata."""

    index: int
    start_sec: Optional[float]
    end_sec: Optional[float]
    text: str
    raw: Any

    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "start_sec": self.start_sec,
            "end_sec": self.end_sec,
            "text": self.text,
            "raw": self.raw,
        }


def _parse_chunk_payload(payload: str, response_format: str) -> Any:
    if response_format in {"json", "verbose_json"}:
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return {"text": payload}
    return payload


def _extract_chunk_text(parsed: Any, response_format: str) -> str:
    if isinstance(parsed, str):
        return parsed.strip()
    if isinstance(parsed, dict):
        text = parsed.get("text")
        if isinstance(text, str):
            return text.strip()
    return ""


def assemble_transcript(
    raw_chunks: List[str],
    segments: List[PreparedSegment],
    response_format: str,
    model: str,
) -> Dict[str, Any]:
    """Combine raw chunk payloads into a structured transcript document."""

    doc_chunks: List[TranscriptChunk] = []
    text_parts: List[str] = []

    for index, payload in enumerate(raw_chunks):
        segment = segments[index] if index < len(segments) else None
        parsed = _parse_chunk_payload(payload, response_format)
        text = _extract_chunk_text(parsed, response_format)
        text_parts.append(text)
        chunk = TranscriptChunk(
            index=index,
            start_sec=segment.start if segment else None,
            end_sec=segment.end if segment else None,
            text=text,
            raw=parsed,
        )
        doc_chunks.append(chunk)

    combined_text = "\n\n".join(part for part in text_parts if part)

    return {
        "model": model,
        "response_format": response_format,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "text": combined_text,
        "segments": [
            {
                "index": chunk.index,
                "start_sec": chunk.start_sec,
                "end_sec": chunk.end_sec,
                "text": chunk.text,
            }
            for chunk in doc_chunks
        ],
        "chunks": [chunk.to_dict() for chunk in doc_chunks],
    }
