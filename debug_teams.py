#!/usr/bin/env python3
"""Debug script to test Teams MP4 conversion."""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from transcriber.utils import reencode_to_mp3_speech, ffmpeg_available
from transcriber.audio_processor import AudioProcessor

def test_conversion(mp4_path: str):
    """Test conversion of a Teams MP4 file."""
    print(f"Testing conversion of: {mp4_path}")
    print(f"FFmpeg available: {ffmpeg_available()}")
    
    try:
        result_path = reencode_to_mp3_speech(Path(mp4_path))
        print(f"Conversion successful: {result_path}")
        print(f"Output file size: {result_path.stat().st_size / 1024 / 1024:.2f} MB")
        
        # Try to read it back
        from pydub import AudioSegment
        audio = AudioSegment.from_mp3(result_path)
        print(f"Audio duration: {len(audio) / 1000:.1f} seconds")
        print(f"Sample rate: {audio.frame_rate}")
        print(f"Channels: {audio.channels}")
        
        return True
        
    except Exception as e:
        print(f"Conversion failed: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python debug_teams.py <path_to_teams_mp4>")
        sys.exit(1)
    
    test_conversion(sys.argv[1])