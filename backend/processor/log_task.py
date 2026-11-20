import hashlib
import logging
import os
import tempfile
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

from fastapi import UploadFile

from parser import LogProcessor
from enrichment.store import get_enricher
from database.db import DBConnection
from database.writer import LogWriter
from database.init_db import init_database, create_all_indexes

logger = logging.getLogger("log_task")

# Processing results for status polling. Kept in memory, so the server must run
# with a single worker process.
processing_results: Dict[str, Dict[str, Any]] = {}

UPLOAD_COPY_CHUNK_BYTES = 1024 * 1024


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(UPLOAD_COPY_CHUNK_BYTES), b""):
            digest.update(block)
    return digest.hexdigest()


def find_imported_file(content_hash: str) -> Optional[Dict[str, Any]]:
    """The log file already imported with this content, if any."""
    with DBConnection() as conn:
        row = conn.execute(
            "SELECT log_file_id, file_name, upload_timestamp FROM log_files WHERE content_hash = ? LIMIT 1",
            (content_hash,),
        ).fetchone()
    return dict(row) if row else None


def process_log_file(file_path: str, task_id: str, file_name: str,
                     save_to_db: bool = True, create_indexes: bool = True,
                     delete_after: bool = True, content_hash: Optional[str] = None,
                     allow_duplicate: bool = False) -> Dict[str, Any]:
    """
    Process a log file and optionally save matches to the database.

    This is a regular (sync) function on purpose: FastAPI runs sync background
    tasks in a thread pool, so parsing a large file doesn't freeze the API.
    Files whose content was imported before are skipped unless allow_duplicate.
    """
    processing_results[task_id] = {
        "status": "processing",
        "file_name": file_name,
        "log_file_id": task_id,
        "records_imported": 0,
        "issues": [],
    }
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024) if os.path.exists(file_path) else 0

    try:
        content_hash = content_hash or file_sha256(file_path)
        existing = None if allow_duplicate else find_imported_file(content_hash)
        if existing:
            processing_results[task_id].update(
                status="duplicate",
                error=f"Already imported as {existing['file_name']}",
                duplicate_of=existing["log_file_id"],
                completed_at=datetime.now().isoformat(),
            )
            return processing_results[task_id]

        logger.info(f"Starting processing of file: {file_name} (Task ID: {task_id})")
        start_time = datetime.now()

        processor = LogProcessor(file_path)
        output = processor.process()
        results, referrals, stats = output.entries, output.referrals, output.stats

        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Processing completed in {processing_time:.2f} seconds (Task ID: {task_id})")

        processing_results[task_id] = {
            "status": "processing_complete",
            "file_name": file_name,
            "stats": stats,
            "processing_time": processing_time,
            "file_size_mb": file_size_mb,
            "matched_entries": len(results),
            "ai_referrals": len(referrals),
            "completed_at": datetime.now().isoformat(),
            "log_file_id": task_id,
            "records_imported": len(results),
            "issues": [],
        }

        if save_to_db and (results or referrals):
            enrich_start = datetime.now()
            try:
                get_enricher().enrich_entries(results)
                processing_results[task_id]["enrichment_time"] = (datetime.now() - enrich_start).total_seconds()
            except Exception as e:
                logger.exception(f"Enrichment failed, saving without it (Task ID: {task_id})")
                processing_results[task_id]["issues"].append(f"Country/verification lookup failed: {e}")

            db_start_time = datetime.now()

            if not init_database():
                logger.error(f"Failed to initialize database (Task ID: {task_id})")
                processing_results[task_id]["status"] = "db_init_failed"
                processing_results[task_id]["issues"].append("Database initialization failed")
                return processing_results[task_id]

            writer = LogWriter()
            if not writer.insert_log_file(task_id, file_name, set_as_active=True,
                                          stats={**stats, "content_hash": content_hash}):
                logger.error(f"Failed to create log file record (Task ID: {task_id})")
                processing_results[task_id]["issues"].append("Failed to create log file record")

            db_stats = writer.insert_logs(results, log_file_id=task_id)
            if referrals:
                db_stats["referrals_inserted"] = writer.insert_referrals(referrals, task_id)
            db_time = (datetime.now() - db_start_time).total_seconds()

            processing_results[task_id].update({
                "status": "complete",
                "db_stats": db_stats,
                "db_insertion_time": db_time,
                "records_imported": db_stats.get("rows_inserted", len(results)),
            })
            if db_stats.get("errors"):
                processing_results[task_id]["issues"].append(
                    f"{db_stats['errors']} rows could not be saved"
                )
            logger.info(f"Database insertion completed in {db_time:.2f} seconds (Task ID: {task_id})")

            if create_indexes:
                logger.info(f"Creating database indexes (Task ID: {task_id})")
                create_all_indexes()

    except Exception as e:
        logger.exception(f"Error processing file (Task ID: {task_id})")
        processing_results[task_id] = {
            "status": "error",
            "error": str(e),
            "completed_at": datetime.now().isoformat(),
            "log_file_id": task_id,
            "records_imported": 0,
            "issues": [str(e)],
            "file_size_mb": file_size_mb,
        }
    finally:
        if delete_after:
            try:
                os.unlink(file_path)
            except OSError as e:
                logger.warning(f"Failed to remove temporary file {file_path}: {e}")
    return processing_results[task_id]


async def save_uploaded_file(upload: UploadFile) -> Tuple[str, str]:
    """
    Stream an uploaded file to a temporary file on disk without loading it
    into memory. Returns (temporary file path, SHA-256 of the content).
    """
    suffix = os.path.splitext(upload.filename or "")[1]
    if suffix.lower() not in {".log", ".txt", ".gz", ".json", ""}:
        suffix = ".log"
    digest = hashlib.sha256()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        while True:
            chunk = await upload.read(UPLOAD_COPY_CHUNK_BYTES)
            if not chunk:
                break
            digest.update(chunk)
            temp_file.write(chunk)
        return temp_file.name, digest.hexdigest()


def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """Return the status of a processing task, or None if unknown."""
    return processing_results.get(task_id)
