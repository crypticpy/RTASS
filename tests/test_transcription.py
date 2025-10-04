"""Tests for transcription service functionality."""

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from transcriber.transcription import TranscriptionService
from transcriber.segments import PreparedSegment


class DummyAudio:
    """Minimal stand-in for pydub.AudioSegment."""

    def __len__(self):
        return 1000

    def set_frame_rate(self, _):
        return self

    def set_channels(self, _):
        return self

    def normalize(self):
        return self

    def __add__(self, _):
        return self

    def export(self, path, format="wav", **_):
        Path(path).write_bytes(b"audio-data")
        return path


@patch("transcriber.transcription.OpenAI")
def test_transcribe_segment_retries_with_wav(mock_openai, tmp_path):
    src = tmp_path / "segment.mp3"
    src.write_bytes(b"mp3")

    mock_client = MagicMock()
    mock_openai.return_value = mock_client

    invoked_files = []

    def create_side_effect(**kwargs):
        file_obj = kwargs["file"]
        invoked_files.append(Path(file_obj.name))
        if len(invoked_files) == 1:
            raise Exception("400 Bad Request: corrupted or unsupported audio format")
        return SimpleNamespace(text="ok")

    mock_client.audio.transcriptions.create.side_effect = create_side_effect

    # Patch AudioSegment usage inside module
    with patch("pydub.AudioSegment.from_file", return_value=DummyAudio()):
        service = TranscriptionService(api_key="sk-test")
        result = service.transcribe_segment(
            model="gpt-4o-transcribe",
            fpath=src,
            response_format="text",
            language="en",
        )

    assert result == "ok"
    assert invoked_files[0].suffix == ".mp3"
    assert invoked_files[1].suffix == ".wav"
    # Ensure fallback file cleaned up
    assert not (src.with_suffix(".fallback.wav")).exists()


@patch.object(TranscriptionService, "transcribe_segment")
@patch("transcriber.transcription.OpenAI")
def test_transcribe_segments_comparison(mock_openai, mock_transcribe, tmp_path):
    mock_client = MagicMock()
    mock_openai.return_value = mock_client

    seg1 = tmp_path / "seg1.mp3"
    seg2 = tmp_path / "seg2.mp3"
    seg1.write_bytes(b"a")
    seg2.write_bytes(b"b")

    service = TranscriptionService(api_key="sk-test")

    whisper_payload = {
        "text": "chunk whisper",
        "segments": [
            {"start": 0.0, "end": 1.0, "text": "Hello"},
        ],
    }
    whisper_payload_2 = {
        "text": "chunk whisper 2",
        "segments": [
            {"start": 0.5, "end": 2.0, "text": "World"},
        ],
    }

    mock_transcribe.side_effect = [
        json.dumps(whisper_payload),
        "chunk one mini",
        json.dumps(whisper_payload_2),
        "chunk two mini",
    ]

    segments = [
        PreparedSegment(seg1, 0.0, 600.0),
        PreparedSegment(seg2, 600.0, 1200.0),
    ]

    result = service.transcribe_segments_comparison(segments, language="en")

    assert len(result["chunks"]) == 2
    assert "whisper-1" in result["chunks"][0]
    assert "gpt-4o-mini-transcribe" in result["chunks"][0]
    assert "chunk one mini" in result["final"]["text_concat"]
    assert "chunk two mini" in result["final"]["text_concat"]

    final_segments = result["final"]["segments"]
    assert final_segments[0]["start_sec"] == pytest.approx(0.0)
    assert final_segments[1]["start_sec"] == pytest.approx(600.5)

    calls = mock_transcribe.call_args_list
    assert calls[0].kwargs["model"] == "whisper-1"
    assert calls[1].kwargs["model"].startswith("gpt-4o")
