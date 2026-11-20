import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from .db import DBConnection
from enrichment.store import sync_crawler_info

# Get directory of the current file using pathlib
current_dir = Path(__file__).parent.resolve()

# Schema file path
schema_file = current_dir / 'schema.sql'

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
        schema_file (str or Path): Path to the schema SQL file
        
    Returns:
        bool: True if the schema was applied successfully, False otherwise
    """
    try:
        schema_path = Path(schema_file)
        logger.info(f"Applying schema from {schema_path}")
        
        if not schema_path.exists():
            logger.error(f"Schema file not found: {schema_path}")
            return False
            
        # Read the schema file
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            
        # Execute the schema SQL - SQLite requires separate statements
        cursor = conn.cursor()
        
        # Split the SQL by semicolons and execute each statement
        for statement in schema_sql.split(';'):
            if statement.strip():  # Skip empty statements
                cursor.execute(statement)
        
        logger.info("Schema applied successfully")
        return True
    except Exception as e:
        logger.error(f"Error applying schema: {e}")
        return False

# Columns added after the first release, applied to existing databases
ADDED_COLUMNS = {
    "access_logs": [
        ("country_code", "TEXT"),
        ("asn", "INTEGER"),
        ("as_org", "TEXT"),
        ("verification", "TEXT"),
        ("bytes", "INTEGER"),
    ],
    "log_files": [
        ("log_format", "TEXT"),
        ("total_lines", "INTEGER"),
        ("parsed_lines", "INTEGER"),
        ("content_hash", "TEXT"),
    ],
}


SCHEMA_VERSION = 1


def _to_utc_iso(value):
    """'2024-10-11T09:00:00+02:00' -> '2024-10-11T07:00:00+00:00'"""
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return value
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def normalize_times_to_utc(conn):
    """Older versions kept each log line's own UTC offset; convert those rows to UTC."""
    for table in ("access_logs", "ai_referrals"):
        columns = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        if "time" not in columns:
            continue
        rows = conn.execute(
            f"SELECT id, time FROM {table} WHERE time NOT LIKE '%+00:00'"
        ).fetchall()
        updates = [(_to_utc_iso(t), i) for i, t in rows]
        updates = [(t, i) for (t, i), (_, old) in zip(updates, rows) if t != old]
        if updates:
            logger.info(f"Converting {len(updates)} {table} timestamps to UTC")
            conn.executemany(f"UPDATE {table} SET time = ? WHERE id = ?", updates)


def migrate(conn):
    """Bring databases created by older versions up to date."""
    cursor = conn.cursor()
    for table, columns in ADDED_COLUMNS.items():
        existing = {row[1] for row in cursor.execute(f"PRAGMA table_info({table})")}
        if not existing:
            continue  # table doesn't exist yet; the schema creates it with every column
        for name, sql_type in columns:
            if name not in existing:
                logger.info(f"Adding column {table}.{name}")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}")

    version = cursor.execute("PRAGMA user_version").fetchone()[0]
    if version < 1:
        normalize_times_to_utc(conn)
    if version < SCHEMA_VERSION:
        cursor.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")


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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_logs_country_code ON access_logs(country_code)")
        
        # Analyze for query optimization (SQLite equivalent)
        cursor.execute("ANALYZE")
        
        logger.info("Indexes created successfully")
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

            # The schema uses IF NOT EXISTS, so it's safe to apply every time
            if not apply_schema(conn, schema_file):
                return False
            migrate(conn)
            sync_crawler_info(conn)
            return True
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