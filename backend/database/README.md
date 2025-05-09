# Crawlytics SQLite Database Module

This module provides a SQLite database implementation for the Crawlytics application. SQLite is used as the primary database to store log data for analysis.

## Features

- Thread-safe SQLite connection management
- Performance optimizations through WAL journal mode and connection caching
- Efficient batch inserts and transactions
- Automatic schema initialization at startup

## Database Configuration

The default configuration uses a file named `crawlytics.db` in the current working directory. This can be overridden with:

1. Environment variables:
   - `DB_PATH`: Path to the SQLite database file

2. Direct configuration when creating a connection:
   ```python
   conn = get_connection(database="/path/to/custom.db")
   ```

## Performance Settings

The SQLite database is configured with the following performance optimizations:

- WAL (Write-Ahead Logging) journal mode for better concurrency and performance
- Normal synchronous mode for a balance of performance and reliability
- 32MB cache size for improved read performance
- Foreign key constraints enabled

## Usage

```python
from database import get_connection, DBConnection

# Using a context manager (recommended)
with DBConnection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM access_logs LIMIT 10")
    rows = cursor.fetchall()
    
# Using a direct connection
conn = get_connection()
cursor = conn.cursor()
cursor.execute("SELECT * FROM access_logs LIMIT 10")
rows = cursor.fetchall()
```

## Tables

- `log_files`: Stores metadata about imported log files
- `access_logs`: Stores the parsed log entries
- `logs`: A view that provides backward compatibility with the PostgreSQL schema

## Initialization

The database is automatically initialized when the database module is imported. This ensures
that all required tables and indexes are created before the application uses the database. 