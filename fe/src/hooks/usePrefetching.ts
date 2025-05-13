/**
 * Log file change listener hook
 * 
 * This hook monitors for log file changes and invalidates the query cache
 * to ensure components use the correct data for the newly selected log file.
 */
import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogFileContext } from '../App';
import { pythonApiFetch } from '../utils/pythonApiClient';

// Cache timeout in milliseconds (30 seconds)
const POLLING_INTERVAL = 60000; // 30 seconds

/**
 * Hook to handle log file changes and manage query cache
 */
export function usePrefetching() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const currentLogFileId = useContext(LogFileContext);
    const [lastLogFileId, setLastLogFileId] = useState<string | null>(currentLogFileId);
    
    // Track log file changes with less frequent direct API checks
    useEffect(() => {
        // Initial setup
        setLastLogFileId(currentLogFileId);
        
        // Check for log file changes directly from the API much less frequently (every 30 seconds)
        const intervalId = setInterval(async () => {
            try {
                // Check if the context/window cache has changed first
                if (window.__logFileCache?.id !== lastLogFileId && lastLogFileId !== null) {
                    console.info('Log file changed via UI, invalidating cache...', 
                      { from: lastLogFileId, to: window.__logFileCache?.id });
                    
                    queryClient.invalidateQueries({ queryKey: ['sql'] });
                    setLastLogFileId(window.__logFileCache?.id || null);
                    return;
                }
                
                // Only make the API call if enough time has passed
                if (!window.__logFileCache || 
                    Date.now() - window.__logFileCache.timestamp > POLLING_INTERVAL) {
                    
                    // Fetch the current log file from API directly
                    const response = await pythonApiFetch<{log_file_id: string | null}>('/active-log-file');
                    const apiLogFileId = response.log_file_id;
                    
                    // Update window cache
                    if (window.__logFileCache) {
                        window.__logFileCache.id = apiLogFileId;
                        window.__logFileCache.timestamp = Date.now();
                    }
                    
                    // Only invalidate if log file has changed
                    if (apiLogFileId !== lastLogFileId && lastLogFileId !== null) {
                        console.info('Log file changed from server, invalidating cache...', 
                          { from: lastLogFileId, to: apiLogFileId });
                        
                        queryClient.invalidateQueries({ queryKey: ['sql'] });
                        setLastLogFileId(apiLogFileId);
                    }
                }
            } catch (error) {
                console.error('Error checking for log file changes:', error);
            }
        }, POLLING_INTERVAL); // Every 30 seconds
        
        return () => clearInterval(intervalId);
    }, [queryClient, lastLogFileId, currentLogFileId]);
    
    // Return empty methods for backward compatibility
    return {
        prefetchTrafficInsight: () => {/* No-op */},
        prefetchGeographicInsight: () => {/* No-op */},
    };
} 