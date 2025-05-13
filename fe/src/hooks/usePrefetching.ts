/**
 * Log file change listener hook
 * 
 * This hook monitors for log file changes and invalidates the query cache
 * to ensure components use the correct data for the newly selected log file.
 */
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to handle log file changes and manage query cache
 */
export function usePrefetching() {
    const location = useLocation();
    const queryClient = useQueryClient();
    
    // Helper to get current log file ID from cookies
    const getLogFileId = useCallback(() => {
        const COOKIE_NAME = 'selected_log_file';
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${COOKIE_NAME}=`))
            ?.split('=')[1] || null;
    }, []);
    
    // Track log file changes
    useEffect(() => {
        let lastLogFileId = getLogFileId();
        
        // Check for log file changes periodically
        const intervalId = setInterval(() => {
            const currentLogFileId = getLogFileId();
            
            // If log file has changed, invalidate all SQL queries
            if (currentLogFileId !== lastLogFileId) {
                console.info('Log file changed, invalidating cache...');
                queryClient.invalidateQueries({ queryKey: ['sql'] });
                lastLogFileId = currentLogFileId;
            }
        }, 2000); // Check every 2 seconds
        
        return () => clearInterval(intervalId);
    }, [queryClient, getLogFileId]);
    
    // Return empty methods for backward compatibility
    return {
        prefetchTrafficInsight: () => {/* No-op */},
        prefetchGeographicInsight: () => {/* No-op */},
    };
} 