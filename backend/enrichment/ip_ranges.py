"""
Download, cache and query the IP ranges crawler operators publish.

Every list uses the same JSON shape ({"prefixes": [{"ipv4Prefix": ...}, ...]}).
Lists are cached on disk for a day. If a download fails the stale copy is
used, and if there's no copy at all the source counts as unavailable, so
requests from that crawler are reported as "unknown" rather than "suspicious".
"""
import hashlib
import ipaddress
import json
import logging
import threading
import time
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple, Union

from . import settings
from .taxonomy import verification_sources

logger = logging.getLogger("ip_ranges")

CACHE_TTL_SECONDS = 24 * 3600
USER_AGENT = "Crawlytics (+https://github.com/danilotrix86/crawlytics)"

Network = Union[ipaddress.IPv4Network, ipaddress.IPv6Network]


def parse_prefixes(data: object) -> List[Network]:
    """Collect every ipv4Prefix / ipv6Prefix value from a published range list."""
    networks: List[Network] = []

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if isinstance(value, str) and key.lower().endswith("prefix"):
                    try:
                        networks.append(ipaddress.ip_network(value.strip(), strict=False))
                    except ValueError:
                        pass
                else:
                    walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(data)
    return networks


class IpRangeStore:
    def __init__(self, cache_dir: Optional[Path] = None, sources: Optional[Dict[str, str]] = None,
                 fetch=None):
        self.cache_dir = cache_dir or settings.data_dir() / "ip_ranges"
        self.sources = sources if sources is not None else verification_sources()
        self._fetch = fetch or self._download
        self._networks: Dict[str, Tuple[float, Optional[List[Network]]]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _download(url: str) -> bytes:
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.read()

    def _cache_file(self, key: str) -> Path:
        return self.cache_dir / f"{key}.json"

    def _history_dir(self, key: str) -> Path:
        return self.cache_dir / "history" / key

    def _archive(self, key: str, body: bytes, networks: List[Network]) -> None:
        """
        Keep every distinct version of a list. Operators rotate their IPs, so an
        old log is checked against the ranges that were valid back then too.
        """
        canonical = ",".join(sorted(map(str, networks)))
        signature = hashlib.sha256(canonical.encode()).hexdigest()[:16]
        target = self._history_dir(key) / f"{time.strftime('%Y%m%d')}-{signature}.json"
        if not any(p.name.endswith(f"-{signature}.json") for p in self._history_dir(key).glob("*.json")):
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)

    def _read(self, path: Path, key: str) -> List[Network]:
        try:
            return parse_prefixes(json.loads(path.read_bytes()))
        except (OSError, ValueError) as e:
            logger.warning(f"IP range file {path.name} for {key} is unreadable: {e}")
            return []

    def _load_source(self, key: str) -> Optional[List[Network]]:
        path = self._cache_file(key)
        fresh = path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_SECONDS

        if not fresh and not settings.offline() and key in self.sources:
            try:
                body = self._fetch(self.sources[key])
                networks = parse_prefixes(json.loads(body))
                if networks:
                    self.cache_dir.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(body)
                    self._archive(key, body, networks)
                else:
                    logger.warning(f"IP range list {key} contained no prefixes")
            except Exception as e:
                logger.warning(f"Could not download IP ranges for {key}: {e}")

        networks: List[Network] = []
        if path.exists():
            networks.extend(self._read(path, key))
        for old in sorted(self._history_dir(key).glob("*.json")):
            networks.extend(self._read(old, key))
        return list(dict.fromkeys(networks)) or None

    def networks(self, key: str) -> Optional[List[Network]]:
        """The networks for a source, or None if the list isn't available."""
        with self._lock:
            cached = self._networks.get(key)
            if cached is None or time.time() - cached[0] > CACHE_TTL_SECONDS:
                cached = (time.time(), self._load_source(key))
                self._networks[key] = cached
            return cached[1]

    def check(self, ip: str, keys: Iterable[str]) -> Optional[bool]:
        """
        True if the IP is inside any of the sources' ranges, False if it isn't,
        None if none of the sources could be loaded.
        """
        try:
            address = ipaddress.ip_address(ip)
        except ValueError:
            return None
        any_loaded = False
        for key in keys:
            networks = self.networks(key)
            if networks is None:
                continue
            any_loaded = True
            if any(address.version == net.version and address in net for net in networks):
                return True
        return False if any_loaded else None

    def status(self) -> Dict[str, bool]:
        """Which sources currently have a usable list."""
        return {key: self.networks(key) is not None for key in self.sources}
