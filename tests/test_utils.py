"""Test utility functions."""

from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from transcriber.utils import (bytes_per_ms, ffmpeg_available,
                               reencode_to_mp3_speech, split_mp3_under_limit,
                               stable_filename, write_uploaded_to_tmp)


class TestFFmpegAvailable:
    """Test ffmpeg availability checking."""

    @patch("transcriber.utils.shutil.which")
    def test_ffmpeg_available_true(self, mock_which):
        mock_which.return_value = "/usr/bin/ffmpeg"
        assert ffmpeg_available() is True

    @patch("transcriber.utils.shutil.which")
    def test_ffmpeg_available_false(self, mock_which):
        mock_which.return_value = None
        assert ffmpeg_available() is False


class TestStableFilename:
    """Test stable filename generation."""

    @patch("transcriber.utils.time.time")
    def test_stable_filename(self, mock_time):
        mock_time.return_value = 1234567890
        result = stable_filename("test", "whisper-1", "txt")
        expected = "test.whisper-1.1234567890.txt"
        assert result == expected


class TestBytesPerMs:
    """Test bytes per millisecond calculation."""

    def test_bytes_per_ms_normal(self, tmp_path):
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"x" * 1000)  # 1KB file
        result = bytes_per_ms(test_file, 1000)  # 1 second
        assert result == 1.0

    def test_bytes_per_ms_zero_duration(self, tmp_path):
        test_file = tmp_path / "test.txt"
        test_file.write_bytes(b"x" * 1000)
        result = bytes_per_ms(test_file, 0)
        assert result == 1000.0


class DummyAudio:
    """Simple stand-in for pydub.AudioSegment in tests."""

    def __init__(
        self,
        *,
        frame_rate: int = 16000,
        channels: int = 1,
        length: int = 1000,
        export_hook=None,
    ):
        self.frame_rate = frame_rate
        self.channels = channels
        self._length = length
        self._export_hook = export_hook

    def __len__(self):
        return self._length

    def set_frame_rate(self, value: int):
        self.frame_rate = value
        return self

    def set_channels(self, value: int):
        self.channels = value
        return self

    def normalize(self):
        return self

    def __add__(self, _gain):
        return self

    def export(self, path, format="mp3", bitrate="32k", codec="libmp3lame"):
        dest = Path(path)
        if self._export_hook:
            self._export_hook(dest)
        else:
            dest.write_bytes(b"0" * 2048)
        return path

    def _spawn(self, raw_data, overrides=None):
        overrides = overrides or {}
        new = DummyAudio(
            frame_rate=overrides.get("frame_rate", self.frame_rate),
            channels=self.channels,
            length=self._length,
            export_hook=self._export_hook,
        )
        return new


class TestReencodeToMp3Speech:
    """Tests for MP3 re-encoding helper."""

    def test_uses_expected_ffmpeg_flags(self, tmp_path):
        src = tmp_path / "sample.webm"
        src.write_bytes(b"input-bytes")

        commands = []

        def fake_run(cmd, check, capture_output, text):
            commands.append(cmd)
            Path(cmd[-1]).write_bytes(b"1" * 2048)

            class Result:
                stderr = ""

            return Result()

        def fake_from_file(_path):
            return DummyAudio()

        with patch("transcriber.utils.subprocess.run", side_effect=fake_run) as mock_run, patch(
            "transcriber.utils.AudioSegment.from_file",
            side_effect=fake_from_file,
        ):
            out = reencode_to_mp3_speech(src, kbps=48, sr=12000)

        assert out.exists()
        cmd = commands[0]
        assert cmd[:4] == ["ffmpeg", "-y", "-i", str(src)]
        assert "-vn" in cmd
        assert "-sn" in cmd
        assert "-dn" in cmd
        assert "-map" in cmd and "0:a:0" in cmd
        assert ["-c:a", "libmp3lame"] in [cmd[i : i + 2] for i in range(len(cmd) - 1)]
        assert ["-ar", "12000"] in [cmd[i : i + 2] for i in range(len(cmd) - 1)]
        assert ["-ac", "1"] in [cmd[i : i + 2] for i in range(len(cmd) - 1)]
        assert ["-b:a", "48k"] in [cmd[i : i + 2] for i in range(len(cmd) - 1)]
        assert ["-map_metadata", "-1"] in [
            cmd[i : i + 2] for i in range(len(cmd) - 1)
        ]
        assert ["-write_xing", "0"] in [
            cmd[i : i + 2] for i in range(len(cmd) - 1)
        ]
        assert "-af" in cmd and "highpass=80,lowpass=8000,volume=1.5" in cmd
        assert ["-f", "mp3"] in [cmd[i : i + 2] for i in range(len(cmd) - 1)]
        mock_run.assert_called()

    def test_fallback_triggered_on_invalid_ffmpeg_output(self, tmp_path):
        src = tmp_path / "input.wav"
        src.write_bytes(b"input-bytes")

        export_calls = []

        def fake_run(cmd, check, capture_output, text):
            Path(cmd[-1]).write_bytes(b"0" * 2048)

            class Result:
                stderr = "ffmpeg decode warning"

            return Result()

        call_counter = {"count": 0}

        def record_export(dest):
            export_calls.append(dest)
            dest.write_bytes(b"1" * 2048)

        def fake_from_file(path):
            call_counter["count"] += 1
            if call_counter["count"] == 1:
                raise ValueError("decode error")
            if call_counter["count"] == 2:
                return DummyAudio(
                    frame_rate=44100,
                    channels=2,
                    export_hook=record_export,
                )
            return DummyAudio()

        with patch("transcriber.utils.subprocess.run", side_effect=fake_run), patch(
            "transcriber.utils.AudioSegment.from_file",
            side_effect=fake_from_file,
        ):
            out = reencode_to_mp3_speech(src)

        assert out.exists()
        assert export_calls, "Fallback export should be invoked"

    def test_applies_atempo_when_speed_changed(self, tmp_path):
        src = tmp_path / "clip.mp4"
        src.write_bytes(b"bytes")

        commands = []

        def fake_run(cmd, check, capture_output, text):
            commands.append(cmd)
            Path(cmd[-1]).write_bytes(b"1" * 2048)

            class Result:
                stderr = ""

            return Result()

        with patch("transcriber.utils.subprocess.run", side_effect=fake_run), patch(
            "transcriber.utils.AudioSegment.from_file",
            return_value=DummyAudio(),
        ):
            reencode_to_mp3_speech(src, playback_rate=1.5)

        cmd = commands[0]
        af_value = cmd[cmd.index("-af") + 1]
        assert "atempo=" in af_value
        assert "1.50000" in af_value
