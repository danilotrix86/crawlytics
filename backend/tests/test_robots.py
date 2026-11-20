import io

import pytest
from fastapi.testclient import TestClient

from robots import RobotsTxt, audit, generate
from robots import store

ROBOTS = """
# comment
User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: *
Disallow: /private/
Allow: /private/public-page
Disallow: /*.php$
Crawl-delay: 5

User-agent: gptbot
Allow: /blog/

Sitemap: https://example.com/sitemap.xml
"""


@pytest.mark.parametrize("rules, path, allowed", [
    # Examples from Google's robots.txt specification
    ("Disallow: /fish", "/fish", False),
    ("Disallow: /fish", "/fish.html", False),
    ("Disallow: /fish", "/fishheads/yummy.html", False),
    ("Disallow: /fish", "/Fish.asp", True),  # paths are case-sensitive
    ("Disallow: /fish", "/catfish", True),
    ("Disallow: /*.php$", "/folder/filename.php", False),
    ("Disallow: /*.php$", "/filename.php?parameters", True),
    ("Disallow: /*.php$", "/filename.php/", True),
    ("Allow: /p\nDisallow: /", "/page", True),  # longest rule wins
    ("Allow: /folder\nDisallow: /folder", "/folder/page", True),  # Allow wins ties
    ("Allow: /page\nDisallow: /*.htm", "/page.htm", False),
    ("Allow: /$\nDisallow: /", "/", True),
    ("Allow: /$\nDisallow: /", "/page.htm", False),
    ("Disallow:", "/anything", True),  # empty Disallow allows everything
    ("Disallow: /", "/robots.txt", True),  # robots.txt itself is always allowed
])
def test_rule_matching(rules, path, allowed):
    assert RobotsTxt(f"User-agent: *\n{rules}").is_allowed("AnyBot", path) is allowed


def test_groups():
    robots = RobotsTxt(ROBOTS)
    # Named groups for the same agent are merged, case-insensitively
    assert robots.is_allowed("GPTBot", "/blog/post") is True
    assert robots.is_allowed("GPTBot", "/about") is False
    assert robots.is_allowed("CCBot", "/blog/post") is False
    # Everyone else uses the * group
    assert robots.group_for("ClaudeBot")[0] == "*"
    assert robots.is_allowed("ClaudeBot", "/private/x") is False
    assert robots.is_allowed("ClaudeBot", "/private/public-page") is True
    assert robots.is_allowed("ClaudeBot", "/index.php") is False
    assert robots.sitemaps == ["https://example.com/sitemap.xml"]
    assert robots.groups[1].crawl_delay == 5


def test_no_matching_group_allows_everything():
    robots = RobotsTxt("User-agent: GPTBot\nDisallow: /")
    assert robots.group_for("ClaudeBot") == (None, [])
    assert robots.is_allowed("ClaudeBot", "/x") is True


def test_audit_counts_violations_by_verification():
    rows = [
        ("GPTBot", "/about", "verified", 5),
        ("GPTBot", "/about", "suspicious", 2),
        ("GPTBot", "/robots.txt", "verified", 1),
        ("GPTBot", "/blog/a", "verified", 3),
        ("ClaudeBot", "/private/x", "verified", 4),
        ("ClaudeBot", "/", "verified", 10),
        ("ChatGPT-User", "/private/y", "verified", 6),  # user-triggered
        ("Bytespider", "/", "unknown", 1),
    ]
    result = audit(ROBOTS, rows)
    by_name = {c["crawler_name"]: c for c in result["crawlers"]}

    gpt = by_name["GPTBot"]
    assert (gpt["requests"], gpt["blocked_requests"], gpt["blocked_verified"], gpt["blocked_suspicious"]) == (11, 7, 5, 2)
    assert gpt["robots_txt_requests"] == 1
    assert gpt["violation"] is True
    assert gpt["top_blocked_paths"] == [{"path": "/about", "requests": 7}]

    chatgpt_user = by_name["ChatGPT-User"]
    assert chatgpt_user["blocked_requests"] == 6
    assert chatgpt_user["bound_by_robots"] is False
    assert chatgpt_user["violation"] is False

    assert by_name["Bytespider"]["blocked_requests"] == 0
    summary = result["summary"]
    assert summary["violating_crawlers"] == 2
    assert summary["verified_violations"] == 9
    assert summary["spoofed_blocked"] == 2


def test_generate():
    out = generate(["training"])
    text = out["robots_txt"]
    assert "User-agent: GPTBot" in text
    assert "User-agent: Google-Extended" in text
    assert "User-agent: OAI-SearchBot" not in text  # AI search isn't blocked
    assert "Meta AI" not in text  # not a real token
    robots = RobotsTxt(text)
    assert robots.is_allowed("GPTBot", "/") is False
    assert robots.is_allowed("OAI-SearchBot", "/") is True
    assert 'GPTBot' in out["nginx"] and "return 403" in out["nginx"]
    with pytest.raises(ValueError):
        generate(["nope"])


def test_robots_url():
    assert store.robots_url("example.com") == "https://example.com/robots.txt"
    assert store.robots_url("http://example.com/some/page?x=1") == "http://example.com/robots.txt"
    with pytest.raises(ValueError):
        store.robots_url("ftp://example.com")


def test_fetch_uses_robots_url():
    seen = []

    class Response(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def opener(request):
        seen.append(request.full_url)
        return Response(b"User-agent: *\nDisallow: /x\n")

    saved = store.fetch("example.com/blog", opener=opener)
    assert seen == ["https://example.com/robots.txt"]
    assert saved["content"].startswith("User-agent: *")
    assert saved["source_url"] == "https://example.com/robots.txt"


def test_api_flow():
    from app import app
    from conftest import SAMPLE_LINES
    client = TestClient(app)

    assert client.put("/api/robots", json={"content": "User-agent: GPTBot\nDisallow: /docs/\n"}).status_code == 200
    assert client.get("/api/robots").json()["content"].startswith("User-agent: GPTBot")

    body = ("\n".join(SAMPLE_LINES) + "\n").encode()
    task_id = client.post("/api/import-log", files={"log_file": ("r.log", body, "text/plain")}).json()["log_file_id"]
    result = client.get(f"/api/robots/audit?log_file_id={task_id}").json()
    gpt = next(c for c in result["crawlers"] if c["crawler_name"] == "GPTBot")
    assert gpt["blocked_requests"] == 1
    assert gpt["top_blocked_paths"][0]["path"] == "/docs/intro"

    generated = client.post("/api/robots/generate", json={"block": ["training", "seo"]}).json()
    assert "User-agent: AhrefsBot" in generated["robots_txt"]
    assert client.post("/api/robots/generate", json={"block": ["bogus"]}).status_code == 422
    client.delete(f"/api/logs/{task_id}")
