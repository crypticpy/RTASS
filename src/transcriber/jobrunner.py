"""Minimal in-memory JobRunner for local async simulation.

This is a thin abstraction to prepare for a future real queue while allowing
the UI to kick off an analysis job and poll status/result.
"""

from __future__ import annotations

import threading
import time
import uuid
from typing import Any, Callable, Dict, Optional


class JobRunner:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create(self, target: Callable[[], Any]) -> str:
        job_id = uuid.uuid4().hex
        with self._lock:
            self._jobs[job_id] = {
                "status": "queued",
                "progress": {"total": 0, "done": 0, "running": 0, "queued": 0, "failed": 0},
                "result": None,
                "error": None,
            }

        def _run():
            self._update(job_id, status="running")
            try:
                result = target()
                self._update(job_id, status="complete", result=result)
            except Exception as exc:  # pragma: no cover
                self._update(job_id, status="failed", error=str(exc))

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
        return job_id

    def _update(self, job_id: str, **fields):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id].update(fields)

    def update_progress(self, job_id: str, progress: Dict[str, int]):
        self._update(job_id, progress=progress)

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return dict(self._jobs.get(job_id) or {})
