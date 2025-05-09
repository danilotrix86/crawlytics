import os
import logging
from datetime import datetime
from .db import DBConnection

# Get the database connection
from .db import DBConnection

# Get directory of the current file
current_dir = os.path.dirname(os.path.abspath(__file__))

# Schema file path
schema_file = os.path.join(current_dir, 'schema.sql')

# Configure logging
logger = logging.getLogger(__name__)

def table_exists(conn, table_name):
    """
    Check if a table exists in the database.
    
    Args:
        conn: Database connection
        table_name (str): Name of the table to check
        
    Returns:
        bool: True if the table exists, False otherwise
    """
    cursor = conn.cursor()
    cursor.execute("""
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
    """, (table_name,))
    return cursor.fetchone() is not None

def apply_schema(conn, schema_file):
    """
    Apply a schema file to the database.
    
    Args:
        conn: Database connection
        schema_file (str): Path to the schema SQL file
        
    Returns:
        bool: True if the schema was applied successfully, False otherwise
    """
    try:
        # Read the schema file
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
            
        # Execute the schema SQL - SQLite requires separate statements
        cursor = conn.cursor()
        
        # Split the SQL by semicolons and execute each statement
        for statement in schema_sql.split(';'):
            if statement.strip():  # Skip empty statements
                cursor.execute(statement)
        
        return True
    except Exception as e:
        logger.error(f"Error applying schema: {e}")
        return False

def create_indexes(conn):
    """
    Create indexes on the access_logs table.
    
    Args:
        conn: Database connection
        
    Returns:
        bool: True if indexes were created successfully, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Create indexes if they don't exist
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_time ON access_logs(time)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_path ON access_logs(path)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_log_file_id ON access_logs(log_file_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_crawler_name ON access_logs(crawler_name)")
        
        # Analyze for query optimization (SQLite equivalent)
        cursor.execute("ANALYZE")
        
        return True
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        return False

def init_database():
    """
    Initialize the database schema from the schema.sql file.
    
    Returns:
        bool: True if database was initialized successfully, False otherwise
    """
    try:
        # Get a database connection
        with DBConnection() as conn:
            logger.info("Initializing database schema...")

            # Apply schema
            success = apply_schema(conn, schema_file)
                
            return success
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        return False

def create_all_indexes():
    """
    Create all indexes in the database.
    """
    try:
        # Get a database connection
        with DBConnection() as conn:
            logger.info("Creating indexes...")
            success = create_indexes(conn)
            return success
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        return False

if __name__ == "__main__":
    # Run this script directly to initialize the database
    if init_database():
        print("Database initialized successfully.") 