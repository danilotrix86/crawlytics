"""
LLM list module for backward compatibility.
This file is maintained for compatibility with existing imports.
"""
import warnings
from .crawler_detection import is_llm_crawler as _is_llm_crawler
from .crawler_detection import extract_crawler_name as _extract_crawler_name
from .crawler_patterns import LLM_CRAWLER_PATTERNS

# Show a deprecation warning when directly importing from this module
warnings.warn(
    "The 'llm_list' module is deprecated. Please import from 'parser.crawler_detection' module directly.",
    DeprecationWarning,
    stacklevel=2
)

# Re-export for backward compatibility
def is_llm_crawler(user_agent):
    """Check if a user agent string matches known LLM crawler patterns."""
    return _is_llm_crawler(user_agent)

def extract_crawler_name(user_agent):
    """Extract the crawler name from a user agent string."""
    return _extract_crawler_name(user_agent)

# LLM_CRAWLER_PATTERNS is imported from config.crawler_patterns