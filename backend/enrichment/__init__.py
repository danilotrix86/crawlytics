"""Enrichment of crawler requests: GeoIP/ASN lookups, bot verification and crawler taxonomy."""
from .enricher import Enricher, Enrichment, VERIFIED, SUSPICIOUS, UNKNOWN
from .taxonomy import CATEGORIES, CrawlerInfo, all_crawlers, get_crawler_info

__all__ = [
    "Enricher", "Enrichment", "VERIFIED", "SUSPICIOUS", "UNKNOWN",
    "CATEGORIES", "CrawlerInfo", "all_crawlers", "get_crawler_info",
]
