import os
import logging
import tempfile
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

from parser.log_processor import LogProcessor
from database.writer import LogWriter
from database.init_db import init_database, create_all_indexes

# Configure logging
logger = logging.getLogger("log_task")

# Store processing results for retrieval
processing_results = {}


async def process_log_file(file_path: str, task_id: str, file_name: str, 
                           save_to_db: bool = True, create_indexes: bool = True) -> None:
    """
    Process a log file in the background and optionally save to database
    
    Args:
        file_path: Path to the log file
        task_id: Unique task ID
        file_name: Original file name
        save_to_db: Whether to save results to database
        create_indexes: Whether to create indexes after saving
    """
    try:
        logger.info(f"Starting processing of file: {file_name} (Task ID: {task_id})")
        start_time = datetime.now()
        
        # Process the log file
        processor = LogProcessor(file_path)
        results, stats = processor.process()
        
        processing_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Processing completed in {processing_time:.2f} seconds (Task ID: {task_id})")
        
        # Prepare issues list
        issues = []
        if "errors" in stats:
            issues = [str(err) for err in stats.get("errors", [])]
        
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        records_imported = len(results)
        
        # Store results and stats
        processing_results[task_id] = {
            "status": "processing_complete",
            "file_name": file_name,
            "stats": stats,
            "processing_time": processing_time,
            "file_size_mb": file_size_mb,
            "matched_entries": len(results),
            "completed_at": datetime.now().isoformat(),
            # Add frontend-expected fields
            "log_file_id": task_id,
            "records_imported": records_imported,
            "issues": issues
        }
        
        # Save to database if requested
        if save_to_db and results:
            db_start_time = datetime.now()
            
            # Initialize database if needed
            if not init_database():
                logger.error(f"Failed to initialize database (Task ID: {task_id})")
                processing_results[task_id]["status"] = "db_init_failed"
                processing_results[task_id]["issues"].append("Database initialization failed")
                return
            
            # Insert log file record first
            writer = LogWriter()
            if writer.insert_log_file(task_id, file_name, set_as_active=True):
                logger.info(f"Log file record created with ID: {task_id} and set as active")
            else:
                logger.error(f"Failed to create log file record (Task ID: {task_id})")
                processing_results[task_id]["issues"].append("Failed to create log file record")
                
            # Insert logs with log_file_id reference
            db_stats = writer.insert_logs(results, log_file_id=task_id)
            
            db_time = (datetime.now() - db_start_time).total_seconds()
            
            # Update task status with database results
            processing_results[task_id].update({
                "status": "complete",
                "db_stats": db_stats,
                "db_insertion_time": db_time,
                "records_imported": db_stats.get("records_inserted", records_imported)
            })
            
            logger.info(f"Database insertion completed in {db_time:.2f} seconds (Task ID: {task_id})")
            
            # Create indexes if requested
            if create_indexes:
                logger.info(f"Creating database indexes (Task ID: {task_id})")
                create_all_indexes()
        
        # Clean up temp file
        try:
            os.unlink(file_path)
            logger.info(f"Temporary file removed: {file_path} (Task ID: {task_id})")
        except Exception as e:
            logger.warning(f"Failed to remove temporary file: {e} (Task ID: {task_id})")
            processing_results[task_id]["issues"].append(f"Failed to remove temporary file: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error processing file: {e} (Task ID: {task_id})")
        processing_results[task_id] = {
            "status": "error",
            "error": str(e),
            "completed_at": datetime.now().isoformat(),
            # Add frontend-expected fields
            "log_file_id": task_id,
            "records_imported": 0,
            "issues": [str(e)],
            "file_size_mb": os.path.getsize(file_path) / (1024 * 1024) if os.path.exists(file_path) else 0
        }


async def save_uploaded_file(content: bytes, filename: str) -> str:
    """
    Save uploaded file content to a temporary file
    
    Args:
        content: File content as bytes
        filename: Original filename
        
    Returns:
        Path to the saved temporary file
    """
    suffix = os.path.splitext(filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file_path = temp_file.name
        temp_file.write(content)
    
    return temp_file_path


def get_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a processing task
    
    Args:
        task_id: ID of the task to retrieve
        
    Returns:
        Task status information or None if not found
    """
    return processing_results.get(task_id) 