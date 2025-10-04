"""Tests for policy ingestion utilities."""

import io
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from transcriber.policy_ingestion import (DocumentExtractor, PolicyDocument,
                                          PolicyTemplate, TemplateBuilder,
                                          TemplateStore)


def make_upload(data: bytes, name: str):
    buffer = io.BytesIO(data)
    buffer.name = name
    return buffer


def test_document_extractor_text():
    upload = make_upload(b"Safety policy", "policy.txt")
    document = DocumentExtractor.load(upload)
    assert document.text == "Safety policy"
    assert document.metadata["extension"] == "txt"


@patch.object(DocumentExtractor, "_extract_pdf", return_value="PDF data")
def test_document_extractor_pdf(mock_extract):
    upload = make_upload(b"%PDF", "policy.pdf")
    document = DocumentExtractor.load(upload)
    assert "PDF data" in document.text
    mock_extract.assert_called_once()


@patch.object(DocumentExtractor, "_extract_docx", return_value="Line one\nLine two")
def test_document_extractor_docx(mock_extract):
    upload = make_upload(b"DOCX", "policy.docx")
    document = DocumentExtractor.load(upload)
    assert "Line one" in document.text
    mock_extract.assert_called_once()


def test_template_builder_generates_schema():
    mock_client = MagicMock()
    payload = {
        "template_name": "Alpha",
        "categories": [],
    }
    mock_client.responses.create.return_value = SimpleNamespace(output_text=json.dumps(payload))
    builder = TemplateBuilder(mock_client, "gpt-5.0")
    policy = PolicyDocument(name="policy", text="content", source_bytes=b"", metadata={})
    template = builder.build_from_policy(policy)
    assert template.schema["template_name"] == "Alpha"
    mock_client.responses.create.assert_called_once()


def test_template_store_roundtrip(tmp_path):
    store = TemplateStore(tmp_path)
    template = PolicyTemplate(
        name="Bravo",
        schema={"template_name": "Bravo", "categories": []},
        created_at="2024-01-01T00:00:00Z",
    )
    path = store.save(template)
    assert path.exists()

    templates = store.list_templates()
    assert "Bravo" in templates
    assert templates["Bravo"]["template_name"] == "Bravo"
