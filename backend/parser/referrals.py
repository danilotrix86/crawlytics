"""
Detects human visits that arrive from an AI assistant, using the Referer
header or the utm_source tag some assistants add to links (ChatGPT adds
utm_source=chatgpt.com).
"""
from typing import Optional, Tuple
from urllib.parse import parse_qs, urlsplit

# host -> (assistant, operator). Operators match crawler_info.operator so
# referrals can be compared with crawling by the same company.
AI_SOURCES = {
    "chatgpt.com": ("ChatGPT", "OpenAI"),
    "chat.openai.com": ("ChatGPT", "OpenAI"),
    "perplexity.ai": ("Perplexity", "Perplexity"),
    "claude.ai": ("Claude", "Anthropic"),
    "gemini.google.com": ("Gemini", "Google"),
    "bard.google.com": ("Gemini", "Google"),
    "aistudio.google.com": ("Gemini", "Google"),
    "copilot.microsoft.com": ("Copilot", "Microsoft"),
    "copilot.cloud.microsoft": ("Copilot", "Microsoft"),
    "chat.mistral.ai": ("Le Chat", "Mistral AI"),
    "chat.deepseek.com": ("DeepSeek", "DeepSeek"),
    "meta.ai": ("Meta AI", "Meta"),
    "grok.com": ("Grok", "xAI"),
    "you.com": ("You.com", "You.com"),
    "phind.com": ("Phind", "Phind"),
    "poe.com": ("Poe", "Quora"),
    "kimi.com": ("Kimi", "Moonshot AI"),
    "chat.qwen.ai": ("Qwen", "Alibaba"),
}


def _lookup(host: str) -> Optional[Tuple[str, str, str]]:
    host = host.lower().split(":")[0].strip(".")
    if host.startswith("www."):
        host = host[4:]
    while host:
        if host in AI_SOURCES:
            assistant, operator = AI_SOURCES[host]
            return assistant, operator, host
        if "." not in host:
            return None
        host = host.split(".", 1)[1]  # try the parent domain
        if host.count(".") == 0:
            return None
    return None


def detect_ai_referral(referer: Optional[str], path: Optional[str]) -> Optional[Tuple[str, str, str]]:
    """Return (assistant, operator, source host) when a request came from an AI assistant."""
    if referer:
        try:
            host = urlsplit(referer if "//" in referer else f"//{referer}").hostname
        except ValueError:
            host = None
        if host:
            found = _lookup(host)
            if found:
                return found
    if path and "utm_source=" in path:
        query = urlsplit(path).query
        for source in parse_qs(query).get("utm_source", []):
            found = _lookup(source)
            if found:
                return found
    return None
