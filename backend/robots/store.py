"""Saved copy of the site's robots.txt."""
import json
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlsplit, urlunsplit

from enrichment.ip_ranges import USER_AGENT
from enrichment.settings import data_dir

MAX_BYTES = 512 * 1024


def _paths():
    base = data_dir()
    return base / "robots.txt", base / "robots_meta.json"


def load() -> Dict[str, Any]:
    text_path, meta_path = _paths()
    meta: Dict[str, Any] = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except ValueError:
            meta = {}
    return {
        "content": text_path.read_text(encoding="utf-8") if text_path.exists() else None,
        "source_url": meta.get("source_url"),
        "updated_at": meta.get("updated_at"),
    }


def save(content: str, source_url: Optional[str] = None) -> Dict[str, Any]:
    if len(content.encode("utf-8")) > MAX_BYTES:
        raise ValueError("robots.txt is larger than 512 KB")
    text_path, meta_path = _paths()
    text_path.parent.mkdir(parents=True, exist_ok=True)
    text_path.write_text(content, encoding="utf-8")
    meta_path.write_text(json.dumps({
        "source_url": source_url,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }), encoding="utf-8")
    return load()


def robots_url(site: str) -> str:
    """Turn 'example.com' or any URL on a site into its robots.txt URL."""
    site = site.strip()
    if "://" not in site:
        site = "https://" + site
    parts = urlsplit(site)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Enter a website address such as https://example.com")
    return urlunsplit((parts.scheme, parts.netloc, "/robots.txt", "", ""))


def fetch(site: str, opener=None) -> Dict[str, Any]:
    """Download a site's robots.txt and save it."""
    url = robots_url(site)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    open_url = opener or (lambda req: urllib.request.urlopen(req, timeout=15))
    with open_url(request) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError("robots.txt is larger than 512 KB")
    return save(body.decode("utf-8", errors="replace"), source_url=url)
