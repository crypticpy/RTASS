"""Optional PII redaction utilities for transcripts."""

from __future__ import annotations

import re
from typing import Dict, List


PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}\b")
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
NAME_RE = re.compile(r"\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,}){0,2}\b")


def redact_text(text: str) -> str:
    text = PHONE_RE.sub("[REDACTED_PHONE]", text)
    text = EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    return text


def redact_transcript_document(doc: Dict) -> Dict:
    doc = dict(doc)
    if "text" in doc and isinstance(doc["text"], str):
        doc["text"] = redact_text(doc["text"])  # names optional; avoid aggressive masking by default
    segments = doc.get("segments") or []
    new_segments: List[Dict] = []
    for seg in segments:
        seg = dict(seg)
        if isinstance(seg.get("text"), str):
            seg["text"] = redact_text(seg["text"])
        new_segments.append(seg)
    doc["segments"] = new_segments
    return doc
