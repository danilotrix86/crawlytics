"""
Crawlytics command line.

    python cli.py ingest access.log access.log.1.gz     import files
    python cli.py watch /var/log/nginx --pattern "*.gz"  import new files as they appear
    python cli.py enrich [--force]                       verify and locate existing rows

Uses the same database as the web app (DB_PATH, default backend/crawlytics.db).
"""
import argparse
import fnmatch
import json
import logging
import os
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
os.environ.setdefault("DB_PATH", str(BACKEND_DIR / "crawlytics.db"))
sys.path.insert(0, str(BACKEND_DIR))

from database import DBConnection  # noqa: E402  (needs DB_PATH set first)
from enrichment.settings import data_dir  # noqa: E402
from enrichment.store import enrich_existing  # noqa: E402
from processor.log_task import process_log_file  # noqa: E402

logger = logging.getLogger("crawlytics-cli")

DEFAULT_PATTERNS = ["*.log", "*.log.*", "*.gz", "*.txt", "*.json"]


def ingest_file(path: Path, activate: bool = True) -> dict:
    task_id = f"cli_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    result = process_log_file(str(path), task_id, path.name, save_to_db=True,
                              create_indexes=True, delete_after=False)
    stats = result.get("stats") or {}
    if result.get("status") == "error":
        print(f"  {path.name}: failed - {result.get('error')}")
    else:
        print(
            f"  {path.name}: {stats.get('log_format_label', '?')}, "
            f"{stats.get('total_lines', 0):,} lines, {result.get('records_imported', 0):,} crawler requests, "
            f"{stats.get('ai_referrals', 0):,} AI referrals"
        )
    return result


def cmd_ingest(args) -> int:
    failures = 0
    for name in args.files:
        path = Path(name)
        if not path.is_file():
            print(f"  {name}: not a file")
            failures += 1
            continue
        if ingest_file(path).get("status") == "error":
            failures += 1
    return 1 if failures else 0


def _load_state(state_file: Path) -> dict:
    try:
        return json.loads(state_file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def cmd_watch(args) -> int:
    folder = Path(args.folder).resolve()
    if not folder.is_dir():
        print(f"{folder} is not a folder")
        return 1
    patterns = args.pattern or DEFAULT_PATTERNS
    state_file = data_dir() / "watch_state.json"
    state = _load_state(state_file)
    print(f"Watching {folder} for {', '.join(patterns)} (Ctrl+C to stop)")
    print("Each file is imported once, after it has stopped changing. Point this at rotated logs.")

    while True:
        now = time.time()
        for path in sorted(folder.iterdir()):
            if not path.is_file() or not any(fnmatch.fnmatch(path.name, p) for p in patterns):
                continue
            stat = path.stat()
            signature = f"{stat.st_size}:{int(stat.st_mtime)}"
            key = str(path)
            if state.get(key) == signature or now - stat.st_mtime < args.settle:
                continue
            ingest_file(path)
            state[key] = signature
            state_file.parent.mkdir(parents=True, exist_ok=True)
            state_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
        if args.once:
            return 0
        time.sleep(args.interval)


def cmd_enrich(args) -> int:
    stats = enrich_existing(DBConnection, log_file_id=args.log_file_id, force=args.force)
    print(f"Checked {stats['pairs']:,} IP/crawler pairs, updated {stats['rows_updated']:,} rows")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="crawlytics", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-v", "--verbose", action="store_true", help="show detailed logs")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("ingest", help="import one or more log files")
    p.add_argument("files", nargs="+")
    p.set_defaults(func=cmd_ingest)

    p = sub.add_parser("watch", help="import new files that appear in a folder")
    p.add_argument("folder")
    p.add_argument("--pattern", action="append", help="file name pattern (repeatable)")
    p.add_argument("--interval", type=int, default=60, help="seconds between scans (default 60)")
    p.add_argument("--settle", type=int, default=30,
                   help="only import files unchanged for this many seconds (default 30)")
    p.add_argument("--once", action="store_true", help="scan once and exit (for cron)")
    p.set_defaults(func=cmd_watch)

    p = sub.add_parser("enrich", help="verify crawlers and look up countries for existing rows")
    p.add_argument("--log-file-id")
    p.add_argument("--force", action="store_true", help="re-check rows that already have a verdict")
    p.set_defaults(func=cmd_enrich)

    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING,
                        format="%(levelname)s %(name)s: %(message)s")
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
