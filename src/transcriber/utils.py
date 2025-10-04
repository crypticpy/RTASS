"""Utility functions for audio processing and file management."""

import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import List

from pydub import AudioSegment

from .constants import DEFAULT_SR, SAFETY_MB, TARGET_MP3_KBPS


def ffmpeg_available() -> bool:
    """Check if ffmpeg or avconv is available on the system."""
    return (
        shutil.which("ffmpeg") is not None
        or shutil.which("avconv") is not None
    )


def write_uploaded_to_tmp(uploaded_file) -> Path:
    """Write uploaded file to temporary directory and return path."""
    tmp_dir = Path(tempfile.mkdtemp(prefix="st_transcribe_"))
    dst = tmp_dir / uploaded_file.name
    with open(dst, "wb") as f:
        f.write(uploaded_file.read())
    return dst


def _build_atempo_filters(playback_rate: float) -> str:
    """Generate ffmpeg atempo filter chain to achieve playback_rate."""
    if playback_rate <= 0:
        raise ValueError("Playback rate must be positive")

    filters = []
    remaining = playback_rate

    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5

    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0

    if abs(remaining - 1.0) > 1e-6:
        remaining = max(0.5, min(2.0, remaining))
        filters.append(f"atempo={remaining:.5f}")

    return ",".join(filters)


def reencode_to_mp3_speech(
    src_path: Path,
    kbps: int = TARGET_MP3_KBPS,
    sr: int = DEFAULT_SR,
    playback_rate: float = 1.0,
) -> Path:
    """
    Convert input media (video or audio) to mono MP3 with fixed kbps and
    sample rate. Requires ffmpeg via pydub.
    """
    out_path = src_path.with_suffix(".speech.mp3")
    
    def _export_with_pydub(error_message: str):
        try:
            audio = AudioSegment.from_file(src_path)
            audio = audio.set_channels(1).set_frame_rate(sr)
            if playback_rate != 1.0:
                new_frame_rate = max(1, int(audio.frame_rate * playback_rate))
                audio = audio._spawn(
                    audio.raw_data,
                    overrides={"frame_rate": new_frame_rate},
                ).set_frame_rate(sr)
            audio = audio.normalize()
            audio = audio + 6
            audio.export(
                out_path,
                format="mp3",
                bitrate=f"{kbps}k",
                codec="libmp3lame",
            )
            if not out_path.exists() or out_path.stat().st_size == 0:
                raise RuntimeError(f"Failed to create audio file: {out_path}")
            final_audio = AudioSegment.from_file(out_path)
            if len(final_audio) <= 0:
                raise RuntimeError(
                    f"Generated MP3 has no duration after fallback: {out_path}"
                )
            if out_path.stat().st_size < 1024:
                raise RuntimeError(
                    f"Generated MP3 seems too small after fallback: {out_path}"
                )
            return out_path
        except Exception as fallback_error:
            raise RuntimeError(
                "Both ffmpeg and pydub conversion failed. "
                f"FFmpeg error: {error_message}. "
                f"Fallback error: {fallback_error}"
            )

    try:
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(src_path),
            "-vn",
            "-sn",
            "-dn",
            "-map",
            "0:a:0",
            "-c:a",
            "libmp3lame",
            "-ar",
            str(sr),
            "-ac",
            "1",
            "-b:a",
            f"{kbps}k",
            "-af",
            "highpass=80,lowpass=8000,volume=1.5",
            "-f",
            "mp3",
            "-map_metadata",
            "-1",
            "-write_xing",
            "0",
            str(out_path),
        ]

        if playback_rate != 1.0:
            atempo_filters = _build_atempo_filters(playback_rate)
            base_filter = "highpass=80,lowpass=8000,volume=1.5"
            cmd_index = cmd.index("-af") + 1
            if atempo_filters:
                cmd[cmd_index] = f"{base_filter},{atempo_filters}"

        subprocess.run(cmd, check=True, capture_output=True, text=True)

        if not out_path.exists() or out_path.stat().st_size == 0:
            raise RuntimeError(f"Failed to create audio file: {out_path}")

        try:
            audio = AudioSegment.from_file(out_path)
        except Exception as decode_error:
            raise decode_error

        if len(audio) <= 0:
            raise RuntimeError(f"Generated MP3 has no duration: {out_path}")

        needs_reencode = False
        if audio.frame_rate != sr:
            audio = audio.set_frame_rate(sr)
            needs_reencode = True
        if audio.channels != 1:
            audio = audio.set_channels(1)
            needs_reencode = True

        if needs_reencode:
            audio = audio.normalize()
            audio = audio + 6
            audio.export(
                out_path,
                format="mp3",
                bitrate=f"{kbps}k",
                codec="libmp3lame",
            )
            if not out_path.exists() or out_path.stat().st_size == 0:
                raise RuntimeError(f"Failed to create audio file: {out_path}")

        if out_path.stat().st_size < 1024:
            raise RuntimeError(f"Generated MP3 seems too small: {out_path}")

        return out_path

    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        error_message = e.stderr if isinstance(e, subprocess.CalledProcessError) and e.stderr else str(e)
        return _export_with_pydub(error_message)
    except Exception as conversion_error:
        error_message = str(conversion_error)
        return _export_with_pydub(error_message)


def bytes_per_ms(file_path: Path, duration_ms: int) -> float:
    """Calculate bytes per millisecond for a file."""
    size = file_path.stat().st_size
    return size / max(duration_ms, 1)


def split_mp3_under_limit(
    mp3_path: Path, target_mb: float = SAFETY_MB
) -> List[Path]:
    """
    Split the MP3 into segments such that each exported segment stays under
    target_mb. Uses the observed bytes/ms ratio of the initial full file to
    choose cut points.
    """
    full_audio = AudioSegment.from_file(mp3_path)
    dur_ms = len(full_audio)
    b_per_ms = bytes_per_ms(mp3_path, dur_ms)

    max_bytes = target_mb * (1024**2)
    max_ms = int(max_bytes / max(b_per_ms, 1e-6))

    if mp3_path.stat().st_size <= max_bytes:
        return [mp3_path]

    segments = []
    start = 0
    idx = 1
    while start < dur_ms:
        end = min(start + max_ms, dur_ms)
        chunk = full_audio[start:end]
        seg_path = mp3_path.with_name(f"{mp3_path.stem}_part_{idx:02d}.mp3")
        chunk.export(seg_path, format="mp3", bitrate=f"{TARGET_MP3_KBPS}k")
        segments.append(seg_path)
        start = end
        idx += 1
    return segments


def stable_filename(base: str, model: str, ext: str) -> str:
    """Generate stable filename with timestamp."""
    ts = int(time.time())
    return f"{base}.{model}.{ts}.{ext}"
