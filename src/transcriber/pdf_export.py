from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


def _header_footer(canvas, doc):  # type: ignore
    canvas.saveState()
    width, height = LETTER
    # Header
    canvas.setFillColor(colors.HexColor("#0D47A1"))
    canvas.rect(0, height - 0.6 * inch, width, 0.6 * inch, fill=True, stroke=False)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(0.75 * inch, height - 0.4 * inch, "Compliance Audit Report")
    # Footer
    canvas.setFillColor(colors.HexColor("#555555"))
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(width - 0.75 * inch, 0.5 * inch, f"Page {doc.page}")
    canvas.restoreState()


def render_pdf_bytes(
    scorecard: Dict[str, Any],
    *,
    transcript_name: Optional[str] = None,
    template_name: Optional[str] = None,
    model: Optional[str] = None,
    organization: Optional[str] = None,
) -> bytes:
    """Render a high-quality PDF for the scorecard.

    Inputs should be plain dicts (use scorecard.to_dict()).
    """
    buf = BytesIO()

    margin = (0.75 * inch, 0.9 * inch)
    doc = BaseDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=margin[0],
        rightMargin=margin[0],
        topMargin=margin[1],
        bottomMargin=margin[1],
        title="Compliance Audit Report",
        author=organization or "",
    )

    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height - 0.3 * inch, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_header_footer)])

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle(
        "h1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#0D47A1"),
        spaceAfter=12,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=colors.HexColor("#0D47A1"),
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#222222"),
        spaceAfter=6,
    )
    small = ParagraphStyle("small", parent=body, fontSize=9, textColor=colors.HexColor("#555555"))
    badge = ParagraphStyle("badge", parent=body, textColor=colors.white)

    elements: List[Any] = []

    # Cover block
    title = "Compliance Audit Report"
    subtitle_parts: List[str] = []
    if organization:
        subtitle_parts.append(organization)
    if template_name:
        subtitle_parts.append(f"Template: {template_name}")
    if transcript_name:
        subtitle_parts.append(f"Source: {transcript_name}")
    if model:
        subtitle_parts.append(f"Model: {model}")

    elements.append(Spacer(1, 0.4 * inch))
    elements.append(Paragraph(title, h1))
    if subtitle_parts:
        elements.append(Paragraph(" • ".join(subtitle_parts), small))
    elements.append(Spacer(1, 0.25 * inch))

    # Summary chip row
    status = scorecard.get("overall_status", "unknown").title()
    overall = scorecard.get("overall_score")
    summary = scorecard.get("summary") or ""
    status_color = colors.HexColor("#2E7D32") if status.lower() == "pass" else colors.HexColor("#EF6C00")

    # Status/score block
    status_tbl = Table(
        [[Paragraph(f"<b>Status:</b> {status}", badge), Paragraph(f"<b>Overall Score:</b> {overall if overall is not None else 'N/A'}", badge)]],
        colWidths=[2.5 * inch, 3.0 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), status_color),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, status_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, status_color),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        ),
    )
    elements.append(status_tbl)
    if summary:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(summary, body))

    # Categories
    categories = scorecard.get("categories") or []
    for idx, cat in enumerate(categories, 1):
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph(f"{idx}. {cat.get('name','')}", h2))
        cscore = cat.get("score")
        cweight = cat.get("weight")
        crationale = cat.get("rationale") or ""

        meta_tbl = Table(
            [
                ["Score", f"{cscore:.2f}" if cscore is not None else "N/A", "Weight", f"{cweight:.2f}" if cweight is not None else "—"],
            ],
            colWidths=[0.8 * inch, 1.2 * inch, 0.8 * inch, 1.2 * inch],
            style=TableStyle(
                [
                    ("FONT", (0, 0), (-1, -1), "Helvetica", 10),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#333333")),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            ),
        )
        elements.append(meta_tbl)
        if crationale:
            elements.append(Paragraph(crationale, body))

        # Criteria table
        crit_rows = [["Criterion", "Status", "Score", "Weight"]]
        for crit in cat.get("criteria") or []:
            crit_rows.append(
                [
                    str(crit.get("id", "")),
                    str(crit.get("status", "")),
                    "" if crit.get("score") is None else f"{crit.get('score'):.2f}",
                    "" if crit.get("weight") is None else f"{crit.get('weight'):.2f}",
                ]
            )
        if len(crit_rows) > 1:
            tbl = Table(
                crit_rows,
                colWidths=[2.2 * inch, 1.2 * inch, 0.9 * inch, 0.9 * inch],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ECEFF1")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#263238")),
                        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 10),
                        ("FONT", (0, 1), (-1, -1), "Helvetica", 10),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CFD8DC")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#B0BEC5")),
                        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
                    ]
                ),
            )
            elements.append(tbl)

        # Citations
        findings = cat.get("findings") or []
        if findings:
            elements.append(Spacer(1, 0.15 * inch))
            elements.append(Paragraph("Citations", ParagraphStyle("h3", parent=h2, fontSize=12)))
            for f in findings:
                ts = f.get("timestamp") or _fmt_range(f.get("start_sec"), f.get("end_sec"))
                quote = f.get("quote") or f.get("text") or ""
                elements.append(Paragraph(f"[{ts}] {quote}", body))

        if idx < len(categories):
            elements.append(PageBreak())

    # Recommendations
    recs = scorecard.get("recommendations") or []
    if recs:
        elements.append(PageBreak())
        elements.append(Paragraph("Recommendations", h2))
        for r in recs:
            elements.append(Paragraph(f"• {r}", body))

    doc.build(elements)
    return buf.getvalue()


def _fmt_range(start, end) -> str:
    try:
        s = max(0.0, float(start or 0))
        e = max(s, float(end or s))
        return f"{_fmt_ts(s)}–{_fmt_ts(e)}"
    except Exception:
        return "--:--"


def _fmt_ts(v: float) -> str:
    hh = int(v // 3600)
    mm = int((v % 3600) // 60)
    ss = v - hh * 3600 - mm * 60
    return f"{hh:02d}:{mm:02d}:{ss:05.2f}"
