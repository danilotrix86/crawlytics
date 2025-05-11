"""
Configuration file containing patterns for identifying LLM crawlers.
This file contains the list of known LLM crawler patterns used for detection.
"""

# List of known LLM crawler user agent patterns
LLM_CRAWLER_PATTERNS = [
    # AI2/Allen Institute
    "AI2Bot",
    "AI2Bot-Dolma",

    # Amazon
    "Amazonbot",

    # Anthropic
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "Claude-Web",
    "Anthropic-AI",
    "Anthropic-AI-Crawler",

    # Apple
    "Applebot",
    "Applebot-Extended",

    # ByteDance
    "Bytespider",

    # Cohere
    "cohere-ai",
    "Cohere-AI",
    "CohereBot",
    "cohere-training-data-crawler",

    # Common Crawl
    "CCBot",

    # DuckDuckGo
    "DuckDuckBot",
    "DuckAssistBot",

    # Google
    "googlebot",
    "Googlebot",
    "Google-Extended",
    "GoogleOther",
    "Google-CloudVertexBot",

    # Huawei
    "Petalbot",
    "PanguBot",

    # Meta/Facebook
    "FacebookBot",
    "Facebookbot",
    "Meta-ExternalAgent",
    "LLaMA-Bot",
    "Meta AI",
    "Meta-ExternalFetcher",

    # Mistral AI
    "MistralAI-User",

    # OpenAI
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "MetaGPT",

    # Perplexity
    "PerplexityBot",
    "Perplexity-User",

    # Others
    "Diffbot",
    "Omgili",
    "Omgilibot",
    "webzio-extended",
    "Youbot",
    "SemrushBot-OCOB",
    "Kangaroo Bot",
    "Sentibot",
    "img2dataset",
    "Meltwater",
    "Seekr",
    "peer39_crawler",
    "Scrapy",
] 