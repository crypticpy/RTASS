"""Tests for PII redaction utility."""

from transcriber.redaction import redact_text, redact_transcript_document


def test_redact_text_phone_and_email():
    text = "Call me at (555) 123-4567 or email test.user+qa@example.org"
    out = redact_text(text)
    assert "[REDACTED_PHONE]" in out
    assert "[REDACTED_EMAIL]" in out


def test_redact_transcript_document_segments():
    doc = {
        "text": "Contact 555-111-2222",
        "segments": [
            {"start_sec": 0.0, "end_sec": 1.0, "text": "email me: a@b.com"},
            {"start_sec": 1.0, "end_sec": 2.0, "text": "no pii here"},
        ],
    }
    out = redact_transcript_document(doc)
    assert "[REDACTED_PHONE]" in out["text"]
    assert "[REDACTED_EMAIL]" in out["segments"][0]["text"]