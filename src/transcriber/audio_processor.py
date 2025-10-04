"""Audio processing pipeline."""

from pathlib import Path
from typing import List

from pydub import AudioSegment

from .constants import (MAX_CHUNK_EXTENSION_SECONDS, MAX_UPLOAD_MB,
                        MIN_SILENCE_DURATION, SAFETY_MB,
                        SILENCE_THRESHOLD_DB, TARGET_CHUNK_SECONDS)
from .segments import PreparedSegment
from .utils import (ffmpeg_available, reencode_to_mp3_speech,
                    split_mp3_by_silence, split_mp3_under_limit,
                    write_uploaded_to_tmp)


class AudioProcessor:
    """Handles audio preparation and segmentation."""

    def __init__(self):
        self.temp_files: List[Path] = []

    def prepare_audio(
        self,
        uploaded_file,
        reencode: bool = True,
        target_kbps: int = 32,
        cap_mb: float = SAFETY_MB,
        playback_rate: float = 1.0,
        use_silence_splitting: bool = True,
        target_chunk_seconds: float = TARGET_CHUNK_SECONDS,
        max_extension_seconds: float = MAX_CHUNK_EXTENSION_SECONDS,
        silence_threshold_db: float = SILENCE_THRESHOLD_DB,
        min_silence_duration: float = MIN_SILENCE_DURATION,
    ) -> List[PreparedSegment]:
        """
        Prepare uploaded audio file for transcription.
        Returns list of audio segment paths.
        """
        src_path = write_uploaded_to_tmp(uploaded_file)
        self.temp_files.append(src_path)

        segments: List[PreparedSegment] = []

        if reencode:
            if not ffmpeg_available():
                if src_path.stat().st_size <= (MAX_UPLOAD_MB * 1024**2):
                    return [src_path]
                else:
                    raise RuntimeError(
                        "ffmpeg not found and file exceeds upload cap. "
                        "Install ffmpeg or upload a smaller file."
                    )

            mp3_path = reencode_to_mp3_speech(
                src_path, kbps=target_kbps, playback_rate=playback_rate
            )
            self.temp_files.append(mp3_path)

            if use_silence_splitting:
                segments = split_mp3_by_silence(
                    mp3_path,
                    target_seconds=target_chunk_seconds,
                    max_extension=max_extension_seconds,
                    noise_db=silence_threshold_db,
                    min_silence=min_silence_duration,
                )
            else:
                segments = split_mp3_under_limit(mp3_path, target_mb=cap_mb)

            for segment in segments:
                if segment.path != mp3_path:
                    self.temp_files.append(segment.path)
        else:
            if src_path.stat().st_size > (SAFETY_MB * 1024**2):
                raise RuntimeError(
                    "File exceeds size cap and re-encoding is disabled. "
                    "Enable re-encoding or upload a smaller file."
                )
            audio = AudioSegment.from_file(src_path)
            duration = len(audio) / 1000
            segments = [PreparedSegment(src_path, 0.0, duration)]

        return segments

    def cleanup(self):
        """Clean up temporary files."""
        for temp_file in self.temp_files:
            try:
                if temp_file.exists():
                    temp_file.unlink()
                # Also clean up parent directory if empty
                parent = temp_file.parent
                if parent.exists() and parent.name.startswith(
                    "st_transcribe_"
                ):
                    parent.rmdir()
            except Exception:
                pass  # Ignore cleanup errors
        self.temp_files.clear()

    def __del__(self):
        """Cleanup on deletion."""
        self.cleanup()
