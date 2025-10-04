"""Compliance scoring utilities for fire radio transcripts."""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple
from collections import deque

from openai import OpenAI

from .policy_ingestion import PolicyTemplate
from .evidence import select_evidence


def _format_ts(value: Optional[float]) -> str:
    if value is None:
        return "--:--"
    seconds = max(0.0, float(value))
    mins, secs = divmod(seconds, 60.0)
    hours, mins = divmod(mins, 60.0)
    return f"{int(hours):02d}:{int(mins):02d}:{secs:05.2f}"


def _build_transcript_digest(
    transcript: Dict[str, Any],
    max_chars: int = 12000,
) -> str:
    segments = transcript.get("segments") or []
    lines: List[str] = []
    used = 0
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        line = f"[{_format_ts(seg.get('start_sec'))}-{_format_ts(seg.get('end_sec'))}] {text}"
        if used + len(line) > max_chars:
            remaining = max_chars - used
            if remaining > 0:
                lines.append(line[:remaining])
            break
        lines.append(line)
        used += len(line) + 1
    if not lines and transcript.get("text"):
        snippet = transcript["text"][:max_chars]
        lines.append(snippet)
    return "\n".join(lines)


@dataclass
class ScoreCriterionResult:
    id: str
    status: str
    rationale: str
    action_items: List[str] = field(default_factory=list)
    score: Optional[float] = None
    weight: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "rationale": self.rationale,
            "action_items": self.action_items,
            "score": self.score,
            "weight": self.weight,
        }


@dataclass
class ScoreCategoryResult:
    name: str
    status: str
    rationale: str
    criteria: List[ScoreCriterionResult] = field(default_factory=list)
    score: Optional[float] = None
    weight: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status,
            "rationale": self.rationale,
            "score": self.score,
            "weight": self.weight,
            "criteria": [criterion.to_dict() for criterion in self.criteria],
        }


@dataclass
class ScorecardResult:
    overall_status: str
    overall_score: Optional[float]
    summary: str
    categories: List[ScoreCategoryResult] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_status": self.overall_status,
            "overall_score": self.overall_score,
            "summary": self.summary,
            "categories": [category.to_dict() for category in self.categories],
            "recommendations": self.recommendations,
            "meta": self.meta,
        }


