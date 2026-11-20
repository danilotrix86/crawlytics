import logging
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

from database import DBConnection
from enrichment import CATEGORIES
from enrichment.store import enrich_existing, get_enricher, pending_count
from processor.log_task import processing_results

logger = logging.getLogger("enrichment_routes")

router = APIRouter(tags=["enrichment"])

_run_lock = threading.Lock()


class EnrichRequest(BaseModel):
    log_file_id: Optional[str] = None
    force: bool = False


@router.get("/enrichment/status", summary="Enrichment data sources and pending rows")
def enrichment_status(log_file_id: Optional[str] = None) -> Dict[str, Any]:
    with DBConnection() as conn:
        pending = pending_count(conn, log_file_id)
    enricher = get_enricher()
    return {
        "pending_rows": pending,
        "geoip": enricher.geoip.available(),
        "ip_range_sources": enricher.ranges.status(),
        "rdns_enabled": enricher.use_rdns,
        "categories": CATEGORIES,
    }


def _run(task_id: str, log_file_id: Optional[str], force: bool) -> None:
    if not _run_lock.acquire(blocking=False):
        processing_results[task_id].update(status="error", error="Another enrichment run is in progress")
        return
    try:
        stats = enrich_existing(
            DBConnection, log_file_id=log_file_id, force=force,
            progress=lambda p: processing_results[task_id].update(p),
        )
        processing_results[task_id].update(status="complete", completed_at=datetime.now().isoformat(), **stats)
    except Exception as e:
        logger.exception("Enrichment run failed")
        processing_results[task_id].update(status="error", error=str(e))
    finally:
        _run_lock.release()


@router.post("/enrichment/run", status_code=status.HTTP_202_ACCEPTED,
             summary="Add country, network and verification data to existing rows")
def run_enrichment(body: EnrichRequest, background_tasks: BackgroundTasks) -> Dict[str, Any]:
    if _run_lock.locked():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Enrichment is already running")
    task_id = f"enrich_{uuid.uuid4().hex[:12]}"
    processing_results[task_id] = {"status": "processing", "task_id": task_id}
    background_tasks.add_task(_run, task_id, body.log_file_id, body.force)
    return {"task_id": task_id, "status": "processing"}
