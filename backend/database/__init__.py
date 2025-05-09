from .db import Database, DBConnection, get_connection
from .writer import LogWriter
from .init_db import init_database, create_all_indexes

import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger("database")

# Initialize the database when the module is imported
init_database()

__all__ = ['Database', 'DBConnection', 'get_connection', 'LogWriter', 'init_database', 'create_all_indexes']

async def execute_sql_query(query: str, params: Optional[List[Any]] = None, limit: int = 1000) -> List[Dict[str, Any]]:
    """
    Execute a SQL query and return the results
    
    Args:
        query: SQL query to execute
        params: Query parameters as a list
        limit: Maximum number of rows to return
        
    Returns:
        List of dictionaries containing the query results
        
    Raises:
        ValueError: If the query is not a SELECT statement
    """
    params = params or []
    
    # Validate that the query is a SELECT statement
    # Strip comments and whitespace to properly check for SELECT
    query_stripped = query.strip()
    if not query_stripped.upper().startswith('SELECT') and not query_stripped.upper().startswith('WITH'):
        raise ValueError("Only SELECT queries are allowed")
        
    # For safety, if it's a WITH statement, ensure it's followed by a SELECT
    if query_stripped.upper().startswith('WITH'):
        # Simple check for basic safety - this doesn't catch all cases
        if 'SELECT' not in query_stripped.upper():
            raise ValueError("WITH statements must include a SELECT query")
    
    # Add limit if not already in query
    if 'LIMIT' not in query.upper():
        query += f" LIMIT {limit}"
        
    try:
        # Import database connection within the function to avoid circular imports
        from .db import DBConnection
        
        # Fix table names - replace "logs" with "access_logs" if needed
        query = re.sub(
            r'\blogs\b',
            'access_logs',
            query,
            flags=re.IGNORECASE
        )
        
        # Replace "status_code" with "status" if needed
        query = re.sub(
            r'\bstatus_code\b',
            'status',
            query,
            flags=re.IGNORECASE
        )
        
        # Replace "timestamp" with "time" if needed
        query = re.sub(
            r'\btimestamp\b',
            'time',
            query,
            flags=re.IGNORECASE
        )
        
        # Convert PostgreSQL syntax to SQLite syntax
        # Replace position(chr(X) in Y) with instr(Y, char(X))
        query = re.sub(
            r'position\(chr\((\d+)\)\s+in\s+([^)]+)\)',
            r'instr(\2, char(\1))',
            query,
            flags=re.IGNORECASE
        )
        
        # Replace substring() with substr()
        query = re.sub(
            r'substring\(([^)]+)\s+from\s+(\d+)(?:\s+for\s+(\d+))?\)',
            lambda m: f"substr({m.group(1)}, {m.group(2)}{', ' + m.group(3) if m.group(3) else ''})",
            query,
            flags=re.IGNORECASE
        )
        
        # Replace PostgreSQL boolean literals TRUE/FALSE with 1/0 for SQLite
        query = re.sub(r'\bTRUE\b', '1', query, flags=re.IGNORECASE)
        query = re.sub(r'\bFALSE\b', '0', query, flags=re.IGNORECASE)
        
        # Replace PostgreSQL-style cast ::numeric with SQLite CAST()
        query = re.sub(
            r'::numeric(?:\(\d+,\d+\))?',
            ' * 1.0', # Simple numeric conversion
            query,
            flags=re.IGNORECASE
        )
        
        # Replace coalesce(crawler_name, 'Unknown') which works the same in SQLite
        # but just ensure it's in the regex replacements for completeness
        
        # Replace CAST((x) AS INTEGER/NUMERIC) with CAST((x) AS INTEGER/REAL)
        query = re.sub(
            r'CAST\(\s*(.+?)\s*AS\s+NUMERIC(?:\(\d+,\d+\))?\s*\)',
            r'CAST(\1 AS REAL)',
            query,
            flags=re.IGNORECASE
        )
        
        # Replace timestamp::text with cast(timestamp as text)
        query = re.sub(
            r'(\w+)::text',
            r'cast(\1 as text)',
            query,
            flags=re.IGNORECASE
        )
        
        with DBConnection() as conn:
            # Create a cursor (SQLite doesn't support cursor as context manager)
            cursor = conn.cursor()
            
            # Convert $n style placeholders to ? which SQLite expects
            has_dollar_placeholders = any(f"${i+1}" in query for i in range(len(params)))
                
            if has_dollar_placeholders:
                # Replace $1, $2, etc. with ?
                modified_query = query
                for i in range(len(params), 0, -1):  # Go backwards to avoid replacing $1 in $10
                    modified_query = modified_query.replace(f"${i}", "?")
                query = modified_query
            
            # Replace %s with ? for SQLite if present
            query = query.replace("%s", "?")
            
            # Execute the query with parameters
            try:
                cursor.execute(query, params)
            except Exception as e:
                logger.error(f"SQL execution error: {str(e)}")
                logger.error(f"Query: {query}")
                logger.error(f"Params: {params}")
                raise e
            
            # Fetch column names
            columns = [desc[0] for desc in cursor.description]
            
            # Fetch all rows and convert to dictionaries
            records = []
            for row in cursor.fetchall():
                record = {}
                for i, column in enumerate(columns):
                    record[column] = row[i]
                records.append(record)
                
            # Close the cursor manually
            cursor.close()
            
            return records
                
    except Exception as e:
        logger.error(f"Database query error: {str(e)}")
        raise


