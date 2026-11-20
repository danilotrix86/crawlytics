"""
Adds country, network owner and a verification verdict to crawler requests.

Verdicts:
  verified   - the IP belongs to the operator (published ranges, its network, or
               forward-confirmed reverse DNS)
  suspicious - the operator publishes a way to check and the IP failed it,
               so the user agent is probably spoofed
  unknown    - there's no way to check this crawler, or the data couldn't be loaded
"""
import logging
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

from . import settings
from .geoip import GeoIP
from .ip_ranges import IpRangeStore
from .taxonomy import get_crawler_info

logger = logging.getLogger("enricher")

VERIFIED = "verified"
SUSPICIOUS = "suspicious"
UNKNOWN = "unknown"

RDNS_TIMEOUT_SECONDS = 3
RDNS_WORKERS = 16


@dataclass
class Enrichment:
    country_code: Optional[str]
    asn: Optional[int]
    as_org: Optional[str]
    verification: str


def _host_matches(hostname: str, suffixes: Iterable[str]) -> bool:
    hostname = hostname.lower().rstrip(".")
    return any(hostname == s or hostname.endswith("." + s) for s in suffixes)


def forward_confirmed_rdns(ip: str, suffixes: Iterable[str]) -> Optional[bool]:
    """
    Reverse-resolve the IP, check the host is in an allowed domain, then resolve
    the host forward and check it maps back to the same IP. None if DNS failed.
    """
    try:
        hostname = socket.gethostbyaddr(ip)[0]
    except socket.herror:
        return False  # no PTR record: definitely not the operator's crawler
    except OSError:
        return None
    if not _host_matches(hostname, suffixes):
        return False
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(hostname, None)}
    except OSError:
        return None
    return ip in addresses


class Enricher:
    def __init__(self, ranges: Optional[IpRangeStore] = None, geoip: Optional[GeoIP] = None,
                 rdns=forward_confirmed_rdns, use_rdns: Optional[bool] = None):
        self.ranges = ranges or IpRangeStore()
        self.geoip = geoip or GeoIP()
        self._rdns = rdns
        self.use_rdns = settings.rdns_enabled() if use_rdns is None else use_rdns

    def _verify_without_dns(self, ip: str, crawler: Optional[str], asn: Optional[int]) -> Tuple[str, bool]:
        """Returns (verdict, needs_rdns)."""
        info = get_crawler_info(crawler)
        if not info or not info.verifiable:
            return UNKNOWN, False

        conclusive = False
        if info.ip_ranges:
            in_ranges = self.ranges.check(ip, info.ip_ranges)
            if in_ranges:
                return VERIFIED, False
            conclusive = conclusive or in_ranges is False
        if info.asns:
            if asn is not None:
                if asn in info.asns:
                    return VERIFIED, False
                conclusive = True
        if info.rdns and self.use_rdns:
            return (SUSPICIOUS if conclusive else UNKNOWN), True
        return (SUSPICIOUS if conclusive else UNKNOWN), False

    def enrich_pairs(self, pairs: Iterable[Tuple[str, Optional[str]]]) -> Dict[Tuple[str, Optional[str]], Enrichment]:
        """Enrich unique (ip, crawler_name) pairs."""
        pairs = list(dict.fromkeys(pairs))
        results: Dict[Tuple[str, Optional[str]], Enrichment] = {}
        geo_cache: Dict[str, Tuple[Optional[str], Optional[int], Optional[str]]] = {}
        needs_dns: List[Tuple[str, Optional[str]]] = []

        for ip, crawler in pairs:
            if ip not in geo_cache:
                asn, as_org = self.geoip.network(ip)
                geo_cache[ip] = (self.geoip.country(ip), asn, as_org)
            country, asn, as_org = geo_cache[ip]
            verdict, rdns = self._verify_without_dns(ip, crawler, asn)
            results[(ip, crawler)] = Enrichment(country, asn, as_org, verdict)
            if rdns:
                needs_dns.append((ip, crawler))

        if needs_dns:
            self._apply_rdns(needs_dns, results)
        return results

    def _apply_rdns(self, pairs, results) -> None:
        executor = ThreadPoolExecutor(max_workers=RDNS_WORKERS)
        try:
            futures = {
                pair: executor.submit(self._rdns, pair[0], get_crawler_info(pair[1]).rdns)
                for pair in pairs
            }
            for pair, future in futures.items():
                try:
                    outcome = future.result(timeout=RDNS_TIMEOUT_SECONDS)
                except FutureTimeout:
                    outcome = None
                except Exception as e:
                    logger.debug(f"rDNS check failed for {pair[0]}: {e}")
                    outcome = None
                current = results[pair]
                if outcome:
                    current.verification = VERIFIED
                elif outcome is False:
                    current.verification = SUSPICIOUS
                # None (DNS trouble) keeps the verdict from the other checks
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

    def enrich_entries(self, entries: List[dict]) -> None:
        """Add enrichment fields to parsed log entries in place."""
        pairs = [(e.get("ip_address"), e.get("crawler_name")) for e in entries if e.get("ip_address")]
        found = self.enrich_pairs(pairs)
        for entry in entries:
            result = found.get((entry.get("ip_address"), entry.get("crawler_name")))
            if result:
                entry.update(result.__dict__)
