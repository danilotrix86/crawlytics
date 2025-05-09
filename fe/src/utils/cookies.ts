/**
 * Utility functions for cookie management
 */

import { pythonApiFetch } from './pythonApiClient';

/**
 * Get a cookie value by name
 * 
 * For selected_log_file cookie, this will retrieve the active log file from database
 */
export function getCookie(name: string): string | null {
    // For the log file cookie, use the database API
    if (name === 'selected_log_file') {
        // Create a promise to get the active log file
        return getActiveLogFileId();
    }

    // For other cookies, use the standard document.cookie approach
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1];

    return cookieValue ? decodeURIComponent(cookieValue) : null;
}

/**
 * Set a cookie with specified name, value and max age
 * 
 * For selected_log_file cookie, this will set the active log file in database
 */
export function setCookie(name: string, value: string, maxAgeInSeconds: number): void {
    // For the log file cookie, use the database API
    if (name === 'selected_log_file') {
        // Set the active log file
        setActiveLogFileId(value);
        return;
    }

    // For other cookies, use the standard document.cookie approach
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeInSeconds}; path=/; SameSite=Lax`;
}

/**
 * Delete a cookie by name
 * 
 * For selected_log_file cookie, this is a no-op as we don't want to clear the active log file
 */
export function deleteCookie(name: string): void {
    // For the log file cookie, we don't truly delete, we just ignore this call
    if (name === 'selected_log_file') {
        console.warn('Attempt to delete selected_log_file cookie, which is now managed in database. Ignoring.');
        return;
    }

    // For other cookies, use the standard document.cookie approach
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}

/**
 * Helper function to get the active log file ID from the database
 */
async function getActiveLogFileFromApi(): Promise<{log_file_id: string | null}> {
    try {
        const response = await pythonApiFetch<{log_file_id: string | null}>('/active-log-file');
        return response;
    } catch (error) {
        console.error('Error getting active log file:', error);
        return { log_file_id: null };
    }
}

/**
 * Cache for the active log file ID to avoid excessive API calls
 */
let activeLogFileCache: {
    logFileId: string | null;
    timestamp: number;
} | null = null;

/**
 * Cache timeout in milliseconds (30 seconds)
 */
const CACHE_TIMEOUT = 30 * 1000;

/**
 * Get the active log file ID from the database with caching
 */
export function getActiveLogFileId(): string | null {
    // Check if we have a cached value that's still valid
    const now = Date.now();
    if (activeLogFileCache && (now - activeLogFileCache.timestamp) < CACHE_TIMEOUT) {
        return activeLogFileCache.logFileId;
    }

    // No valid cache, fetch from API
    getActiveLogFileFromApi().then(response => {
        // Update the cache
        activeLogFileCache = {
            logFileId: response.log_file_id,
            timestamp: Date.now()
        };
    }).catch(error => {
        console.error('Error getting active log file:', error);
    });

    // Return the cached value if we have one, otherwise null
    return activeLogFileCache?.logFileId || null;
}

/**
 * Set the active log file ID in the database
 */
export function setActiveLogFileId(logFileId: string): void {
    // Update the cache immediately for better UX
    activeLogFileCache = {
        logFileId,
        timestamp: Date.now()
    };

    // Update the database
    pythonApiFetch(`/active-log-file/${logFileId}`, {
        method: 'POST'
    }).catch(error => {
        console.error('Error setting active log file:', error);
        // If there's an error, invalidate the cache
        activeLogFileCache = null;
    });
} 