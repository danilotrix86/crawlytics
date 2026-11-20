"""Paths and switches shared by the enrichment modules."""
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    """Directory for downloaded data (IP ranges, GeoIP databases)."""
    env = os.environ.get("CRAWLYTICS_DATA_DIR")
    if env:
        return Path(env)
    db_path = os.environ.get("DB_PATH")
    if db_path:
        return Path(db_path).resolve().parent
    return BACKEND_DIR / "data"


def offline() -> bool:
    """When true, nothing is downloaded; only cached or user-provided files are used."""
    return os.environ.get("CRAWLYTICS_OFFLINE", "").lower() in ("1", "true", "yes")


def rdns_enabled() -> bool:
    """Reverse DNS checks are slower; they can be turned off."""
    return os.environ.get("CRAWLYTICS_RDNS", "1").lower() not in ("0", "false", "no")
