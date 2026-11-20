import json
import os
import time

import pytest

from enrichment import Enricher, VERIFIED, SUSPICIOUS, UNKNOWN, all_crawlers, get_crawler_info
from enrichment.enricher import forward_confirmed_rdns
from enrichment.geoip import GeoIP
from enrichment.ip_ranges import IpRangeStore, parse_prefixes
from enrichment.taxonomy import CATEGORIES, verification_sources
from parser import DEFAULT_CRAWLER_PATTERNS

OPENAI_RANGES = {"creationTime": "2026-01-01", "prefixes": [{"ipv4Prefix": "20.1.0.0/16"}, {"ipv6Prefix": "2600:1f::/32"}]}


class FakeGeo:
    def __init__(self, asns=None):
        self.asns = asns or {}

    def country(self, ip):
        return "US" if ip.startswith("20.") else "DE"

    def network(self, ip):
        return self.asns.get(ip, (None, None))

    def available(self):
        return {"country": True, "asn": True}


def make_enricher(tmp_path, ranges=OPENAI_RANGES, asns=None, rdns=None, fetch=None):
    payload = json.dumps(ranges).encode()
    store = IpRangeStore(
        cache_dir=tmp_path,
        sources={"openai_gptbot": "https://example/gptbot.json", "ahrefs": "https://example/ahrefs.json",
                 "google_common": "x", "google_special": "x", "google_user_triggered": "x",
                 "google_user_triggered_google": "x"},
        fetch=fetch or (lambda url: payload),
    )
    return Enricher(ranges=store, geoip=FakeGeo(asns), rdns=rdns or (lambda ip, s: None),
                    use_rdns=rdns is not None)


@pytest.fixture(autouse=True)
def online(monkeypatch):
    monkeypatch.delenv("CRAWLYTICS_OFFLINE", raising=False)


# --- taxonomy ---------------------------------------------------------------

def test_every_default_pattern_has_taxonomy():
    missing = [p for p in DEFAULT_CRAWLER_PATTERNS if get_crawler_info(p) is None]
    assert missing == []


def test_taxonomy_is_consistent():
    sources = verification_sources()
    for info in all_crawlers():
        assert info.category in CATEGORIES
        assert set(info.ip_ranges) <= set(sources)


def test_lookup_is_case_insensitive():
    assert get_crawler_info("googlebot").operator == "Google"
    assert get_crawler_info("NotARealBot") is None


# --- IP ranges --------------------------------------------------------------

def test_parse_prefixes_handles_v4_v6_and_junk():
    nets = parse_prefixes({"prefixes": [{"ipv4Prefix": "1.2.3.0/24"}, {"ipv6Prefix": "2001:db8::/32"},
                                        {"ipv4Prefix": "nonsense"}], "notes": "x"})
    assert [str(n) for n in nets] == ["1.2.3.0/24", "2001:db8::/32"]


def test_range_check(tmp_path):
    store = make_enricher(tmp_path).ranges
    assert store.check("20.1.2.3", ["openai_gptbot"]) is True
    assert store.check("2600:1f::1", ["openai_gptbot"]) is True
    assert store.check("9.9.9.9", ["openai_gptbot"]) is False
    assert store.check("not-an-ip", ["openai_gptbot"]) is None


def test_failed_download_without_cache_is_inconclusive(tmp_path):
    def boom(url):
        raise OSError("offline")
    store = make_enricher(tmp_path, fetch=boom).ranges
    assert store.check("20.1.2.3", ["openai_gptbot"]) is None


def test_stale_cache_is_used_when_download_fails(tmp_path):
    (tmp_path / "openai_gptbot.json").write_text(json.dumps(OPENAI_RANGES))
    old = time.time() - 3 * 24 * 3600
    os.utime(tmp_path / "openai_gptbot.json", (old, old))

    def boom(url):
        raise OSError("offline")
    store = make_enricher(tmp_path, fetch=boom).ranges
    assert store.check("20.1.2.3", ["openai_gptbot"]) is True


def test_downloaded_list_is_cached(tmp_path):
    calls = []
    payload = json.dumps(OPENAI_RANGES).encode()

    def fetch(url):
        calls.append(url)
        return payload
    make_enricher(tmp_path, fetch=fetch).ranges.check("20.1.2.3", ["openai_gptbot"])
    assert (tmp_path / "openai_gptbot.json").exists()
    make_enricher(tmp_path, fetch=fetch).ranges.check("20.1.2.3", ["openai_gptbot"])
    assert len(calls) == 1


# --- verdicts ---------------------------------------------------------------

