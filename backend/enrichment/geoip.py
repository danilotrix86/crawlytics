"""
Offline IP -> country and IP -> network owner lookups.

Uses the free DB-IP Lite databases (CC BY 4.0, https://db-ip.com), downloaded
automatically and refreshed monthly. MaxMind GeoLite2 files dropped into the
same folder (GeoLite2-Country.mmdb, GeoLite2-ASN.mmdb) are used instead when present.
"""
import datetime
import gzip
import logging
import shutil
import threading
import time
import urllib.request
from pathlib import Path
from typing import Callable, Dict, Optional, Tuple

import maxminddb

from . import settings
from .ip_ranges import USER_AGENT

logger = logging.getLogger("geoip")

DBIP_URL = "https://download.db-ip.com/free/dbip-{kind}-lite-{month}.mmdb.gz"
REFRESH_AFTER_SECONDS = 35 * 24 * 3600

# kind -> (user-provided file names, downloaded file name)
FILES = {
    "country": (("GeoLite2-Country.mmdb", "GeoIP2-Country.mmdb"), "dbip-country-lite.mmdb"),
    "asn": (("GeoLite2-ASN.mmdb",), "dbip-asn-lite.mmdb"),
}


def _download_dbip(kind: str, dest: Path) -> None:
    """Download the latest monthly DB-IP Lite file (falling back one month early in the month)."""
    today = datetime.date.today()
    last_month = (today.replace(day=1) - datetime.timedelta(days=1))
    last_error = None
    for month in (today.strftime("%Y-%m"), last_month.strftime("%Y-%m")):
        url = DBIP_URL.format(kind=kind, month=month)
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            dest.parent.mkdir(parents=True, exist_ok=True)
            tmp = dest.with_suffix(".tmp")
            with urllib.request.urlopen(request, timeout=120) as response, \
                    gzip.GzipFile(fileobj=response) as unzipped, open(tmp, "wb") as out:
                shutil.copyfileobj(unzipped, out)
            maxminddb.open_database(str(tmp)).close()  # make sure it's a valid database
            tmp.replace(dest)
            logger.info(f"Downloaded {url}")
            return
        except Exception as e:
            last_error = e
            logger.warning(f"Could not download {url}: {e}")
    raise RuntimeError(f"GeoIP {kind} database unavailable: {last_error}")


class GeoIP:
    def __init__(self, directory: Optional[Path] = None,
                 downloader: Callable[[str, Path], None] = _download_dbip):
        self.directory = directory or settings.data_dir() / "geoip"
        self._downloader = downloader
        self._readers: Dict[str, Optional[maxminddb.Reader]] = {}
        self._lock = threading.Lock()

    def _path_for(self, kind: str) -> Optional[Path]:
        user_files, downloaded = FILES[kind]
        for name in user_files:
            path = self.directory / name
            if path.exists():
                return path
        path = self.directory / downloaded
        stale = not path.exists() or time.time() - path.stat().st_mtime > REFRESH_AFTER_SECONDS
        if stale and not settings.offline():
            try:
                self._downloader(kind, path)
            except Exception as e:
                logger.warning(str(e))
        return path if path.exists() else None

    def _reader(self, kind: str) -> Optional[maxminddb.Reader]:
        with self._lock:
            if kind not in self._readers:
                path = self._path_for(kind)
                self._readers[kind] = maxminddb.open_database(str(path)) if path else None
            return self._readers[kind]

    def available(self) -> Dict[str, bool]:
        return {kind: self._reader(kind) is not None for kind in FILES}

    def country(self, ip: str) -> Optional[str]:
        reader = self._reader("country")
        if not reader:
            return None
        try:
            record = reader.get(ip)
        except ValueError:
            return None
        if not record:
            return None
        country = record.get("country") or record.get("registered_country") or {}
        return country.get("iso_code")

    def network(self, ip: str) -> Tuple[Optional[int], Optional[str]]:
        reader = self._reader("asn")
        if not reader:
            return None, None
        try:
            record = reader.get(ip)
        except ValueError:
            return None, None
        if not record:
            return None, None
        return record.get("autonomous_system_number"), record.get("autonomous_system_organization")

    def close(self) -> None:
        with self._lock:
            for reader in self._readers.values():
                if reader:
                    reader.close()
            self._readers.clear()
