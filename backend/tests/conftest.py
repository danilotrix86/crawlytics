import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Point the app at a throwaway database and pattern file *before* it's imported,
# because the database module initialises its schema at import time.
_tmp = Path(tempfile.mkdtemp(prefix="crawlytics-tests-"))
os.environ["DB_PATH"] = str(_tmp / "test.db")
os.environ["CRAWLYTICS_PATTERNS_PATH"] = str(_tmp / "crawler_patterns.json")
os.environ["CRAWLYTICS_OFFLINE"] = "1"  # tests never download range lists or GeoIP data
os.environ["CRAWLYTICS_RDNS"] = "0"

SAMPLE_LINES = [
    '1.2.3.4 - - [10/Oct/2024:13:55:36 +0000] "GET /docs/intro HTTP/1.1" 200 2326 "-" '
    '"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)"',
    '5.6.7.8 - - [10/Oct/2024:14:01:02 +0000] "GET /pricing HTTP/1.1" 404 512 "-" '
    '"Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Applebot-Extended/0.1"',
    '9.9.9.9 - - [10/Oct/2024:14:05:00 +0000] "GET / HTTP/1.1" 200 1000 "https://example.com/" '
    '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"',
    '10.0.0.1 - - [11/Oct/2024:09:00:00 +0200] "POST /api/search?request_id=0b9f0a3e-8e4b-4a8e-9a65-1d2f3c4b5a69 HTTP/2.0" 500 0 "-" '
    '"Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"',
    'this line is not a log entry',
]


@pytest.fixture
def sample_log(tmp_path):
    path = tmp_path / "access.log"
    path.write_text("\n".join(SAMPLE_LINES) + "\n", encoding="utf-8")
    return path


@pytest.fixture
def patterns_file():
    path = Path(os.environ["CRAWLYTICS_PATTERNS_PATH"])
    if path.exists():
        path.unlink()
    yield path
    if path.exists():
        path.unlink()
