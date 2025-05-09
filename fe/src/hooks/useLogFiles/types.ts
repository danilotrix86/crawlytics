/**
 * Types for log file management
 */

// Cookie management constants
export const COOKIE_NAME = 'selected_log_file';
export const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

// Interface for log file structure from API
export interface LogFile {
    log_file_id: string;
    file_name: string;
    upload_timestamp: string;
} 