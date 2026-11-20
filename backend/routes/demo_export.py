import csv
import io
import logging
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterator, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse

from database import Database
from demo import DEMO_FILE_NAME, DEMO_ROBOTS_TXT, write_demo_log
from processor.log_task import process_log_file
from robots import store as robots_store

logger = logging.getLogger("demo_export_routes")

router = APIRouter(tags=["demo", "export"])

EXPORTS = {
    "requests": (
        "SELECT a.time, a.ip_address, a.method, a.path, a.status, a.bytes, a.crawler_name, "
        "ci.operator, ci.category, a.verification, a.country_code, a.asn, a.as_org, a.referer, a.user_agent "
        "FROM access_logs a LEFT JOIN crawler_info ci ON ci.crawler_name = a.crawler_name",
        "a.log_file_id",
        "a.time",
    ),
    "referrals": (
        "SELECT time, assistant, operator, referrer_host, path, status, bytes FROM ai_referrals",
        "log_file_id",
        "time",
    ),
}


@router.post("/demo", status_code=status.HTTP_202_ACCEPTED, summary="Import a generated demo log")
def load_demo(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """Generate 30 days of realistic traffic for a fictional site and import it."""
    task_id = f"demo_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    fd, name = tempfile.mkstemp(suffix=".log")
    os.close(fd)  # write_demo_log reopens it; an open handle would block deletion on Windows
    temp_path = Path(name)
    write_demo_log(temp_path)
    if robots_store.load()["content"] is None:
        robots_store.save(DEMO_ROBOTS_TXT, source_url="https://crawlytics-demo.example/robots.txt")
    background_tasks.add_task(process_log_file, str(temp_path), task_id, DEMO_FILE_NAME)
    return {"log_file_id": task_id, "records_imported": 0, "issues": [], "file_size_mb": 0}


def _csv_rows(query: str, params: list) -> Iterator[str]:
    conn = Database().get_readonly_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(query, params)
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow([d[0] for d in cursor.description])
        while True:
            rows = cursor.fetchmany(1000)
            if not rows:
                break
            writer.writerows(rows)
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
        if buffer.getvalue():
            yield buffer.getvalue()
    finally:
        cursor.close()


@router.get("/export/{dataset}.csv", summary="Download data as CSV")
def export_csv(dataset: str, log_file_id: Optional[str] = None) -> StreamingResponse:
    if dataset not in EXPORTS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown dataset {dataset}")
    query, file_column, order_column = EXPORTS[dataset]
    params: list = []
    if log_file_id:
        query += f" WHERE {file_column} = ?"
        params.append(log_file_id)
    query += f" ORDER BY {order_column}"
    filename = f"crawlytics-{dataset}-{datetime.now().strftime('%Y%m%d')}.csv"
    # The first chunk is produced before the response starts, so query errors become a 500
    rows = _csv_rows(query, params)
    first = next(rows, "")

    def body():
        yield first
        yield from rows

    return StreamingResponse(body(), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})
