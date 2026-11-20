"""Crawler metadata: operator, category and how each crawler can be verified."""
import json
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple

TAXONOMY_FILE = Path(__file__).resolve().parent / "crawlers.json"

CATEGORIES = {
    "training": "AI training",
    "ai_search": "AI search",
    "user_action": "User-triggered fetch",
    "search_engine": "Search engine",
    "seo": "SEO tool",
    "other": "Other",
}


@dataclass(frozen=True)
class CrawlerInfo:
    name: str
    operator: str
    category: str
    description: str = ""
    docs_url: Optional[str] = None
    ip_ranges: Tuple[str, ...] = field(default_factory=tuple)
    rdns: Tuple[str, ...] = field(default_factory=tuple)
    asns: Tuple[int, ...] = field(default_factory=tuple)

    @property
    def verifiable(self) -> bool:
        return bool(self.ip_ranges or self.rdns or self.asns)


@lru_cache(maxsize=1)
def _load() -> Tuple[Dict[str, CrawlerInfo], Dict[str, str]]:
    raw = json.loads(TAXONOMY_FILE.read_text(encoding="utf-8"))
    sources: Dict[str, str] = raw["verification_sources"]
    crawlers: Dict[str, CrawlerInfo] = {}
    for name, entry in raw["crawlers"].items():
        unknown_sources = set(entry.get("ip_ranges", [])) - set(sources)
        if unknown_sources:
            raise ValueError(f"{name} refers to unknown verification sources: {unknown_sources}")
        if entry["category"] not in CATEGORIES:
            raise ValueError(f"{name} has unknown category {entry['category']}")
        crawlers[name.lower()] = CrawlerInfo(
            name=name,
            operator=entry["operator"],
            category=entry["category"],
            description=entry.get("description", ""),
            docs_url=entry.get("docs_url"),
            ip_ranges=tuple(entry.get("ip_ranges", [])),
            rdns=tuple(s.lower().lstrip(".") for s in entry.get("rdns", [])),
            asns=tuple(entry.get("asns", [])),
        )
    return crawlers, sources


def get_crawler_info(name: Optional[str]) -> Optional[CrawlerInfo]:
    """Look up a crawler by name, case-insensitively."""
    if not name:
        return None
    return _load()[0].get(name.lower())


def all_crawlers() -> List[CrawlerInfo]:
    return list(_load()[0].values())


def verification_sources() -> Dict[str, str]:
    """Map of source key -> URL of a published IP range list."""
    return dict(_load()[1])
