import gzip

import pytest

from parser import CrawlerMatcher, LogProcessor, ApacheParser, NginxParser, DEFAULT_CRAWLER_PATTERNS
from parser.crawler_patterns import normalize_patterns
from conftest import SAMPLE_LINES


def test_apache_parser_extracts_fields():
    entry = ApacheParser().parse_line(SAMPLE_LINES[0])
    assert entry["ip_address"] == "1.2.3.4"
    assert entry["method"] == "GET"
    assert entry["path"] == "/docs/intro"
    assert entry["status"] == 200
    assert entry["time"].isoformat() == "2024-10-10T13:55:36+00:00"
    assert entry["referer"] is None


def test_parser_rejects_garbage():
    assert ApacheParser().parse_line("not a log line") is None
    assert NginxParser().parse_line("") is None


def test_request_id_is_taken_from_query_string():
    entry = ApacheParser().parse_line(SAMPLE_LINES[3])
    assert str(entry["request_id"]) == "0b9f0a3e-8e4b-4a8e-9a65-1d2f3c4b5a69"


@pytest.mark.parametrize("user_agent, expected", [
    ("Mozilla/5.0 (compatible; GPTBot/1.2)", "GPTBot"),
    ("mozilla/5.0 gptbot/1.2", "GPTBot"),  # case-insensitive, canonical spelling returned
    ("Mozilla/5.0 Applebot-Extended/0.1", "Applebot-Extended"),  # longest match wins
    ("Mozilla/5.0 (compatible; Applebot/0.1)", "Applebot"),
    ("Mozilla/5.0 Chrome/124.0 Safari/537.36", None),
    ("", None),
    (None, None),
])
def test_matcher(user_agent, expected):
    assert CrawlerMatcher(DEFAULT_CRAWLER_PATTERNS).match(user_agent) == expected


def test_matcher_treats_patterns_as_literals():
    matcher = CrawlerMatcher(["Bot.*", "a+b"])
    assert matcher.match("SomeBot/1.0") is None
    assert matcher.match("x a+b y") == "a+b"


def test_normalize_patterns_dedupes_and_validates():
    assert normalize_patterns([" GPTBot ", "gptbot", "", "ClaudeBot"]) == ["GPTBot", "ClaudeBot"]
    with pytest.raises(ValueError):
        normalize_patterns([123])
    with pytest.raises(ValueError):
        normalize_patterns(["x" * 101])
    with pytest.raises(ValueError):
        normalize_patterns(["bad\nline"])


def test_processor_keeps_only_crawlers(sample_log):
    results, stats = LogProcessor(sample_log, num_processes=1, patterns=DEFAULT_CRAWLER_PATTERNS).process()
    assert [r["crawler_name"] for r in results] == ["GPTBot", "Applebot-Extended", "ClaudeBot"]
    assert stats["total_lines"] == 5
    assert stats["llm_matches"] == 3


def test_processor_reads_gzip(tmp_path):
    path = tmp_path / "access.log.gz"
    with gzip.open(path, "wt", encoding="utf-8") as f:
        f.write("\n".join(SAMPLE_LINES))
    results, _ = LogProcessor(path, num_processes=1, patterns=DEFAULT_CRAWLER_PATTERNS).process()
    assert len(results) == 3


def test_processor_with_worker_pool(sample_log):
    results, _ = LogProcessor(sample_log, num_processes=2, chunk_size=2,
                              patterns=DEFAULT_CRAWLER_PATTERNS).process()
    assert [r["crawler_name"] for r in results] == ["GPTBot", "Applebot-Extended", "ClaudeBot"]


def test_processor_rejects_unknown_format(tmp_path):
    path = tmp_path / "junk.log"
    path.write_text("hello\nworld\n")
    with pytest.raises(ValueError):
        LogProcessor(path, num_processes=1).process()
