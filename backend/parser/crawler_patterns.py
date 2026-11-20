"""
Crawler pattern storage and matching.

The built-in defaults live in this module. The user's customised list is
stored as data in a JSON file (never as Python source), so editing patterns
from the Settings page can't inject code into the application.
"""
import json
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Iterable, List, Optional

logger = logging.getLogger("crawler_patterns")

MAX_PATTERNS = 500
MAX_PATTERN_LENGTH = 100

# Default list of known LLM crawler user agent substrings (matched case-insensitively)
DEFAULT_CRAWLER_PATTERNS: List[str] = [
    # AI2/Allen Institute
    "AI2Bot",
    "AI2Bot-Dolma",
    # Amazon
    "Amazonbot",
    # Anthropic
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "Claude-Web",
    "Anthropic-AI",
    "Anthropic-AI-Crawler",
    # Apple
    "Applebot",
    "Applebot-Extended",
    # ByteDance
    "Bytespider",
    # Cohere
    "cohere-ai",
    "CohereBot",
    "cohere-training-data-crawler",
    # Common Crawl
    "CCBot",
    # DuckDuckGo
    "DuckDuckBot",
    "DuckAssistBot",
    # Google
    "Googlebot",
    "Google-Extended",
    "GoogleOther",
    "Google-CloudVertexBot",
    "Google-InspectionTool",
    # Huawei
    "Petalbot",
    "PanguBot",
    # Meta/Facebook
    "FacebookBot",
    "Meta-ExternalAgent",
    "LLaMA-Bot",
    "Meta AI",
    "Meta-ExternalFetcher",
    # Mistral AI
    "MistralAI-User",
    # OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "MetaGPT",
    # Perplexity
    "PerplexityBot",
    "Perplexity-User",
    # Others
    "AhrefsBot",
    "Diffbot",
    "Omgili",
    "Omgilibot",
    "webzio-extended",
    "Youbot",
    "SemrushBot-OCOB",
    "Kangaroo Bot",
    "Sentibot",
    "img2dataset",
    "Meltwater",
    "Seekr",
    "peer39_crawler",
    "Scrapy",
]


def patterns_file_path() -> Path:
    """Location of the user's pattern list (override with CRAWLYTICS_PATTERNS_PATH)."""
    env_path = os.environ.get("CRAWLYTICS_PATTERNS_PATH")
    if env_path:
        return Path(env_path)
    return Path(__file__).resolve().parent.parent / "data" / "crawler_patterns.json"


def normalize_patterns(patterns: Iterable[object]) -> List[str]:
    """
    Validate and clean a list of patterns: strip whitespace, drop empties and
    case-insensitive duplicates (first spelling wins).

    Raises:
        ValueError: if an entry isn't a string or the list is too large.
    """
    result: List[str] = []
    seen = set()
    for pattern in patterns:
        if not isinstance(pattern, str):
            raise ValueError("Every pattern must be a string")
        cleaned = pattern.strip()
        if not cleaned:
            continue
        if len(cleaned) > MAX_PATTERN_LENGTH:
            raise ValueError(f"Patterns must be at most {MAX_PATTERN_LENGTH} characters: {cleaned[:30]}...")
        if any(ord(ch) < 32 for ch in cleaned):
            raise ValueError("Patterns can't contain control characters")
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    if len(result) > MAX_PATTERNS:
        raise ValueError(f"At most {MAX_PATTERNS} patterns are allowed")
    return result


def load_patterns() -> List[str]:
    """Return the current pattern list, falling back to the defaults."""
    path = patterns_file_path()
    if not path.exists():
        return list(DEFAULT_CRAWLER_PATTERNS)
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        patterns = data.get("patterns") if isinstance(data, dict) else data
        return normalize_patterns(patterns or [])
    except (OSError, ValueError, AttributeError) as e:
        logger.error(f"Could not read crawler patterns from {path}, using defaults: {e}")
        return list(DEFAULT_CRAWLER_PATTERNS)


def save_patterns(patterns: Iterable[object]) -> List[str]:
    """Validate and atomically write the pattern list. Returns the saved list."""
    cleaned = normalize_patterns(patterns)
    path = patterns_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=path.parent, prefix=".patterns-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"patterns": cleaned}, f, indent=2, ensure_ascii=False)
        os.replace(tmp_name, path)
    except Exception:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise
    return cleaned


def reset_patterns() -> List[str]:
    """Restore the default pattern list."""
    return save_patterns(DEFAULT_CRAWLER_PATTERNS)


class CrawlerMatcher:
    """
    Case-insensitive substring matcher. When several patterns match, the
    longest one wins, so "Applebot-Extended" isn't reported as "Applebot".
    """

    def __init__(self, patterns: Iterable[str]):
        cleaned = normalize_patterns(patterns)
        self._canonical = {p.lower(): p for p in cleaned}
        ordered = sorted(cleaned, key=len, reverse=True)
        self._regex = (
            re.compile("|".join(re.escape(p) for p in ordered), re.IGNORECASE)
            if ordered else None
        )

    def match(self, user_agent: Optional[str]) -> Optional[str]:
        """Return the matching pattern name, or None if the agent isn't a known crawler."""
        if not user_agent or self._regex is None:
            return None
        best: Optional[str] = None
        for m in self._regex.finditer(user_agent):
            found = m.group(0)
            if best is None or len(found) > len(best):
                best = found
        return self._canonical[best.lower()] if best else None
