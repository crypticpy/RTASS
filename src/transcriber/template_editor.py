"""Simple template editor utilities."""

from __future__ import annotations

from typing import Any, Dict, List

import streamlit as st


def edit_template(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Render a minimal UI to edit categories/criteria/weights and return updated schema."""
    schema = dict(schema)
    categories: List[Dict[str, Any]] = list(schema.get("categories") or [])

    st.subheader("Template editor")
    template_name = st.text_input("Template name", value=schema.get("template_name", "Template"))
    schema["template_name"] = template_name

    new_categories: List[Dict[str, Any]] = []
    for i, cat in enumerate(categories):
        with st.expander(f"Category {i+1}: {cat.get('name','Unnamed')}", expanded=False):
            name = st.text_input(f"Name (cat {i+1})", value=cat.get("name", ""), key=f"cat_name_{i}")
            # Clamp initial value to input bounds to avoid StreamlitValueAboveMaxError
            _w_val = float(cat.get("weight", 1.0))
            if _w_val < 0.0:
                _w_val = 0.0
            if _w_val > 1.0:
                _w_val = 1.0
            weight = st.number_input(
                f"Weight (0-1) (cat {i+1})",
                value=_w_val,
                min_value=0.0,
                max_value=1.0,
                step=0.05,
                key=f"cat_weight_{i}",
            )
            description = st.text_area(
                f"Description (cat {i+1})",
                value=cat.get("description", ""),
                key=f"cat_desc_{i}",
            )
            criteria = list(cat.get("criteria") or [])
            new_criteria = []
            for j, crit in enumerate(criteria):
                st.markdown(f"— Criterion {j+1}")
                cid = st.text_input(f"ID (c{j+1})", value=str(crit.get("id","")), key=f"crit_id_{i}_{j}")
                clabel = st.text_input(f"Label (c{j+1})", value=str(crit.get("label","")), key=f"crit_label_{i}_{j}")
                cdesc = st.text_area(f"Description (c{j+1})", value=str(crit.get("description","")), key=f"crit_desc_{i}_{j}")
                _cw_val = float(crit.get("weight", 1.0))
                if _cw_val < 0.0:
                    _cw_val = 0.0
                if _cw_val > 1.0:
                    _cw_val = 1.0
                cweight = st.number_input(
                    f"Weight (0-1) (c{j+1})",
                    value=_cw_val,
                    min_value=0.0,
                    max_value=1.0,
                    step=0.05,
                    key=f"crit_weight_{i}_{j}",
                )
                new_criteria.append({
                    "id": cid,
                    "label": clabel,
                    "description": cdesc,
                    "weight": cweight,
                })
            new_categories.append({
                "name": name,
                "description": description,
                "weight": weight,
                "criteria": new_criteria,
            })

    # Optional auto-normalize weights
    if st.checkbox("Auto-normalize category weights to sum 1.0", value=True):
        total = sum((c.get("weight") or 0.0) for c in new_categories) or 1.0
        for c in new_categories:
            c["weight"] = float(c.get("weight") or 0.0) / total

    # Normalize criteria weights inside each category
    for c in new_categories:
        crits = c.get("criteria") or []
        t = sum((ci.get("weight") or 0.0) for ci in crits) or 1.0
        for ci in crits:
            ci["weight"] = float(ci.get("weight") or 0.0) / t

    schema["categories"] = new_categories
    return schema
