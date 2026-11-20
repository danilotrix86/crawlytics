import json
import sqlite3

import pytest

from parser import DEFAULT_CRAWLER_PATTERNS, LogProcessor, detect_ai_referral, detect_format, make_parser
from conftest import SAMPLE_LINES

CADDY = json.dumps({
    "level": "info", "ts": 1763546400.5, "logger": "http.log.access", "msg": "handled request",
    "request": {"remote_ip": "20.1.2.3", "client_ip": "20.1.2.3", "proto": "HTTP/2.0", "method": "GET",
                "host": "example.com", "uri": "/docs?x=1",
                "headers": {"User-Agent": ["Mozilla/5.0 (compatible; GPTBot/1.2)"], "Referer": ["-"]}},
    "duration": 0.01, "size": 2048, "status": 200,
})
CADDY_HUMAN = json.dumps({
    "ts": 1763546460.0,
    "request": {"remote_ip": "8.8.4.4", "method": "GET", "uri": "/pricing",
                "headers": {"user-agent": ["Mozilla/5.0 Chrome/131"], "referer": ["https://chatgpt.com/"]}},
    "size": 100, "status": 200,
})

IIS = [
    "#Software: Microsoft Internet Information Services 10.0",
    "#Version: 1.0",
    "#Fields: date time s-ip cs-method cs-uri-stem cs-uri-query s-port cs-username c-ip cs(User-Agent) cs(Referer) sc-status sc-substatus sc-win32-status time-taken",
    "2026-11-19 10:00:00 10.0.0.1 GET /about q=1 443 - 20.1.2.3 Mozilla/5.0+(compatible;+ClaudeBot/1.0;++claudebot@anthropic.com) - 200 0 0 15",
]

CLOUDFRONT = [
    "#Version: 1.0",
    "#Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query",
    "\t".join(["2026-11-19", "10:00:00", "FRA56-C1", "5120", "20.1.2.3", "GET", "d1.cloudfront.net", "/pricing",
               "200", "-", "Mozilla/5.0%2520(compatible;%2520PerplexityBot/1.0)", "-"]),
    "\t".join(["2026-11-19", "10:05:00", "FRA56-C1", "900", "8.8.4.4", "GET", "d1.cloudfront.net", "/guide",
               "200", "https://www.perplexity.ai/search/abc", "Mozilla/5.0%20Chrome/131", "-"]),
]

ALB = (
    'https 2026-11-19T10:00:00.123456Z app/my-lb/50dc6c495c0c9188 20.1.2.3:2817 10.0.0.1:80 0.000 0.001 0.000 '
    '200 200 34 366 "GET https://example.com:443/blog?a=1 HTTP/1.1" "Mozilla/5.0 (compatible; GPTBot/1.2)" '
    'ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-2:123:targetgroup/t/1 '
    '"Root=1-58337262-36d228ad5d99923122bbe354" "example.com" "-" 0 2026-11-19T10:00:00.120000Z "forward" "-" "-" '
    '"10.0.0.1:80" "200" "-" "-"'
)


@pytest.mark.parametrize("lines, expected", [
    (SAMPLE_LINES, "apache"),
    ([SAMPLE_LINES[0] + " 0b9f0a3e-8e4b-4a8e-9a65-1d2f3c4b5a69"], "nginx"),
    ([CADDY], "caddy"),
    (IIS, "w3c"),
    (CLOUDFRONT, "w3c"),
    ([ALB], "alb"),
    (["hello world"], None),
])
def test_detect_format(lines, expected):
    found = detect_format(lines)
    assert (found.name if found else None) == expected


def test_combined_keeps_response_size():
    entry = make_parser("apache").parse_line(SAMPLE_LINES[0])
    assert entry["bytes"] == 2326


def test_caddy():
    entry = make_parser("caddy").parse_line(CADDY)
    assert entry["ip_address"] == "20.1.2.3"
    assert entry["path"] == "/docs?x=1"
    assert entry["user_agent"] == "Mozilla/5.0 (compatible; GPTBot/1.2)"
    assert entry["referer"] is None
    assert entry["bytes"] == 2048
    assert entry["time"].isoformat() == "2025-11-19T10:00:00+00:00"


