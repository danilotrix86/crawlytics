"""
Configuration file containing patterns for identifying LLM crawlers.
This file contains the list of known LLM crawler patterns used for detection.
"""

# List of known LLM crawler user agent patterns
LLM_CRAWLER_PATTERNS = [
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

    # OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "MetaGPT",

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
] 