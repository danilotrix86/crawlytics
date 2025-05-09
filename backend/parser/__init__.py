"""
Log parser package for Crawlytics.

This package provides tools for parsing web server logs and identifying LLM/AI crawlers.
"""

# Import main components
from .processor import LogProcessor, detect_log_format, chunk_file, process_chunk
from .log_parsers import ApacheParser, NginxParser, parse_apache_line, parse_nginx_line
from .crawler_detection import is_llm_crawler, extract_crawler_name
from .parser_base import LogEntry, LogParser

# For backward compatibility, provide original module names as attributes
from . import crawler_detection as llm_list

# Module exports
__all__ = [
    # Main processor
    'LogProcessor',
    
    # Parser classes
    'ApacheParser',
    'NginxParser',
    'LogParser',
    'LogEntry',
    
    # Utility functions
    'detect_log_format',
    'parse_apache_line',
    'parse_nginx_line',
    'is_llm_crawler',
    'extract_crawler_name',
    'chunk_file',
    'process_chunk',
    
    # Backward compatibility
    'llm_list'
] 