def test_iis_decodes_plus_signs_and_joins_query():
    fmt = detect_format(IIS)
    parser = make_parser(fmt.name, fmt.fields)
    entry = parser.parse_line(IIS[-1])
    assert entry["user_agent"] == "Mozilla/5.0 (compatible; ClaudeBot/1.0;  claudebot@anthropic.com)"
    assert entry["path"] == "/about?q=1"
    assert entry["bytes"] is None


def test_cloudfront_url_decoding():
    fmt = detect_format(CLOUDFRONT)
    entry = make_parser(fmt.name, fmt.fields).parse_line(CLOUDFRONT[2])
    assert entry["user_agent"] == "Mozilla/5.0 (compatible; PerplexityBot/1.0)"
    assert entry["bytes"] == 5120


def test_alb():
    entry = make_parser("alb").parse_line(ALB)
    assert entry["ip_address"] == "20.1.2.3"
    assert entry["path"] == "/blog?a=1"
    assert entry["status"] == 200
    assert entry["bytes"] == 366


@pytest.mark.parametrize("referer, path, expected", [
    ("https://chatgpt.com/", "/", ("ChatGPT", "OpenAI", "chatgpt.com")),
    ("https://www.perplexity.ai/search/x", "/", ("Perplexity", "Perplexity", "perplexity.ai")),
    ("https://gemini.google.com/app", "/", ("Gemini", "Google", "gemini.google.com")),
    (None, "/post?utm_source=chatgpt.com", ("ChatGPT", "OpenAI", "chatgpt.com")),
    ("https://www.google.com/", "/", None),
    ("https://notchatgpt.com/", "/", None),
    ("not a url", "/", None),
    (None, None, None),
])
def test_ai_referrals(referer, path, expected):
    assert detect_ai_referral(referer, path) == expected


def test_processor_collects_referrals_and_counts(tmp_path):
    path = tmp_path / "caddy.json"
    path.write_text("\n".join([CADDY, CADDY_HUMAN]) + "\n")
    output = LogProcessor(path, num_processes=1, patterns=DEFAULT_CRAWLER_PATTERNS).process()
    assert [e["crawler_name"] for e in output.entries] == ["GPTBot"]
    assert output.referrals[0]["assistant"] == "ChatGPT"
    assert "ip_address" not in output.referrals[0]  # humans are stored without IP
    assert output.stats["parsed_lines"] == 2
    assert output.stats["log_format"] == "caddy"


def test_w3c_across_worker_chunks(tmp_path):
    path = tmp_path / "cf.log"
    path.write_text("\n".join(CLOUDFRONT * 3) + "\n")
    output = LogProcessor(path, num_processes=2, chunk_size=2, patterns=DEFAULT_CRAWLER_PATTERNS).process()
    assert len(output.entries) == 3
    assert len(output.referrals) == 3


# --- CLI ----------------------------------------------------------------------

def test_cli_ingest_and_watch(tmp_path, capsys):
    import cli
    log = tmp_path / "logs" / "access.log"
    log.parent.mkdir()
    log.write_text("\n".join(SAMPLE_LINES) + "\n")

    assert cli.main(["ingest", str(log)]) == 0
    assert "3 crawler requests" in capsys.readouterr().out
    assert log.exists()  # the CLI never deletes the user's file

    # Same content again: skipped as a duplicate
    assert cli.main(["ingest", str(log)]) == 0
    assert "skipped - Already imported" in capsys.readouterr().out

    other = log.parent / "access.log.1"
    other.write_text(SAMPLE_LINES[0] + "\n")
    assert cli.main(["watch", str(log.parent), "--once", "--settle", "0"]) == 0
    first = capsys.readouterr().out
    assert "access.log.1: Apache/Nginx combined" in first
    assert cli.main(["watch", str(log.parent), "--once", "--settle", "0"]) == 0
    assert "access.log" not in capsys.readouterr().out  # nothing changed, nothing re-read

    assert cli.main(["ingest", str(tmp_path / "missing.log")]) == 1

    # Clean up so other tests can import the same sample content
    from database import DBConnection, delete_log_file_data
    import asyncio
    with DBConnection() as conn:
        ids = [r[0] for r in conn.execute("SELECT log_file_id FROM log_files WHERE log_file_id LIKE 'cli_%'")]
    for log_file_id in ids:
        asyncio.run(delete_log_file_data(log_file_id))
