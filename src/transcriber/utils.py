"""Utility functions for audio processing and file management."""

import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, List

from pydub import AudioSegment

from .constants import (DEFAULT_SR, MAX_CHUNK_EXTENSION_SECONDS,
                        MIN_SILENCE_DURATION, SAFETY_MB,
                        SILENCE_THRESHOLD_DB, TARGET_CHUNK_SECONDS,
                        TARGET_MP3_KBPS)
from .segments import PreparedSegment


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
) -> List[PreparedSegment]:
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
        return [PreparedSegment(mp3_path, 0.0, dur_ms / 1000)]

    segments: List[PreparedSegment] = []
    start = 0
    idx = 1
    while start < dur_ms:
        end = min(start + max_ms, dur_ms)
        chunk = full_audio[start:end]
        seg_path = mp3_path.with_name(f"{mp3_path.stem}_part_{idx:02d}.mp3")
        chunk.export(seg_path, format="mp3", bitrate=f"{TARGET_MP3_KBPS}k")
        segments.append(PreparedSegment(seg_path, start / 1000, end / 1000))
        start = end
        idx += 1
    return segments


def stable_filename(base: str, model: str, ext: str) -> str:
    """Generate stable filename with timestamp."""
    ts = int(time.time())
    return f"{base}.{model}.{ts}.{ext}"


def detect_silence_markers(
    audio_path: Path,
    noise_db: float = SILENCE_THRESHOLD_DB,
    min_silence: float = MIN_SILENCE_DURATION,
) -> Dict[str, List[float]]:
    """Detect silence start/end markers using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-i",
        str(audio_path),
        "-af",
        f"silencedetect=noise={noise_db}dB:d={min_silence}",
        "-f",
        "null",
        "-",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Silence detection failed for {audio_path}: {result.stderr}"
        )

    markers: Dict[str, List[float]] = {"start": [], "end": []}
    for line in result.stderr.splitlines():
        line = line.strip()
        if "silence_start" in line:
            try:
                value = float(line.split("silence_start:")[1].strip())
                markers["start"].append(value)
            except (ValueError, IndexError):
                continue
        elif "silence_end" in line:
            try:
                segment = line.split("silence_end:")[1]
                value = float(segment.split("|")[0].strip())
                markers["end"].append(value)
            except (ValueError, IndexError):
                continue

    markers["start"].sort()
    markers["end"].sort()
    return markers


def _select_boundary(
    target: float,
    last_boundary: float,
    markers: Dict[str, List[float]],
    max_extension: float,
) -> float:
    candidates = []
    window_end = target + max_extension

    for value in markers.get("end", []):
        if target <= value <= window_end and value - last_boundary >= 1.0:
            candidates.append((abs(value - target), 0, value))

    for value in markers.get("start", []):
        if target <= value <= window_end and value - last_boundary >= 1.0:
            candidates.append((abs(value - target), 1, value))

    if not candidates:
        return max(target, last_boundary + 1.0)

    candidates.sort()
    return candidates[0][2]


def compute_silence_boundaries(
    duration: float,
    markers: Dict[str, List[float]],
    target_seconds: float = TARGET_CHUNK_SECONDS,
    max_extension: float = MAX_CHUNK_EXTENSION_SECONDS,
) -> List[float]:
    """Compute boundary times snapped to detected silence."""
    if duration <= 0:
        return [0.0]

    boundaries: List[float] = []
    last_boundary = 0.0
    target = target_seconds

    while target < duration - 1.0:
        boundary = _select_boundary(target, last_boundary, markers, max_extension)
        boundary = min(boundary, duration)

        if boundary >= duration - 1.0:
            break

        if boundary - last_boundary < 1.0:
            boundary = min(duration, last_boundary + max(1.0, target_seconds / 4))
            if boundary >= duration - 1.0:
                break

        boundaries.append(boundary)
        last_boundary = boundary
        target = boundary + target_seconds

    boundaries.append(duration)
    return boundaries


def _format_timestamp(seconds: float) -> str:
    secs = max(0.0, seconds)
    hours = int(secs // 3600)
    mins = int((secs % 3600) // 60)
    rem = secs - hours * 3600 - mins * 60
    return f"{hours:02d}:{mins:02d}:{rem:06.3f}"


def split_mp3_by_silence(
    mp3_path: Path,
    target_seconds: float = TARGET_CHUNK_SECONDS,
    max_extension: float = MAX_CHUNK_EXTENSION_SECONDS,
    noise_db: float = SILENCE_THRESHOLD_DB,
    min_silence: float = MIN_SILENCE_DURATION,
    kbps: int = TARGET_MP3_KBPS,
    sr: int = DEFAULT_SR,
) -> List[PreparedSegment]:
    """Split MP3 into segments aligned to silence markers."""
    audio = AudioSegment.from_file(mp3_path)
    duration = len(audio) / 1000

    markers = detect_silence_markers(mp3_path, noise_db=noise_db, min_silence=min_silence)
    boundaries = compute_silence_boundaries(
        duration,
        markers,
        target_seconds=target_seconds,
        max_extension=max_extension,
    )

    if len(boundaries) <= 1:
        return [PreparedSegment(mp3_path, 0.0, duration)]

    cuts = [0.0] + boundaries
    segments: List[PreparedSegment] = []

    for idx in range(len(cuts) - 1):
        start = cuts[idx]
        end = cuts[idx + 1]
        if end - start <= 0.5:
            continue

        seg_path = mp3_path.with_name(
            f"{mp3_path.stem}_chunk_{idx + 1:03d}{mp3_path.suffix}"
        )

        cmd = [
            "ffmpeg",
            "-i",
            str(mp3_path),
            "-ss",
            _format_timestamp(start),
            "-to",
            _format_timestamp(end),
            "-ac",
            "1",
            "-ar",
            str(sr),
            "-c:a",
            "libmp3lame",
            "-b:a",
            f"{kbps}k",
            "-af",
            "highpass=80,lowpass=8000,volume=1.5",
            "-map_metadata",
            "-1",
            "-y",
            str(seg_path),
        ]

        chunk_audio = audio[int(start * 1000) : int(end * 1000)]
        chunk_audio = chunk_audio.set_channels(1).set_frame_rate(sr)

        try:
            subprocess.run(cmd, check=True, capture_output=True, text=True)
            if not seg_path.exists() or seg_path.stat().st_size == 0:
                raise subprocess.CalledProcessError(1, cmd, "empty output")
        except subprocess.CalledProcessError:
            chunk_audio.export(
                seg_path,
                format="mp3",
                bitrate=f"{kbps}k",
                codec="libmp3lame",
            )
            if not seg_path.exists() or seg_path.stat().st_size == 0:
                raise RuntimeError(
                    f"Fallback export failed for segment {seg_path.name}"
                )
        segments.append(PreparedSegment(seg_path, start, end))

    if not segments:
        return [PreparedSegment(mp3_path, 0.0, duration)]

    return segments
