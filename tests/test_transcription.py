"""Tests for transcription service retry logic."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from transcriber.transcription import TranscriptionService


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
