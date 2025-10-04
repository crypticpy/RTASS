# Transcriber

A modular Streamlit application for audio transcription using OpenAI's Audio Transcriptions API.

## Features

- Supports multiple audio/video formats (MP3, MP4, M4A, WAV, WEBM, etc.)
- **Optimized for Teams recordings**: Special handling for Microsoft Teams MP4 files
- Automatic re-encoding and chunking to stay within API limits
- Multiple output formats (text, JSON, SRT, VTT)
- Persistent download buttons
- Model selection (GPT-4o-transcribe, GPT-4o-mini-transcribe, Whisper-1)
- Environment variable support for API keys

## Project Structure

```
transcriber/
├── app.py                     # Main entry point
├── requirements.txt           # Dependencies
├── src/
│   └── transcriber/
│       ├── __init__.py
│       ├── app.py            # Streamlit app logic
│       ├── constants.py      # Application constants
│       ├── utils.py          # Utility functions
│       ├── config.py         # Configuration utilities
│       ├── transcription.py  # Core transcription service
│       ├── file_manager.py   # File management
│       ├── audio_processor.py # Audio processing pipeline
│       └── ui.py             # UI components
├── tests/                    # Test suite
└── transcripts/              # Output directory (auto-created)
```

## Installation

1. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

4. Install ffmpeg (required for audio processing):
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Usage

Run the Streamlit app:
```bash
streamlit run app.py
```

1. Set up your OpenAI API key in `.env` file or enter it in the sidebar
2. Upload an audio or video file (Teams MP4 recordings are supported)
3. Select model and output format
4. Click "Transcribe"

### Teams Recordings
The app is optimized for Microsoft Teams MP4 recordings:
- Automatically extracts audio from video
- Handles Teams-specific audio codecs
- Provides detailed error messages if conversion fails

## Development

### Running Tests
```bash
python -m pytest tests/
python -m pytest tests/test_utils.py -v  # Single test file
python -m pytest -k "test_ffmpeg"  # Specific test
```

### Code Quality
```bash
python -m flake8 src/
python -m black src/
python -m mypy src/
```

## Models

- **gpt-4o-transcribe**: Default, supports text/JSON
- **gpt-4o-mini-transcribe**: Faster, supports text/JSON  
- **whisper-1**: Supports all formats including SRT/VTT

## Output Formats

- **text**: Plain text transcript
- **json**: Structured JSON output
- **verbose_json**: Detailed JSON with timestamps
- **srt**: Subtitle format (Whisper-1 only)
- **vtt**: WebVTT subtitle format (Whisper-1 only)