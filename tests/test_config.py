"""Test configuration utilities."""

import pytest

from transcriber.config import (effective_output_formats,
                                map_response_format_to_ext,
                                model_allows_srt_vtt)


class TestModelConfig:
    """Test model configuration functions."""

    def test_model_allows_srt_vtt_whisper(self):
        assert model_allows_srt_vtt("whisper-1") is True
        assert model_allows_srt_vtt("Whisper-1") is True
        assert model_allows_srt_vtt("WHISPER-1") is True

    def test_model_allows_srt_vtt_gpt(self):
        assert model_allows_srt_vtt("gpt-4o-transcribe") is False
        assert model_allows_srt_vtt("gpt-4o-mini-transcribe") is False

    def test_effective_output_formats_whisper(self):
        formats = effective_output_formats("whisper-1")
        expected = ("text", "json", "srt", "vtt", "verbose_json")
        assert formats == expected

    def test_effective_output_formats_gpt(self):
        formats = effective_output_formats("gpt-4o-transcribe")
        expected = ("text", "json")
        assert formats == expected

    def test_map_response_format_to_ext(self):
        assert map_response_format_to_ext("text") == "txt"
        assert map_response_format_to_ext("json") == "json"
        assert map_response_format_to_ext("verbose_json") == "json"
        assert map_response_format_to_ext("srt") == "srt"
        assert map_response_format_to_ext("vtt") == "vtt"
        assert map_response_format_to_ext("unknown") == "txt"
