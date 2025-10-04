"""Data structures for audio segments."""

from dataclasses import dataclass
from pathlib import Path


@dataclass
class PreparedSegment:
    """Represents an extracted audio segment with timing metadata."""

    path: Path
    start: float  # seconds
    end: float  # seconds

    @property
    def duration(self) -> float:
        """Duration of the segment in seconds."""
        return max(0.0, self.end - self.start)
