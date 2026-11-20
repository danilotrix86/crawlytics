"""
Log parser package for Crawlytics.

This package provides tools for parsing web server logs and identifying LLM/AI crawlers.
"""

from .processor import LogProcessor, LogFormat, ProcessingOutput, detect_format, detect_log_format, iter_chunks, process_chunk
from .log_parsers import (
    AlbParser, ApacheParser, CaddyJsonParser, NginxParser, W3CParser,
    make_parser, parse_apache_line, parse_nginx_line,
)
from .referrals import AI_SOURCES, detect_ai_referral
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
    'LogFormat',
    'ProcessingOutput',
    'detect_format',
    'make_parser',
    'AlbParser',
    'CaddyJsonParser',
    'W3CParser',
    'AI_SOURCES',
    'detect_ai_referral',
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
