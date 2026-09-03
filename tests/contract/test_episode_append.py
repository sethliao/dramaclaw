"""Contract tests for POST /projects/{project}/episodes/append."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.m03


# ── ChapterDetector unit tests ────────────────────────────────────────────────

def test_chapter_detector_parses_episode_markers():
    """ChapterDetector correctly parses Episode N markers."""
    from novelvideo.cognee.chapter_detector import ChapterDetector

    detector = ChapterDetector()
    text = "## Episode 3：春节\n场景：...\nMomo: 走进屋子。"
    chapters = detector.detect(text)

    assert len(chapters) == 1
    assert chapters[0].number == 3
    assert chapters[0].content == text


def test_chapter_detector_parses_chapter_markers():
    """ChapterDetector parses 第X章 markers."""
    from novelvideo.cognee.chapter_detector import ChapterDetector

    detector = ChapterDetector()
    text = "第一章 启程\n秦王入宫。\n第二章 风起\n宫门起风。"
    chapters = detector.detect(text)

    assert len(chapters) == 2
    assert chapters[0].number == 1
    assert chapters[1].number == 2


def test_chapter_detector_fallback_on_no_markers():
    """No markers → single fallback chapter."""
    from novelvideo.cognee.chapter_detector import ChapterDetector

    detector = ChapterDetector()
    text = "Freeform content without any chapter markers."
    chapters = detector.detect(text)

    assert len(chapters) == 1
    assert chapters[0].is_fallback is True


# ── Schema validation tests ────────────────────────────────────────────────────

def test_append_request_requires_text():
    """EpisodeAppendRequest.text is required; missing → 422."""
    from novelvideo.api.schemas import EpisodeAppendRequest

    # Valid: text provided
    req = EpisodeAppendRequest(text="## Episode 3\nContent")
    assert req.text == "## Episode 3\nContent"

    # Missing text → validation error
    import pydantic
    with pytest.raises(pydantic.ValidationError):
        EpisodeAppendRequest()
