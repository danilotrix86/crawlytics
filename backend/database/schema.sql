-- Define the access_logs table for SQLite
-- Some PostgreSQL-specific features are replaced with SQLite equivalents

-- Create the log_files table first for foreign key reference
CREATE TABLE IF NOT EXISTS log_files (
    log_file_id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL,
    upload_timestamp TEXT DEFAULT (datetime('now')),
    in_use BOOLEAN DEFAULT 0,
    log_format TEXT,       -- detected format, e.g. 'apache', 'caddy', 'w3c'
    total_lines INTEGER,   -- lines in the file
    parsed_lines INTEGER   -- requests parsed (humans + bots), for share-of-traffic
);

CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,  -- Store as ISO format text, SQLite has no timezone support
    ip_address TEXT,     -- SQLite has no INET type, store as text
    method TEXT,
    path TEXT,
    status INTEGER,
    user_agent TEXT,
    crawler_name TEXT,
    referer TEXT,
    request_id TEXT,     -- Store UUID as text
    log_file_id TEXT REFERENCES log_files(log_file_id),
    country_code TEXT,   -- ISO 3166 alpha-2, from the offline GeoIP database
    asn INTEGER,         -- Autonomous system number of the IP
    as_org TEXT,         -- Network owner, e.g. "Google LLC"
    verification TEXT,   -- 'verified', 'suspicious' or 'unknown' (NULL = not checked yet)
    bytes INTEGER        -- response size
);

-- Human visits referred by AI assistants. No IP or user agent is stored.
CREATE TABLE IF NOT EXISTS ai_referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    path TEXT,
    status INTEGER,
    bytes INTEGER,
    assistant TEXT,      -- e.g. 'ChatGPT'
    operator TEXT,       -- e.g. 'OpenAI', matches crawler_info.operator
    referrer_host TEXT,
    log_file_id TEXT REFERENCES log_files(log_file_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_referrals_log_file_id ON ai_referrals(log_file_id);

-- Who runs each crawler and why it visits, refreshed from enrichment/crawlers.json at startup
CREATE TABLE IF NOT EXISTS crawler_info (
    crawler_name TEXT PRIMARY KEY COLLATE NOCASE,
    operator TEXT,
    category TEXT,
    description TEXT,
    docs_url TEXT
);

-- Indexes (Create *after* initial data load for better performance):
-- CREATE INDEX IF NOT EXISTS idx_access_logs_time ON access_logs(time);
-- CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs(status);
-- CREATE INDEX IF NOT EXISTS idx_access_logs_ip_address ON access_logs(ip_address);
-- CREATE INDEX IF NOT EXISTS idx_access_logs_path ON access_logs(path);
-- CREATE INDEX IF NOT EXISTS idx_access_logs_log_file_id ON access_logs(log_file_id);
-- CREATE INDEX IF NOT EXISTS idx_access_logs_crawler_name ON access_logs(crawler_name);

-- Optional: Analyze the table after data import for optimal query planning
-- ANALYZE access_logs; 