"""Tests for compliance scoring utilities."""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from transcriber.policy_ingestion import PolicyTemplate
from transcriber.scoring import ComplianceScorer, ScorecardResult


@patch("transcriber.scoring.OpenAI")
def test_compliance_scorer_evaluate_returns_scorecard(mock_openai):
    mock_client = MagicMock()
    mock_openai.return_value = mock_client

    payload = {
        "overall_status": "pass",
        "overall_score": 92.0,
        "summary": "Strong radio discipline.",
        "categories": [
            {
                "name": "Dispatch",
                "status": "pass",
                "score": 95.0,
                "rationale": "All dispatch information relayed.",
                "criteria": [
                    {
                        "id": "D1",
                        "status": "pass",
                        "score": 95.0,
                        "rationale": "Units acknowledged dispatch.",
                        "action_items": [],
                    }
                ],
            }
        ],
        "recommendations": ["Continue current briefing process."],
    }

    mock_client.responses.create.return_value = SimpleNamespace(
        output_text=json.dumps(payload),
        usage={"prompt_tokens": 100, "completion_tokens": 50},
        model="gpt-5.0",
    )

    scorer = ComplianceScorer(api_key="sk-test", model="gpt-5.0")
    transcript = {
        "text": "Unit 1 en route.",
        "segments": [{"start_sec": 0.0, "end_sec": 5.0, "text": "Unit 1 en route."}],
    }
    template = PolicyTemplate(
        name="Test Template",
        schema={"template_name": "Test Template", "categories": []},
        created_at="2024-01-01T00:00:00Z",
    )

    result = scorer.evaluate(transcript, template)

    assert isinstance(result, ScorecardResult)
    assert result.overall_status == "pass"
    assert result.meta["model"] == "gpt-5.0"
    assert result.meta["prompt_tokens"] == 100
    assert result.categories[0].criteria[0].id == "D1"
