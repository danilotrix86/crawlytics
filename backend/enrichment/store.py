"""Database side of enrichment: crawler_info sync and backfilling existing rows."""
import logging
import threading
from typing import Callable, Dict, Optional

from .enricher import Enricher
from .taxonomy import all_crawlers

logger = logging.getLogger("enrichment_store")

_enricher: Optional[Enricher] = None
_enricher_lock = threading.Lock()


def get_enricher() -> Enricher:
    """Shared enricher, so range lists and GeoIP readers are loaded once."""
    global _enricher
    with _enricher_lock:
        if _enricher is None:
            _enricher = Enricher()
        return _enricher


def sync_crawler_info(conn) -> None:
    """Replace the crawler_info table with the contents of crawlers.json."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM crawler_info")
    cursor.executemany(
        "INSERT INTO crawler_info (crawler_name, operator, category, description, docs_url) VALUES (?, ?, ?, ?, ?)",
        [(c.name, c.operator, c.category, c.description, c.docs_url) for c in all_crawlers()],
    )


def pending_count(conn, log_file_id: Optional[str] = None) -> int:
    """Rows that haven't been enriched yet."""
    query = "SELECT COUNT(*) FROM access_logs WHERE verification IS NULL"
    params = []
    if log_file_id:
        query += " AND log_file_id = ?"
        params.append(log_file_id)
    return conn.execute(query, params).fetchone()[0]


def enrich_existing(connection_factory, log_file_id: Optional[str] = None, force: bool = False,
                    enricher: Optional[Enricher] = None,
                    progress: Callable[[Dict], None] = lambda _: None) -> Dict[str, int]:
    """
    Enrich rows already in the database, one (ip, crawler) pair at a time.

    Args:
        connection_factory: context manager returning a DB connection in a transaction
        log_file_id: limit to one log file
        force: re-check rows that already have a verdict
    """
    enricher = enricher or get_enricher()
    conditions, params = [], []
    if not force:
        conditions.append("verification IS NULL")
    if log_file_id:
        conditions.append("log_file_id = ?")
        params.append(log_file_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with connection_factory() as conn:
        pairs = [tuple(row) for row in conn.execute(
            f"SELECT DISTINCT ip_address, crawler_name FROM access_logs {where}", params
        ).fetchall()]

    progress({"pairs_total": len(pairs), "pairs_done": 0})
    results = enricher.enrich_pairs(pairs)

    update = (
        "UPDATE access_logs SET country_code = ?, asn = ?, as_org = ?, verification = ? "
        "WHERE ip_address = ? AND crawler_name IS ?"
    )
    if log_file_id:
        update += " AND log_file_id = ?"

    rows = []
    for (ip, crawler), r in results.items():
        row = [r.country_code, r.asn, r.as_org, r.verification, ip, crawler]
        if log_file_id:
            row.append(log_file_id)
        rows.append(row)

    updated = 0
    batch = 500
    for i in range(0, len(rows), batch):
        with connection_factory() as conn:
            cursor = conn.cursor()
            cursor.executemany(update, rows[i:i + batch])
            updated += cursor.rowcount
        progress({"pairs_total": len(pairs), "pairs_done": min(i + batch, len(rows))})

    return {"pairs": len(pairs), "rows_updated": updated}
