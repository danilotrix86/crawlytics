import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, status, HTTPException, Body, Path as FastApiPath, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse

from models import SQLQueryRequest
from database import execute_sql_query, delete_log_file_data, get_all_log_files, get_active_log_file, set_active_log_file
from processor import process_log_file, save_uploaded_file, get_task_status

# Configure logging
logger = logging.getLogger("logs_routes")

# Create router
router = APIRouter(tags=["logs"])


@router.post(
    "/query_sql",
    status_code=status.HTTP_200_OK,
    summary="Run SQL Query",
    response_model=List[Dict[str, Any]],
    tags=["logs"]
)
async def query_sql(query_params: SQLQueryRequest = Body(...)) -> List[Dict[str, Any]]:
    """
    Execute a custom SQL query against the logs database.
    
    Args:
        query_params: SQL query and parameters
        
    Returns:
        List of results matching the SQL query
        
    Raises:
        HTTPException: If SQL is invalid or database query fails
    """
    try:
        # Execute the SQL query
        result = await execute_sql_query(
            query=query_params.query,
            params=query_params.params,
            limit=query_params.limit
        )
        
        return result
        
    except ValueError as e:
        # Handle validation errors
        logger.error(f"Invalid SQL query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        # Handle other errors
        logger.error(f"Error executing SQL query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing SQL query: {str(e)}"
        )


@router.get(
    "/logs",
    status_code=status.HTTP_200_OK,
    summary="Get Log Files",
    response_model=List[Dict[str, Any]],
    tags=["logs"]
)
async def get_log_files() -> List[Dict[str, Any]]:
    """
    Get information about all uploaded log files.
    
    Returns:
        List of log file information including ID, filename, upload timestamp, 
        and number of log entries.
    
    Raises:
        HTTPException: If database query fails
    """
    logger.info("GET /logs called")
    try:
        # Query to get log files and count of their log entries
        query = """
        SELECT 
            lf.log_file_id, 
            lf.file_name, 
            lf.upload_timestamp,
            COUNT(l.id) as log_count
        FROM 
            log_files lf
        LEFT JOIN 
            access_logs l ON lf.log_file_id = l.log_file_id
        GROUP BY 
            lf.log_file_id, lf.file_name, lf.upload_timestamp
        ORDER BY 
            lf.upload_timestamp DESC
        """
        
        result = await execute_sql_query(query)
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving log files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving log files: {str(e)}"
        )


@router.delete(
    "/logs/{log_file_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Log File Data",
    response_model=Dict[str, Any],
    tags=["logs"]
)
async def delete_log_file(log_file_id: str = FastApiPath(..., description="The ID of the log file to delete")) -> Dict[str, Any]:
    """
    Delete all data associated with a specific log file ID.

    This includes entries in the main logs table and the record in the log_files table.

    Args:
        log_file_id: The unique ID of the log file to delete, passed in the path.

    Returns:
        A dictionary indicating the result of the deletion.

    Raises:
        HTTPException 404: If the log file ID is not found.
        HTTPException 500: If a database error occurs during deletion.
    """
    try:
        result = await delete_log_file_data(log_file_id)
        
        if result["status"] == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Log file with ID '{log_file_id}' not found."
            )

        # Return success status and number of log entries deleted
        return {
            "message": f"Successfully deleted data for log file ID {log_file_id}",
            "deleted_log_entries": result["deleted_log_entries"]
        }

    except ValueError as ve:
        # This might be redundant if the DB function handles empty ID, but good practice
        logger.error(f"Validation error deleting log file {log_file_id}: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error deleting log file {log_file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete log file data: {str(e)}"
        )


