"""Test audio processor functionality."""

from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from transcriber.audio_processor import AudioProcessor
from transcriber.segments import PreparedSegment
from transcriber.constants import MAX_UPLOAD_MB, SAFETY_MB


class TestAudioProcessor:
    """Test audio processor class."""

    def setup_method(self):
        """Set up test fixture."""
        self.processor = AudioProcessor()

    def teardown_method(self):
        """Clean up after tests."""
        self.processor.cleanup()

    @patch("transcriber.audio_processor.AudioSegment.from_file")
    @patch("transcriber.audio_processor.write_uploaded_to_tmp")
    @patch("transcriber.audio_processor.ffmpeg_available")
    def test_prepare_audio_no_ffmpeg_small_file(
        self,
        mock_ffmpeg,
        mock_write_tmp,
        mock_audio_segment,
        mock_uploaded_file,
    ):
        mock_ffmpeg.return_value = False
        mock_path = Mock()
        mock_path.stat.return_value.st_size = 10 * 1024 * 1024  # 10MB
        mock_write_tmp.return_value = mock_path
        dummy_audio = Mock()
        dummy_audio.__len__ = lambda self=dummy_audio: 1000
        mock_audio_segment.return_value = dummy_audio

        segments = self.processor.prepare_audio(
            mock_uploaded_file, reencode=False
        )
        assert len(segments) == 1
        assert segments[0].path == mock_path

    @patch("transcriber.audio_processor.AudioSegment.from_file")
    @patch("transcriber.audio_processor.write_uploaded_to_tmp")
    @patch("transcriber.audio_processor.ffmpeg_available")
    def test_prepare_audio_no_ffmpeg_large_file(
        self,
        mock_ffmpeg,
        mock_write_tmp,
        mock_audio_segment,
        mock_uploaded_file,
    ):
        mock_ffmpeg.return_value = False
        mock_path = Mock()
        mock_path.stat.return_value.st_size = 30 * 1024 * 1024  # 30MB
        mock_write_tmp.return_value = mock_path
        dummy_audio = Mock()
        dummy_audio.__len__ = lambda self=dummy_audio: 3000
        mock_audio_segment.return_value = dummy_audio

        with pytest.raises(RuntimeError, match="File exceeds size cap"):
            self.processor.prepare_audio(mock_uploaded_file, reencode=False)

    @patch("transcriber.audio_processor.split_mp3_under_limit")
    @patch("transcriber.audio_processor.reencode_to_mp3_speech")
    @patch("transcriber.audio_processor.write_uploaded_to_tmp")
    @patch("transcriber.audio_processor.ffmpeg_available", return_value=True)
    def test_prepare_audio_forwards_playback_rate(
        self,
        _mock_ffmpeg,
        mock_write_tmp,
        mock_reencode,
        mock_split,
        mock_uploaded_file,
    ):
        src_path = Mock()
        src_path.stat.return_value.st_size = 10 * 1024 * 1024
        mock_write_tmp.return_value = src_path
        reencoded = Path("/tmp/audio.speech.mp3")
        mock_reencode.return_value = reencoded
        mock_split.return_value = [PreparedSegment(reencoded, 0.0, 10.0)]

        segments = self.processor.prepare_audio(
            mock_uploaded_file,
            reencode=True,
            target_kbps=48,
            cap_mb=20,
            playback_rate=1.5,
            use_silence_splitting=False,
        )

        assert len(segments) == 1
        assert segments[0].path == reencoded
        mock_reencode.assert_called_once_with(
            src_path,
            kbps=48,
            playback_rate=1.5,
        )

    def test_cleanup(self):
        """Test cleanup functionality."""
        mock_path = Mock()
        self.processor.temp_files = [mock_path]

        with patch.object(
            mock_path, "exists", return_value=True
        ), patch.object(mock_path, "unlink") as mock_unlink, patch.object(
            mock_path, "rmdir"
        ) as mock_rmdir:
            self.processor.cleanup()
            mock_unlink.assert_called_once()

    def test_cleanup_ignores_errors(self):
        """Test cleanup ignores errors gracefully."""
        mock_path = Mock()
        mock_path.unlink.side_effect = Exception("Test error")
        self.processor.temp_files = [mock_path]

        # Should not raise exception
        self.processor.cleanup()
