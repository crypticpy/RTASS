#!/usr/bin/env python3
"""Entry point for the Streamlit transcription app."""

import sys
from pathlib import Path

# Add src to path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent / "src"))

from transcriber.app import main

if __name__ == "__main__":
    main()