def test_verdicts(tmp_path):
    enricher = make_enricher(tmp_path, asns={"31.13.1.1": (32934, "Facebook, Inc."),
                                             "5.5.5.5": (16509, "Amazon.com, Inc.")})
    results = enricher.enrich_pairs([
        ("20.1.2.3", "GPTBot"),          # in OpenAI's list
        ("9.9.9.9", "GPTBot"),           # claims GPTBot, not in the list
        ("31.13.1.1", "Meta-ExternalAgent"),  # Meta's network
        ("5.5.5.5", "Meta-ExternalAgent"),    # someone else's network
        ("9.9.9.9", "Bytespider"),       # no way to verify
        ("9.9.9.9", "CustomBot"),        # not in the taxonomy
    ])
    verdicts = {pair: r.verification for pair, r in results.items()}
    assert verdicts == {
        ("20.1.2.3", "GPTBot"): VERIFIED,
        ("9.9.9.9", "GPTBot"): SUSPICIOUS,
        ("31.13.1.1", "Meta-ExternalAgent"): VERIFIED,
        ("5.5.5.5", "Meta-ExternalAgent"): SUSPICIOUS,
        ("9.9.9.9", "Bytespider"): UNKNOWN,
        ("9.9.9.9", "CustomBot"): UNKNOWN,
    }
    assert results[("20.1.2.3", "GPTBot")].country_code == "US"
    assert results[("5.5.5.5", "Meta-ExternalAgent")].as_org == "Amazon.com, Inc."


def test_rdns_can_verify_when_ranges_fail(tmp_path):
    seen = []

    def rdns(ip, suffixes):
        seen.append((ip, suffixes))
        return ip == "66.249.66.1"
    enricher = make_enricher(tmp_path, rdns=rdns)
    results = enricher.enrich_pairs([("66.249.66.1", "Googlebot"), ("1.1.1.1", "Googlebot"),
                                     ("20.1.2.3", "Googlebot")])
    assert results[("66.249.66.1", "Googlebot")].verification == VERIFIED
    assert results[("1.1.1.1", "Googlebot")].verification == SUSPICIOUS
    assert results[("20.1.2.3", "Googlebot")].verification == VERIFIED  # ranges hit, no DNS needed
    assert [ip for ip, _ in seen] == ["66.249.66.1", "1.1.1.1"]
    assert "googlebot.com" in seen[0][1]


def test_rdns_failure_keeps_previous_verdict(tmp_path):
    def broken(ip, suffixes):
        raise RuntimeError("dns down")
    results = make_enricher(tmp_path, rdns=broken).enrich_pairs([("1.1.1.1", "Googlebot")])
    assert results[("1.1.1.1", "Googlebot")].verification == SUSPICIOUS  # range check was conclusive


def test_unloadable_sources_give_unknown(tmp_path):
    def boom(url):
        raise OSError("offline")
    results = make_enricher(tmp_path, fetch=boom).enrich_pairs([("9.9.9.9", "GPTBot")])
    assert results[("9.9.9.9", "GPTBot")].verification == UNKNOWN


def test_forward_confirmed_rdns(monkeypatch):
    import socket
    monkeypatch.setattr(socket, "gethostbyaddr", lambda ip: ("crawl-66-249-66-1.googlebot.com", [], [ip]))
    monkeypatch.setattr(socket, "getaddrinfo", lambda host, port: [(2, 1, 6, "", ("66.249.66.1", 0))])
    assert forward_confirmed_rdns("66.249.66.1", ["googlebot.com"]) is True
    assert forward_confirmed_rdns("66.249.66.2", ["googlebot.com"]) is False  # forward lookup mismatch
    assert forward_confirmed_rdns("66.249.66.1", ["example.com"]) is False
    monkeypatch.setattr(socket, "gethostbyaddr", lambda ip: ("evilgooglebot.com", [], [ip]))
    assert forward_confirmed_rdns("66.249.66.1", ["googlebot.com"]) is False  # suffix must be a domain


def test_geoip_without_database_returns_nothing(tmp_path, monkeypatch):
    monkeypatch.setenv("CRAWLYTICS_OFFLINE", "1")
    geo = GeoIP(directory=tmp_path)
    assert geo.country("8.8.8.8") is None
    assert geo.network("8.8.8.8") == (None, None)
    assert geo.available() == {"country": False, "asn": False}


def test_ranges_seen_before_still_verify_after_rotation(tmp_path):
    lists = [OPENAI_RANGES, {"prefixes": [{"ipv4Prefix": "40.0.0.0/16"}]}]
    calls = iter(lists)
    payloads = lambda url: json.dumps(next(calls)).encode()

    make_enricher(tmp_path, fetch=payloads).ranges.check("20.1.2.3", ["openai_gptbot"])
    # A day later the operator publishes a list without 20.1.0.0/16
    old = time.time() - 2 * 24 * 3600
    os.utime(tmp_path / "openai_gptbot.json", (old, old))
    store = make_enricher(tmp_path, fetch=payloads).ranges
    assert store.check("40.0.1.1", ["openai_gptbot"]) is True
    assert store.check("20.1.2.3", ["openai_gptbot"]) is True
    assert len(list((tmp_path / "history" / "openai_gptbot").glob("*.json"))) == 2