@router.post(
    "/import-log",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and Process Log File",
    response_model=Dict[str, Any],
    tags=["logs"]
)
async def upload_log(
    background_tasks: BackgroundTasks,
    log_file: UploadFile = File(...),
    save_to_db: Optional[bool] = Form(True),
    create_indexes: Optional[bool] = Form(True)
):
    """
    Upload and process a server log file
    
    Args:
        background_tasks: FastAPI background tasks
        log_file: The log file to upload and process
        save_to_db: Whether to save results to database
        create_indexes: Whether to create database indexes after saving
        
    Returns:
        JSON response with task ID and initial status
    """
    logger.info(f"Log file upload received: {log_file.filename}")
    
    # Generate a task ID
    task_id = f"task_{datetime.now().strftime('%Y%m%d%H%M%S')}_{id(log_file)}"
    
    try:
        # Read and save file content
        content = await log_file.read()
        temp_file_path = await save_uploaded_file(content, log_file.filename)
        
        # Start processing in background
        background_tasks.add_task(
            process_log_file,
            temp_file_path,
            task_id,
            log_file.filename,
            save_to_db,
            create_indexes
        )
        
        # Format response to match frontend expectations
        file_size_mb = len(content) / (1024 * 1024)
        
        return {
            "log_file_id": task_id,  # Using task_id as log_file_id
            "records_imported": 0,   # Will be processed in background
            "issues": [],            # No issues yet
            "file_size_mb": file_size_mb
        }
        
    except Exception as e:
        logger.error(f"Error handling file upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing upload: {str(e)}"
        )


@router.get(
    "/task/{task_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Task Status",
    response_model=Dict[str, Any],
    tags=["logs"]
)
async def get_task(task_id: str = FastApiPath(..., description="The ID of the task to check")):
    """
    Get the status of a processing task
    
    Args:
        task_id: The task ID to check
        
    Returns:
        JSON response with task status and details
    """
    logger.info(f"GET /task/{{task_id}} called with task_id={task_id}")
    task_info = get_task_status(task_id)
    
    if not task_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
        
    return task_info


@router.get(
    "/get-logs-name",
    status_code=status.HTTP_200_OK,
    summary="Get Log File Names",
    response_model=List[Dict[str, Any]],
    tags=["logs"]
)
async def get_logs_name() -> List[Dict[str, Any]]:
    """
    Retrieve a list of all imported log files with their IDs and names.
    
    Returns:
        List[Dict[str, Any]]: A list containing dictionaries with 'log_file_id', 'file_name', and 'upload_timestamp'.
        
    Raises:
        HTTPException: If there's an error retrieving data from the database.
    """
    logger.info("GET /get-logs-name called")
    try:
        log_files = await get_all_log_files()
        return log_files
    except Exception as e:
        logger.error(f"Error retrieving log file names: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get(
    "/active-log-file",
    status_code=status.HTTP_200_OK,
    summary="Get Active Log File",
    response_model=Dict[str, Any],
    tags=["logs"]
)
async def get_active_log() -> Dict[str, Any]:
    """
    Get the currently active log file (marked with in_use=true)
    
    Returns:
        JSON response with log file details or null if no active file
    
    Raises:
        HTTPException: If database query fails
    """
    logger.info("GET /active-log-file called")
    try:
        active_log = await get_active_log_file()
        logger.info(f"active_log returned: {active_log}")
        if active_log is None:
            logger.info("No active log file found, returning nulls")
            return {"log_file_id": None, "file_name": None, "upload_timestamp": None}
        logger.info(f"Returning active log: {active_log}")
        return active_log
    except Exception as e:
        logger.error(f"Error retrieving active log file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving active log file: {str(e)}"
        )


@router.post(
    "/active-log-file/{log_file_id}",
    status_code=status.HTTP_200_OK,
    summary="Set Active Log File",
    response_model=Dict[str, Any],
    tags=["logs"]
)
async def set_active_log(log_file_id: str = FastApiPath(..., description="The ID of the log file to set as active")) -> Dict[str, Any]:
    """
    Set a specific log file as active and deactivate all others
    
    Args:
        log_file_id: The unique ID of the log file to set as active
        
    Returns:
        JSON response with status and log_file_id
        
    Raises:
        HTTPException 404: If the log file ID is not found
        HTTPException 500: If database error occurs
    """
    logger.info(f"POST /active-log-file/{{log_file_id}} called with log_file_id={log_file_id}")
    try:
        result = await set_active_log_file(log_file_id)
        
        if result["status"] == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Log file with ID '{log_file_id}' not found."
            )
            
        return {
            "status": "success",
            "message": f"Successfully set log file {log_file_id} as active",
            "log_file_id": log_file_id
        }
        
    except ValueError as ve:
        logger.error(f"Validation error setting active log file {log_file_id}: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error setting active log file {log_file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set active log file: {str(e)}"
        ) 