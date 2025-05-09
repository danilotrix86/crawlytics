import os
import sqlite3
import threading
from pathlib import Path

# Default database configuration
DEFAULT_DB_CONFIG = {
    "database": "crawlytics.db",
    "pragmas": {
        "journal_mode": "WAL",
        "synchronous": "NORMAL",
        "cache_size": -1024 * 32,  # 32MB cache
        "foreign_keys": 1
    }
}

class Database:
    """
    Database connection manager using SQLite.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, **kwargs):
        """
        Singleton pattern to ensure only one connection pool exists.
        
        Args:
            **kwargs: Connection parameters to override defaults
            
        Returns:
            Database: The singleton instance
        """
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(Database, cls).__new__(cls)
                cls._instance._initialize(**kwargs)
            return cls._instance
        
    def _initialize(self, **kwargs):
        """
        Initialize the database connection settings.
        
        Args:
            **kwargs: Connection parameters to override defaults
        """
        # Get connection parameters from environment or use defaults
        config = DEFAULT_DB_CONFIG.copy()
        
        # Override with environment variables if set
        if os.environ.get("DB_PATH"):
            config["database"] = os.environ.get("DB_PATH")
            
        # Override with explicit parameters if provided
        config.update(kwargs)
        
        # Ensure database directory exists
        db_path = Path(config["database"])
        if not db_path.is_absolute():
            # If relative path, make it relative to current directory
            db_path = Path(os.getcwd()) / db_path
            config["database"] = str(db_path)
            
        # Ensure directory exists
        db_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Store configuration
        self.config = config
        self.connection_cache = {}
        
    def get_connection(self):
        """
        Get a connection to the database.
        
        Returns:
            Connection: A database connection
        """
        # Use thread ID as a key to ensure thread safety
        thread_id = threading.get_ident()
        
        if thread_id not in self.connection_cache:
            # Create new connection for this thread
            conn = sqlite3.connect(
                self.config["database"],
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
                isolation_level=None  # Enable autocommit mode by default
            )
            
            # Enable recursive triggers for WAL mode
            conn.execute("PRAGMA recursive_triggers = ON")
            
            # Apply pragmas for performance
            for pragma, value in self.config.get("pragmas", {}).items():
                conn.execute(f"PRAGMA {pragma} = {value}")
            
            # Configure connection
            conn.row_factory = sqlite3.Row
            
            # Store in cache
            self.connection_cache[thread_id] = conn
            
        return self.connection_cache[thread_id]
        
    def release_connection(self, conn):
        """
        No-op for SQLite as we keep connections per-thread.
        
        Args:
            conn: The connection to release
        """
        pass
        
    def close_all(self):
        """
        Close all connections in the cache.
        """
        for conn in self.connection_cache.values():
            conn.close()
        self.connection_cache.clear()

# Function to get a database connection
def get_connection(**kwargs):
    """
    Get a database connection.
    
    Args:
        **kwargs: Connection parameters to override defaults
        
    Returns:
        Connection: A database connection
    """
    db = Database(**kwargs)
    return db.get_connection()
    
# Context manager for database connections
class DBConnection:
    """
    Context manager for database connections.
    """
    
    def __init__(self, **kwargs):
        """
        Initialize the context manager.
        
        Args:
            **kwargs: Connection parameters to override defaults
        """
        self.db = Database(**kwargs)
        self.conn = None
        self.in_transaction = False
        
    def __enter__(self):
        """
        Get a connection when entering the context.
        
        Returns:
            Connection: A database connection
        """
        self.conn = self.db.get_connection()
        
        # Simple approach: always start a transaction
        self.conn.execute("BEGIN")
        self.in_transaction = True
        
        return self.conn
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Commit or rollback the transaction when exiting the context.
        
        Args:
            exc_type: Exception type if an exception was raised
            exc_val: Exception value if an exception was raised
            exc_tb: Exception traceback if an exception was raised
        """
        if self.conn and self.in_transaction:
            try:
                if exc_type is not None:
                    # An exception occurred, rollback
                    self.conn.execute("ROLLBACK")
                else:
                    # No exception, commit
                    self.conn.execute("COMMIT")
            except sqlite3.OperationalError as e:
                # Ignore "no transaction is active" errors
                if "no transaction is active" not in str(e):
                    raise
                
            self.in_transaction = False 