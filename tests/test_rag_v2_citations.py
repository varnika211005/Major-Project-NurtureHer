"""P3: citation validation tests.

Deterministic and offline. Markers must reference retrieved evidence IDs;
anything else is stripped with surrounding prose preserved. Stripping never
implies the remaining text is grounded.
"""

from app.rag_v2.citations import validate


def test_valid_markers_pass_through():
    result = validate(
        "Rest helps [source:cycle_tracking_001] and fluids matter [source:nutrition_001].",
        {"cycle_tracking_001", "nutrition_001"},
    )
    assert "[source:cycle_tracking_001]" in result.text
    assert "[source:nutrition_001]" in result.text
    assert result.report.valid_ids == ("cycle_tracking_001", "nutrition_001")
    assert result.report.stripped_unknown == ()
    assert result.report.stripped_malformed_count == 0
    assert result.report.text_grounding_established is False


def test_fabricated_ids_stripped_prose_preserved():
    result = validate(
        "Take this [source:miracle_cure_999] because studies [source:who-2024] say so.",
        {"pcos_guidance_001"},
    )
    assert "miracle_cure_999" not in result.text
    assert "who-2024" not in result.text
    assert "Take this" in result.text and "because studies" in result.text
    assert set(result.report.stripped_unknown) == {"miracle_cure_999", "who-2024"}


def test_malformed_markers_stripped():
    text = "A[source:] B[source: ] C[SOURCE:pcos_guidance_001] D[source:pcos_guidance_001 E[end] E[source:pcos_guidance_001]"
    result = validate(text, {"pcos_guidance_001"})
    assert "[source:" not in result.text.replace("[source:pcos_guidance_001]", "")
    assert "[source:pcos_guidance_001]" in result.text
    assert result.report.stripped_malformed_count >= 3
    # The malformed span is consumed through its first closing bracket.
    assert result.text == "A B C D E[source:pcos_guidance_001]"


def test_empty_and_markerless_text():
    assert validate("", set()).text == ""
    plain = "Just some plain guidance text (with [brackets] that are not markers)."
    result = validate(plain, {"x"})
    assert result.text == plain
    assert result.report.stripped_unknown == ()


def test_duplicate_valid_markers_kept_with_deduped_report():
    result = validate("[source:a] then [source:a] again", {"a"})
    assert result.text.count("[source:a]") == 2
    assert result.report.valid_ids == ("a",)