class ComplianceScorer:
    def __init__(
        self,
        api_key: str,
        model: str,
        max_retries: int = 2,
        retry_sleep: float = 2.0,
        concurrency: int = 1,
    ):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.max_retries = max_retries
        self.retry_sleep = retry_sleep
        self.concurrency = max(1, int(concurrency))

    def evaluate(
        self,
        transcript: Dict[str, Any],
        template: PolicyTemplate,
        additional_notes: Optional[str] = None,
        status_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> ScorecardResult:
        digest = _build_transcript_digest(transcript)
        sections = self._extract_sections(template)

        # Backward-compatible path: if no sections in template, do a single-shot scoring
        if not sections:
            payload = {
                "template": template.schema,
                "transcript_digest": digest,
                "additional_notes": additional_notes or "",
            }
            start = time.time()
            response = self._with_retries(
                lambda: self.client.responses.create(
                    model=self.model,
                    input=[
                        {
                            "role": "system",
                            "content": "You are a compliance auditor for fire department radio communications. Return JSON following the contract.",
                        },
                        {
                            "role": "user",
                            "content": (
                                "Evaluate the transcript digest against the policy template. "
                                "Assign pass/fail/needs_improvement with rationale and actionable feedback. "
                                f"JSON payload: {json.dumps(payload)}"
                            ),
                        },
                    ],
                    response_format=self._score_schema(),
                )
            )
            latency_ms = int((time.time() - start) * 1000)
            raw = json.loads(response.output_text)
            usage = getattr(response, "usage", {}) or {}
            meta = {
                "model": getattr(response, "model", self.model),
                "latency_ms": latency_ms,
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
            }
            return self._map_scorecard(raw, meta)

        # Sectional path with adaptive concurrency and self-recovery
        section_results: List[Dict[str, Any]] = []
        start_total = time.time()

        # Prepare tasks and status
        @dataclass
        class Task:
            index: int
            section: Dict[str, Any]
            attempts: int = 0

        statuses: Dict[int, Dict[str, Any]] = {
            i: {"state": "queued", "attempts": 0} for i in range(len(sections))
        }

        def emit_status():
            if status_callback:
                done = sum(1 for s in statuses.values() if s["state"] == "done")
                failed = sum(1 for s in statuses.values() if s["state"] == "failed")
                running = sum(1 for s in statuses.values() if s["state"] == "running")
                queued = len(sections) - done - failed - running
                status_callback(
                    {
                        "total": len(sections),
                        "done": done,
                        "failed": failed,
                        "running": running,
                        "queued": queued,
                        "concurrency": concurrency,
                    }
                )

        def classify_error(exc: Exception) -> str:
            msg = str(exc).lower()
            if "rate limit" in msg or "429" in msg:
                return "rate_limit"
            if "timeout" in msg or "timed out" in msg:
                return "timeout"
            if "json" in msg and "schema" in msg:
                return "schema"
            return "other"

        # Decide initial concurrency automatically if not set explicitly
        def pick_initial_concurrency(n: int) -> int:
            if self.concurrency and self.concurrency > 0:
                return self.concurrency
            # Moderate defaults: up to 3 parallel sections
            return min(3, max(1, n))

        max_attempts = max(2, self.max_retries + 1)
        concurrency = pick_initial_concurrency(len(sections))
        pending: Deque[Task] = deque(Task(i, sec) for i, sec in enumerate(sections))
        in_flight: Dict[Any, Task] = {}

        from concurrent.futures import ThreadPoolExecutor, as_completed, Future

        def run_one(task: Task) -> Dict[str, Any]:
            payload = {
                "section": task.section,
                "transcript_digest": digest,
                "additional_notes": additional_notes or "",
            }
            # Attach evidence snippets to reduce tokens and guide citations
            evidence = select_evidence(transcript, task.section, k=5)
            if evidence:
                payload["evidence"] = evidence
            t0 = time.time()
            response = self._with_retries(
                lambda: self.client.responses.create(
                    model=self.model,
                    input=[
                        {
                            "role": "system",
                            "content": "You are a meticulous evaluator. Score only this section strictly as JSON.",
                        },
                        {
                            "role": "user",
                            "content": (
                                "Analyze the transcript for the provided section and its criteria. "
                                "Return JSON per schema. "
                                f"Payload: {json.dumps(payload)}"
                            ),
                        },
                    ],
                    response_format=self._section_schema(),
                )
            )
            latency_ms = int((time.time() - t0) * 1000)
            raw = json.loads(response.output_text)
            raw["latency_ms"] = latency_ms
            raw["model"] = getattr(response, "model", self.model)
            return raw

        with ThreadPoolExecutor(max_workers=max(1, concurrency)) as pool:
            emit_status()
            while pending or in_flight:
                # Schedule up to concurrency
                while pending and len(in_flight) < concurrency:
                    task = pending.popleft()
                    statuses[task.index] = {"state": "running", "attempts": task.attempts}
                    fut = pool.submit(run_one, task)
                    in_flight[fut] = task
                emit_status()

                if not in_flight:
                    break

                # Wait for any to complete
                done_futs: List[Future] = []
                for fut in as_completed(list(in_flight.keys()), timeout=5):
                    done_futs.append(fut)
                    # Handle one wave of completions then re-evaluate scheduling
                    break

                if not done_futs:
                    continue

                for fut in done_futs:
                    task = in_flight.pop(fut)
                    try:
                        result = fut.result()
                        section_results.append(result)
                        statuses[task.index] = {"state": "done", "attempts": task.attempts}
                    except Exception as exc:  # pragma: no cover (behavior tested via classification)
                        kind = classify_error(exc)
                        task.attempts += 1
                        statuses[task.index] = {"state": "retrying", "attempts": task.attempts, "error": kind}
                        # Adaptive concurrency on rate limit: back off by 1, not below 1
                        if kind == "rate_limit" and concurrency > 1:
                            concurrency -= 1
                        # Re-enqueue or give up
                        if task.attempts < max_attempts:
                            # Mild backoff
                            time.sleep(min(2.0 * task.attempts, 5.0))
                            pending.appendleft(task)
                        else:
                            # Final failure: produce neutral payload to keep aggregation stable
                            neutral = {
                                "section": {
                                    "name": task.section.get("name", f"Section {task.index+1}"),
                                    "weight": task.section.get("weight"),
                                    "criteria": task.section.get("criteria") or [],
                                },
                                "criteria": [],
                                "sectionScore": None,
                                "sectionMax": None,
                                "findings": [],
                                "suggestedImprovements": ["Automatic fallback due to repeated errors"],
                            }
                            section_results.append(neutral)
                            statuses[task.index] = {"state": "failed", "attempts": task.attempts, "error": kind}
                emit_status()

        # Aggregate
        aggregated = self._aggregate_sections(section_results)
        meta = {
            "model": self.model,
            "latency_ms": int((time.time() - start_total) * 1000),
        }
        return self._map_scorecard(aggregated, meta)

    def _with_retries(self, fn: Callable[[], Any]) -> Any:
        last_exc: Optional[Exception] = None
        for attempt in range(self.max_retries + 1):
            try:
                return fn()
            except Exception as exc:  # pragma: no cover
                last_exc = exc
                if attempt == self.max_retries:
                    break
                time.sleep(self.retry_sleep * (attempt + 1))
        raise RuntimeError("Compliance scoring failed") from last_exc

    @staticmethod
    def _score_schema() -> Dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "fire_radio_scorecard",
                "schema": {
                    "type": "object",
                    "properties": {
                        "overall_status": {"type": "string"},
                        "overall_score": {"type": ["number", "null"]},
                        "summary": {"type": "string"},
                        "categories": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "status": {"type": "string"},
                                    "score": {"type": ["number", "null"]},
                                    "weight": {"type": ["number", "null"]},
                                    "rationale": {"type": "string"},
                                    "criteria": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "id": {"type": "string"},
                                                "status": {"type": "string"},
                                                "score": {"type": ["number", "null"]},
                                                "weight": {"type": ["number", "null"]},
                                                "rationale": {"type": "string"},
                                                "action_items": {
                                                    "type": "array",
                                                    "items": {"type": "string"},
                                                },
                                            },
                                            "required": ["id", "status", "rationale"],
                                        },
                                    },
                                },
                                "required": ["name", "status", "rationale", "criteria"],
                            },
                        },
                        "recommendations": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["overall_status", "summary", "categories"],
                },
            },
        }

    @staticmethod
    def _section_schema() -> Dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {
                "name": "section_score",
                "schema": {
                    "type": "object",
                    "properties": {
                        "section": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "weight": {"type": ["number", "null"]},
                                "criteria": {"type": "array"},
                            },
                            "required": ["name"],
                        },
                        "criteria": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "status": {"type": "string"},
                                    "score": {"type": ["number", "null"]},
                                    "weight": {"type": ["number", "null"]},
                                    "rationale": {"type": "string"},
                                    "action_items": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": ["id", "status", "rationale"],
                            },
                        },
                        "sectionScore": {"type": ["number", "null"]},
                        "sectionMax": {"type": ["number", "null"]},
                        "findings": {"type": "array", "items": {"type": "object"}},
                        "suggestedImprovements": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["section", "criteria"],
                },
            },
        }

    @staticmethod
    def _extract_sections(template: PolicyTemplate) -> List[Dict[str, Any]]:
        cats = template.schema.get("categories") or []
        out = []
        for c in cats:
            out.append({
                "name": c.get("name", "Unnamed"),
                "weight": c.get("weight"),
                "criteria": c.get("criteria") or [],
            })
        return out

    @staticmethod
    def _aggregate_sections(section_payloads: List[Dict[str, Any]]) -> Dict[str, Any]:
        categories = []
        total = 0.0
        total_weight = 0.0
        for sec in section_payloads:
            sec_meta = sec.get("section", {})
            criteria_payload = sec.get("criteria") or []
            weight = sec_meta.get("weight") or 1.0
            score = sec.get("sectionScore")

            criteria = [
                {
                    "id": str(crit.get("id", "")),
                    "status": str(crit.get("status", "unknown")),
                    "rationale": str(crit.get("rationale", "")),
                    "action_items": list(crit.get("action_items") or []),
                    "score": crit.get("score"),
                    "weight": crit.get("weight"),
                }
                for crit in criteria_payload
            ]

            categories.append(
                {
                    "name": str(sec_meta.get("name", "")),
                    "status": "pass" if (score or 0) >= 0 else "unknown",
                    "rationale": "",
                    "criteria": criteria,
                    "score": score,
                    "weight": weight,
                }
            )
            if score is not None:
                total += float(score) * float(weight)
                total_weight += float(weight)

        overall_score = (total / total_weight) if total_weight > 0 else None
        return {
            "overall_status": "pass" if (overall_score or 0) > 0 else "unknown",
            "overall_score": overall_score,
            "summary": "Aggregated from sectional analysis.",
            "categories": categories,
            "recommendations": [],
        }

    def _map_scorecard(
        self,
        data: Dict[str, Any],
        meta: Dict[str, Any],
    ) -> ScorecardResult:
        categories_payload = data.get("categories") or []
        categories: List[ScoreCategoryResult] = []
        for item in categories_payload:
            criteria_payload = item.get("criteria") or []
            criteria = [
                ScoreCriterionResult(
                    id=str(crit.get("id", "")),
                    status=str(crit.get("status", "unknown")),
                    rationale=str(crit.get("rationale", "")),
                    action_items=list(crit.get("action_items") or []),
                    score=crit.get("score"),
                    weight=crit.get("weight"),
                )
                for crit in criteria_payload
            ]
            categories.append(
                ScoreCategoryResult(
                    name=str(item.get("name", "")),
                    status=str(item.get("status", "unknown")),
                    rationale=str(item.get("rationale", "")),
                    criteria=criteria,
                    score=item.get("score"),
                    weight=item.get("weight"),
                )
            )

        return ScorecardResult(
            overall_status=str(data.get("overall_status", "unknown")),
            overall_score=data.get("overall_score"),
            summary=str(data.get("summary", "")),
            categories=categories,
            recommendations=list(data.get("recommendations") or []),
            meta=meta,
        )