async def delete_log_file_data(log_file_id: str) -> Dict[str, Any]:
    """
    Delete all data associated with a specific log file ID
    
    Args:
        log_file_id: ID of the log file to delete
        
    Returns:
        Dictionary with status and count of deleted records
    """
    if not log_file_id:
        raise ValueError("Log file ID is required")
        
    try:
        with DBConnection() as conn:
            # First check if the log file exists
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) FROM log_files WHERE log_file_id = ?",
                (log_file_id,)
            )
            if cur.fetchone()[0] == 0:
                cur.close()
                return {"status": "not_found", "deleted_log_entries": 0}
                
            # Delete the log entries
            cur.execute(
                "DELETE FROM access_logs WHERE log_file_id = ?",
                (log_file_id,)
            )
            deleted_rows = cur.rowcount
            
            # Delete the log file record
            cur.execute(
                "DELETE FROM log_files WHERE log_file_id = ?",
                (log_file_id,)
            )
            
            # Close the cursor manually
            cur.close()
            
            return {
                "status": "success",
                "deleted_log_entries": deleted_rows
            }
    except Exception as e:
        logger.error(f"Error deleting log file data: {e}")
        raise


async def get_all_log_files() -> List[Dict[str, Any]]:
    """
    Get all log files from the database
    
    Returns:
        List of dictionaries containing log file information
    """
    try:
        with DBConnection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    log_file_id, 
                    file_name, 
                    upload_timestamp
                FROM 
                    log_files
                ORDER BY 
                    upload_timestamp DESC
            """)
            
            columns = [desc[0] for desc in cur.description]
            results = []
            
            for row in cur.fetchall():
                results.append(dict(zip(columns, row)))
            
            # Close the cursor manually
            cur.close()
                
            return results
    except Exception as e:
        logger.error(f"Error retrieving log files: {e}")
        raise

async def get_active_log_file() -> Optional[Dict[str, Any]]:
    """
    Get the currently active log file (marked as in_use)
    
    Returns:
        Dictionary with log file information or None if no active log file
    """
    try:
        with DBConnection() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    log_file_id, 
                    file_name, 
                    upload_timestamp
                FROM 
                    log_files
                WHERE 
                    in_use = 1
                LIMIT 1
            """)
            
            row = cur.fetchone()
            if not row:
                # If no active log file, try to get the most recent one
                cur.execute("""
                    SELECT 
                        log_file_id, 
                        file_name, 
                        upload_timestamp
                    FROM 
                        log_files
                    ORDER BY 
                        upload_timestamp DESC
                    LIMIT 1
                """)
                row = cur.fetchone()
                
                # If we found a log file, set it as active
                if row:
                    log_file_id = row[0]
                    await set_active_log_file(log_file_id)
            
            # Close the cursor manually
            cur.close()
            
            if not row:
                return None
                
            return {
                "log_file_id": row[0],
                "file_name": row[1],
                "upload_timestamp": row[2]
            }
    except Exception as e:
        logger.error(f"Error retrieving active log file: {e}")
        raise

async def set_active_log_file(log_file_id: str) -> Dict[str, Any]:
    """
    Set a specific log file as active and deactivate all others
    
    Args:
        log_file_id: ID of the log file to set as active
        
    Returns:
        Dictionary with status and log file ID
    """
    if not log_file_id:
        raise ValueError("Log file ID is required")
        
    try:
        with DBConnection() as conn:
            # First check if the log file exists
            cur = conn.cursor()
            cur.execute(
                "SELECT COUNT(*) FROM log_files WHERE log_file_id = ?",
                (log_file_id,)
            )
            if cur.fetchone()[0] == 0:
                cur.close()
                return {"status": "not_found", "log_file_id": log_file_id}
                
            # Reset all log files (set in_use to 0)
            cur.execute("UPDATE log_files SET in_use = 0")
            
            # Set the specified log file as active
            cur.execute(
                "UPDATE log_files SET in_use = 1 WHERE log_file_id = ?",
                (log_file_id,)
            )
            
            # Close the cursor manually
            cur.close()
            
            return {
                "status": "success",
                "log_file_id": log_file_id
            }
    except Exception as e:
        logger.error(f"Error setting active log file: {e}")
        raise 