/**
 * Utility functions for cookie management
 */

import { pythonApiFetch } from './pythonApiClient';

// Import logFileCache from App to avoid circular dependency
// We access it directly from window for simplicity
declare global {
    interface Window {
        __logFileCache?: {
            id: string | null;
            timestamp: number;
        };
    }
}

/**
 * Get a cookie value by name
 * 
 * For selected_log_file cookie, this will retrieve the active log file from database
 */
export function getCookie(name: string): string | null {
    // For the log file cookie, use the centralized context value if available
    if (name === 'selected_log_file') {
        // Check global cache first
        if (window.__logFileCache?.id && 
            Date.now() - window.__logFileCache.timestamp < 30 * 1000) {
            return window.__logFileCache.id;
        }
        
        // If there's no global cache, fall back to the database API
        // This should rarely happen now with the LogFileProvider
        console.debug(`[Cookie Debug] Falling back to database API for selected_log_file`);
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
        // Also update global cache
        if (window.__logFileCache) {
            window.__logFileCache.id = value;
            window.__logFileCache.timestamp = Date.now();
        }
        
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
    // DEBUG: Log API call for active log file
    console.debug(`[Cookie Debug] Fetching active log file from API`);
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
    fetchPromise: Promise<{log_file_id: string | null}> | null;
} = {
    logFileId: null,
    timestamp: 0,
    fetchPromise: null
};

/**
 * Cache timeout in milliseconds (30 seconds)
 */
const CACHE_TIMEOUT = 30 * 1000;

/**
 * Get the active log file ID from the database with caching
 * This uses better caching to reduce API calls
 */
export function getActiveLogFileId(): string | null {
    const now = Date.now();
    
    // If cache is valid and we have a log file ID, return it immediately
    if ((now - activeLogFileCache.timestamp) < CACHE_TIMEOUT) {
        console.debug(`[Cookie Debug] Using cached log file ID: ${activeLogFileCache.logFileId}`);
        return activeLogFileCache.logFileId;
    }
    
    // If no fetch is in progress, start one
    if (!activeLogFileCache.fetchPromise) {
        console.debug(`[Cookie Debug] Starting new log file fetch, cache invalid or empty`);
        // Start a new fetch
        activeLogFileCache.fetchPromise = getActiveLogFileFromApi();
        
        // Process the promise
        activeLogFileCache.fetchPromise.then(response => {
            // Update the cache
            activeLogFileCache = {
                logFileId: response.log_file_id,
                timestamp: Date.now(),
                fetchPromise: null // Clear the promise
            };
            console.debug(`[Cookie Debug] Updated cache with log file ID: ${response.log_file_id}`);
        }).catch(error => {
            console.error('Error getting active log file:', error);
            // On error, invalidate the cache but set a timestamp to avoid hammering the API
            activeLogFileCache = {
                logFileId: activeLogFileCache.logFileId, // Keep the old value
                timestamp: Date.now(),
                fetchPromise: null
            };
        });
    } else {
        console.debug(`[Cookie Debug] Fetch already in progress, returning current value: ${activeLogFileCache.logFileId}`);
    }
    
    // Return the current value while the fetch is happening
    return activeLogFileCache.logFileId;
}

/**
 * Set the active log file ID in the database
 */
export function setActiveLogFileId(logFileId: string): void {
    // Cancel any pending fetch
    if (activeLogFileCache.fetchPromise) {
        // We can't truly cancel the request, but we can ignore the result
        // by setting a new cache immediately
        console.info('Cancelling pending log file fetch due to manual selection');
    }
    
    // Update the cache immediately for better UX
    activeLogFileCache = {
        logFileId,
        timestamp: Date.now(),
        fetchPromise: null
    };

    // Update the database
    pythonApiFetch(`/active-log-file/${logFileId}`, {
        method: 'POST'
    }).catch(error => {
        console.error('Error setting active log file:', error);
        // If there's an error, invalidate the cache
        activeLogFileCache = {
            logFileId: null,
            timestamp: 0,
            fetchPromise: null
        };
    });
} 