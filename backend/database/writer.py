import io
import sqlite3
from datetime import datetime
from .db import DBConnection

class LogWriter:
    """
    Handles efficient batch inserts into the SQLite database.
    """
    
    def __init__(self, db_config=None):
        """
        Initialize the log writer.
        
        Args:
            db_config (dict, optional): Database configuration parameters
        """
        self.db_config = db_config or {}
        self.stats = {
            "rows_attempted": 0,
            "rows_inserted": 0,
            "errors": 0
        }
    
    def insert_log_file(self, log_file_id, file_name, set_as_active=False):
        """
        Insert a new record into the log_files table.
        
        Args:
            log_file_id (str): The ID of the log file
            file_name (str): The name of the log file
            set_as_active (bool): Whether to set this log file as active
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with DBConnection(**self.db_config) as conn:
                cursor = conn.cursor()
                
                # If set_as_active is True, reset all files to inactive first
                if set_as_active:
                    cursor.execute("UPDATE log_files SET in_use = 0")
                
                # Insert the new log file with in_use flag
                cursor.execute(
                    "INSERT OR IGNORE INTO log_files (log_file_id, file_name, in_use) VALUES (?, ?, ?)",
                    (log_file_id, file_name, 1 if set_as_active else 0)
                )
                return True
        except Exception as e:
            print(f"Error inserting log file record: {e}")
            return False
        
    def insert_logs(self, logs, log_file_id=None, batch_size=1000):
        """
        Insert logs into the database using batched inserts.
        
        Args:
            logs (list): List of log dictionaries to insert
            log_file_id (str, optional): ID of the log file these logs belong to
            batch_size (int): Size of batches for inserts
            
        Returns:
            dict: Statistics about the insert operation
        """
        self.stats = {
            "rows_attempted": len(logs),
            "rows_inserted": 0,
            "errors": 0
        }
        
        # Add log_file_id to each log entry if provided
        if log_file_id:
            for log in logs:
                log["log_file_id"] = log_file_id
        
        # Process in batches
        for i in range(0, len(logs), batch_size):
            batch = logs[i:i+batch_size]
            try:
                inserted = self._insert_batch(batch)
                self.stats["rows_inserted"] += inserted
            except Exception as e:
                self.stats["errors"] += len(batch)
                print(f"Error inserting batch: {e}")
                
        return self.stats
        
    def _insert_batch(self, logs):
        """
        Insert a batch of logs using SQLite's executemany method.
        
        Args:
            logs (list): List of log dictionaries to insert
            
        Returns:
            int: Number of rows inserted
        """
        if not logs:
            return 0
            
        try:
            with DBConnection(**self.db_config) as conn:
                return self._insert_logs(conn, logs)
        except Exception as e:
            print(f"Batch insert failed: {e}")
            # Fall back to single inserts
            return self._insert_logs_one_by_one(logs)
            
    def _insert_logs(self, conn, logs):
        """
        Insert logs using parameterized batch INSERT statements with executemany.
        
        Args:
            conn: Database connection
            logs (list): List of log dictionaries to insert
            
        Returns:
            int: Number of rows inserted
        """
        cursor = conn.cursor()
        
        # Prepare the INSERT statement
        query = """
        INSERT INTO access_logs
            (time, ip_address, method, path, status, user_agent, crawler_name, referer, request_id, response_time_ms, log_file_id)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Prepare parameters list
        params_list = []
        for log in logs:
            # Convert timestamps to ISO format strings for SQLite
            time_val = log.get("time")
            if isinstance(time_val, datetime):
                time_val = time_val.isoformat()
            
            params_list.append((
                time_val,
                log.get("ip_address"),
                log.get("method"),
                log.get("path"),
                log.get("status"),
                log.get("user_agent"),
                log.get("crawler_name"),
                log.get("referer"),
                log.get("request_id"),
                log.get("response_time_ms"),
                log.get("log_file_id")
            ))
        
        # Execute batch insert with proper error handling
        try:
            cursor.executemany(query, params_list)
            return len(logs)
        except Exception as e:
            print(f"Executemany failed: {e}")
            # If executemany failed, transaction was rolled back automatically
            # Fall back to individual inserts
            return self._insert_logs_one_by_one(logs)
            
    def _insert_logs_one_by_one(self, logs):
        """
        Insert logs one by one for maximum reliability.
        
        Args:
            logs (list): List of log dictionaries to insert
            
        Returns:
            int: Number of rows inserted
        """
        inserted = 0
        with DBConnection(**self.db_config) as conn:
            cursor = conn.cursor()
            # Prepare the INSERT statement
            query = """
            INSERT INTO access_logs
                (time, ip_address, method, path, status, user_agent, crawler_name, referer, request_id, response_time_ms, log_file_id)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            for log in logs:
                try:
                    # Convert timestamps to ISO format strings for SQLite
                    time_val = log.get("time")
                    if isinstance(time_val, datetime):
                        time_val = time_val.isoformat()
                        
                    cursor.execute(query, (
                        time_val,
                        log.get("ip_address"),
                        log.get("method"),
                        log.get("path"),
                        log.get("status"),
                        log.get("user_agent"),
                        log.get("crawler_name"),
                        log.get("referer"),
                        log.get("request_id"),
                        log.get("response_time_ms"),
                        log.get("log_file_id")
                    ))
                    inserted += 1
                except Exception as e:
                    print(f"Error inserting individual log: {e}")
                    
        return inserted 