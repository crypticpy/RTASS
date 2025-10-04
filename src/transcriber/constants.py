"""Constants for the transcription application."""

SUPPORTED_EXTS = ("mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm")
MAX_UPLOAD_MB = 25
TARGET_MP3_KBPS = 32
SAFETY_MB = 23.0
DEFAULT_SR = 16000
DEFAULT_MODEL = "gpt-4o-transcribe"
TARGET_CHUNK_SECONDS = 600
MAX_CHUNK_EXTENSION_SECONDS = 240
SILENCE_THRESHOLD_DB = -30.0
MIN_SILENCE_DURATION = 0.6
