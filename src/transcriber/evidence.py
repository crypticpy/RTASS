"""Evidence selection utilities for transcript segments.

Select top-K transcript segments relevant to a section (and its criteria)
using simple keyword scoring. Designed to be lightweight and avoid extra deps.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

STOPWORDS = {
    "the","and","a","an","to","of","in","on","for","by","with","is","are","was","were","be","as","at","from",
    "this","that","it","or","if","not","no","yes","do","did","does","done","have","has","had","i","you","we","they",
}


def _tokenize(text: str) -> List[str]:
    text = text.lower()
    words = re.findall(r"[a-z0-9']+", text)
    return [w for w in words if w and w not in STOPWORDS and not w.isdigit()]


def _build_keywords(section: Dict[str, Any]) -> List[str]:
    parts: List[str] = [section.get("name", ""), section.get("description", "")]
    for c in section.get("criteria", []) or []:
        parts.append(c.get("label") or c.get("id") or "")
        parts.append(c.get("description", ""))
    toks: List[str] = []
    for p in parts:
        toks.extend(_tokenize(str(p)))
    # de-dup while preserving order
    seen = set()
    result: List[str] = []
    for t in toks:
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


def select_evidence(transcript: Dict[str, Any], section: Dict[str, Any], k: int = 5) -> List[Dict[str, Any]]:
    """Return top-k evidence snippets: {start_sec, end_sec, text, score}.

    Scoring: sum of keyword counts in each segment.
    """
    segments = transcript.get("segments") or []
    keywords = _build_keywords(section)
    if not keywords:
        return []

    # Build simple DF for keywords across segments
    df: Dict[str, int] = {kw: 0 for kw in keywords}
    texts: List[str] = []
    for seg in segments:
        t = str(seg.get("text", "")).lower()
        texts.append(t)
        for kw in keywords:
            if kw and t and kw in t:
                df[kw] += 1

    N = max(1, len(segments))
    scores: List[Tuple[float, int]] = []  # (score, index)
    for idx, text in enumerate(texts):
        if not text:
            scores.append((0.0, idx))
            continue
        score = 0.0
        for kw in keywords:
            if not kw:
                continue
            tf = text.count(kw)
            if tf == 0:
                continue
            df_kw = max(1, df.get(kw, 1))
            # tf-idf with log weighting
            idf = max(0.0, (N / df_kw))
            score += tf * idf
        scores.append((score, idx))

    # pick top-k > 0 scores; if all zeros, return empty to avoid noise
    scores.sort(key=lambda x: x[0], reverse=True)
    results: List[Dict[str, Any]] = []
    taken = 0
    for s, idx in scores:
        if taken >= k:
            break
        if s <= 0:
            break
        seg = segments[idx]
        results.append(
            {
                "start_sec": seg.get("start_sec"),
                "end_sec": seg.get("end_sec"),
                "text": seg.get("text", ""),
                "score": s,
            }
        )
        taken += 1
    return results
