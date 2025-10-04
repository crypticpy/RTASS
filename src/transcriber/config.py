"""Configuration and model utilities."""

from typing import Optional, Tuple


def model_allows_srt_vtt(model: str) -> bool:
    """Check if model supports SRT/VTT output formats."""
    return model.strip().lower() == "whisper-1"


def effective_output_formats(model: str) -> Tuple[str, ...]:
    """Get available output formats for the given model."""
    return (
        ("text", "json")
        if not model_allows_srt_vtt(model)
        else ("text", "json", "srt", "vtt", "verbose_json")
    )


def map_response_format_to_ext(response_format: str) -> str:
    """Map response format to file extension."""
    ext_map = {
        "text": "txt",
        "json": "json",
        "verbose_json": "json",
        "srt": "srt",
        "vtt": "vtt",
    }
    return ext_map.get(response_format, "txt")
