"""
LLM list module for backward compatibility.
This file is maintained for compatibility with existing imports.
"""
import warnings
from .crawler_detection import is_llm_crawler as _is_llm_crawler
from .crawler_detection import extract_crawler_name as _extract_crawler_name

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

# Original LLM crawler patterns preserved for backward compatibility
LLM_CRAWLER_PATTERNS = [
    # OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",

    # Anthropic
    "ClaudeBot",
    "Claude-Web",
    "Anthropic-AI",
    "Anthropic-AI-Crawler",

    # Google
    "googlebot",
    "Google-Extended",
    "Google-CloudVertexBot",

    # Meta
    "MetaGPT",
    "LLaMA-Bot",
    "Meta AI",
    "Meta-ExternalAgent",
    "Meta-ExternalFetcher",
    "Facebookbot",

    # Cohere
    "Cohere-AI",
    "CohereBot",
    "cohere-ai",
    "cohere-training-data-crawler",

    # Perplexity
    "PerplexityBot",

    # Apple
    "Applebot-Extended",

    # Amazon
    "Amazonbot",

    # ByteDance
    "Bytespider",

    # Common Crawl
    "CCBot",

    # Allen Institute for AI
    "AI2Bot",
    "AI2Bot-Dolma",

    # Others
    "DuckAssistBot",
    "Diffbot",
    "Omgili",
    "Omgilibot",
    "webzio-extended",
    "Youbot",
    "SemrushBot-OCOB",
    "Petalbot",
    "PanguBot",
    "Kangaroo Bot",
    "Sentibot",
    "img2dataset",
    "Meltwater",
    "Seekr",
    "peer39_crawler",
    "Scrapy",
]