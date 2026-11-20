"""
Generates a realistic, deterministic demo access log for a fictional SaaS
site, so Crawlytics can be tried without real logs.

Crawler IPs come from the ranges operators published in late 2026, so they
verify as genuine; a few bots with faked user agents come from hosting
networks and show up as suspicious. Human visits include referrals from AI
assistants.
"""
import ipaddress
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Tuple

DEMO_FILE_NAME = "demo-site-access.log"

DEMO_ROBOTS_TXT = """# Demo robots.txt for crawlytics-demo.example
User-agent: Bytespider
Disallow: /

User-agent: *
Disallow: /admin/
Disallow: /search
Disallow: /*.json$
Allow: /

Sitemap: https://crawlytics-demo.example/sitemap.xml
"""

PAGES = (
    ["/", "/pricing", "/features", "/about", "/contact", "/changelog", "/integrations"]
    + [f"/blog/{slug}" for slug in (
        "ai-crawlers-explained", "robots-txt-for-llms", "server-log-analysis-101", "llms-txt-guide",
        "how-chatgpt-finds-your-content", "rate-limiting-bots", "seo-in-the-age-of-ai")]
    + [f"/docs/{slug}" for slug in (
        "getting-started", "installation", "api/authentication", "api/endpoints", "configuration",
        "webhooks", "faq", "troubleshooting")]
)
SPECIAL = ["/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"]
BLOCKED = ["/admin/login", "/search?q=pricing", "/api/status.json"]
PROBES = ["/wp-login.php", "/.env", "/xmlrpc.php", "/.git/config", "/admin/config.php"]


def _ip(cidr: str, rng: random.Random) -> str:
    """A host address inside a CIDR block."""
    net = ipaddress.ip_network(cidr)
    if net.num_addresses <= 2:
        return str(net.network_address)
    return str(net.network_address + rng.randint(1, min(net.num_addresses - 2, 40)))


# (user agent, IP blocks, requests per day, path mix weights: pages/special/blocked)
CRAWLERS: List[Tuple[str, List[str], int, Tuple[float, float, float]]] = [
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.3; +https://openai.com/gptbot)",
     ["132.196.86.0/24"], 22, (0.8, 0.1, 0.0)),
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
     ["104.210.139.192/28"], 30, (0.95, 0.05, 0.0)),
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot",
     ["104.210.140.128/28"], 14, (0.9, 0.1, 0.0)),
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
     ["216.73.216.0/22"], 18, (0.85, 0.1, 0.0)),
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
     ["216.73.216.0/22"], 6, (1.0, 0.0, 0.0)),
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
     ["18.210.92.235/32", "107.20.236.150/32"], 9, (0.9, 0.1, 0.0)),
    ("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
     ["192.178.4.0/27"], 35, (0.85, 0.1, 0.0)),
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
     ["17.241.208.160/27"], 5, (0.9, 0.1, 0.0)),
    ("CCBot/2.0 (https://commoncrawl.org/faq/)", ["3.41.188.32/29"], 4, (0.9, 0.0, 0.0)),
    ("meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
     ["69.63.184.0/24"], 10, (0.9, 0.1, 0.0)),
    ("Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
     ["47.128.0.0/16"], 8, (0.7, 0.0, 0.3)),
    ("Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", ["5.39.1.224/27"], 12, (0.95, 0.05, 0.0)),
]

# Bots faking well-known user agents from hosting networks. In the demo only these
# and Bytespider fetch pages robots.txt blocks; the named crawlers follow the rules.
SPOOFED = [
    ("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
     "45.155.205.0/24"),
    ("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "185.220.101.0/24"),
]

HUMAN_UAS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
]
AI_REFERRERS = [
    ("https://chatgpt.com/", 40), ("https://www.perplexity.ai/search/abc", 16), ("https://gemini.google.com/", 8),
    ("https://claude.ai/", 7), ("https://copilot.microsoft.com/", 5), ("https://chat.mistral.ai/", 2),
]
OTHER_REFERRERS = [("-", 50), ("https://www.google.com/", 60), ("https://news.ycombinator.com/", 6),
                   ("https://www.bing.com/", 8), ("https://github.com/", 5)]


def _weighted(rng: random.Random, items):
    values, weights = zip(*items)
    return rng.choices(values, weights=weights, k=1)[0]


def _line(ip: str, when: datetime, method: str, path: str, status: int, size: int, referer: str, ua: str) -> str:
    stamp = when.strftime("%d/%b/%Y:%H:%M:%S +0000")
    return f'{ip} - - [{stamp}] "{method} {path} HTTP/1.1" {status} {size} "{referer}" "{ua}"'


def generate_lines(days: int = 30, seed: int = 42, end: datetime = None) -> List[str]:
    rng = random.Random(seed)
    end = (end or datetime.now(timezone.utc)).replace(minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)
    events: List[Tuple[datetime, str]] = []

    def at(day: int, night_owl: bool = False) -> datetime:
        hour = rng.randint(0, 23) if night_owl else int(min(23, max(0, rng.gauss(14, 4))))
        return start + timedelta(days=day, hours=hour, minutes=rng.randint(0, 59), seconds=rng.randint(0, 59))

    for day in range(days):
        growth = 0.6 + 0.8 * day / days  # AI crawling grows over the month
        for ua, prefixes, per_day, (w_pages, w_special, w_blocked) in CRAWLERS:
            for _ in range(max(1, int(rng.gauss(per_day * growth, per_day * 0.2)))):
                kind = rng.choices(["page", "special", "blocked"], [w_pages, w_special, w_blocked])[0]
                path = rng.choice(PAGES if kind == "page" else SPECIAL if kind == "special" else BLOCKED)
                status = 200 if rng.random() > 0.04 else rng.choice([301, 404, 500])
                if path.startswith("/admin"):
                    status = 403
                size = 0 if status in (301, 403) else rng.randint(4_000, 120_000)
                if path.startswith("/llms-full"):
                    size = rng.randint(400_000, 900_000)
                when = at(day, night_owl=True)
                events.append((when, _line(_ip(rng.choice(prefixes), rng), when, "GET", path, status, size, "-", ua)))
        for ua, prefix in SPOOFED:
            for _ in range(rng.randint(0, 4)):
                path = rng.choice(PROBES + PAGES[:3])
                status = 404 if path in PROBES else 200
                when = at(day, True)
                events.append((when, _line(_ip(prefix, rng), when, "GET", path, status, 150 if status == 404 else 9_000, "-", ua)))
        for _ in range(int(rng.gauss(70, 10) * growth)):
            ai = rng.random() < 0.18 + 0.12 * day / days
            referer = _weighted(rng, AI_REFERRERS) if ai else _weighted(rng, OTHER_REFERRERS)
            path = rng.choice(PAGES)
            if ai and referer.startswith("https://chatgpt.com") and rng.random() < 0.5:
                path, referer = f"{path}?utm_source=chatgpt.com", "-"
            when = at(day)
            ip = f"{rng.randint(11, 220)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"
            events.append((when, _line(ip, when, "GET", path, 200, rng.randint(8_000, 60_000), referer,
                                       rng.choice(HUMAN_UAS))))

    events.sort(key=lambda e: e[0])
    return [line for _, line in events]


def write_demo_log(path: Path, **kwargs) -> Path:
    path.write_text("\n".join(generate_lines(**kwargs)) + "\n", encoding="utf-8")
    return path
