"""
Log parser package for Crawlytics.

This package provides tools for parsing web server logs and identifying LLM/AI crawlers.
"""

from .processor import LogProcessor, detect_log_format, iter_chunks, process_chunk
from .log_parsers import ApacheParser, NginxParser, parse_apache_line, parse_nginx_line
from .crawler_patterns import (
    CrawlerMatcher,
    DEFAULT_CRAWLER_PATTERNS,
    load_patterns,
    save_patterns,
    reset_patterns,
)
from .parser_base import LogEntry, LogParser

__all__ = [
    'LogProcessor',
    'ApacheParser',
    'NginxParser',
    'LogParser',
    'LogEntry',
    'CrawlerMatcher',
    'DEFAULT_CRAWLER_PATTERNS',
    'load_patterns',
    'save_patterns',
    'reset_patterns',
    'detect_log_format',
    'parse_apache_line',
    'parse_nginx_line',
    'iter_chunks',
    'process_chunk',
]
