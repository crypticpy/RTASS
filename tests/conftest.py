"""Test configuration and fixtures."""

import sys
from pathlib import Path

import pytest

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def mock_uploaded_file():
    """Create a mock uploaded file for testing."""
    from unittest.mock import Mock

    mock_file = Mock()
    mock_file.name = "test_audio.mp3"
    mock_file.read = Mock(return_value=b"fake audio data")
    mock_file.seek = Mock()
    return mock_file


@pytest.fixture
def sample_audio_path(tmp_path):
    """Create a sample audio file path for testing."""
    return tmp_path / "test_audio.mp3"
