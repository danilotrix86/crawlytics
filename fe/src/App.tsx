import React, { createContext, useEffect, useState, Suspense } from 'react';
import AppRoutes from './routes/AppRoutes';
import { usePrefetching } from './hooks/usePrefetching';
import { pythonApiFetch } from './utils/pythonApiClient';
import CardLoadingSpinner from './components/ui/CardLoadingSpinner';

// Context for the active log file ID
export const LogFileContext = createContext<string | null>(null);

// Global cache to store the active log file ID
// Also expose it through window for cookies.ts to access
let logFileCache: {
    id: string | null;
    timestamp: number;
} = {
    id: null,
    timestamp: 0
};

// Add to window for cookies.ts to access
if (typeof window !== 'undefined') {
    window.__logFileCache = logFileCache;
}

// Component that prefetches the active log file
const LogFileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logFileId, setLogFileId] = useState<string | null>(logFileCache.id);
    
    // Fetch the active log file when the component mounts
    useEffect(() => {
        // Skip if we already have a recent value
        if (logFileCache.id && Date.now() - logFileCache.timestamp < 30 * 1000) {
            setLogFileId(logFileCache.id);
            return;
        }
        
        // Fetch the active log file
        pythonApiFetch<{ log_file_id: string | null }>('/active-log-file')
            .then(response => {
                const newId = response.log_file_id;
                console.info(`[LogFile] Fetched active log file: ${newId}`);
                
                // Update the global cache
                logFileCache.id = newId;
                logFileCache.timestamp = Date.now();
                
                // Also update window.__logFileCache for cookies.ts
                if (typeof window !== 'undefined') {
                    window.__logFileCache = logFileCache;
                }
                
                // Update state
                setLogFileId(newId);
            })
            .catch(error => {
                console.error('Error fetching active log file:', error);
                setLogFileId('all'); // Fallback to 'all'
            });
    }, []);
    
    // Show a loading spinner until the log file is loaded
    if (logFileId === null) {
        return (
            <div className="flex justify-center items-center h-screen">
                <CardLoadingSpinner />
                <span className="ml-2 text-gray-600">Loading application data...</span>
            </div>
        );
    }
    
    // Provide the log file ID to all children
    return (
        <LogFileContext.Provider value={logFileId}>
            {children}
        </LogFileContext.Provider>
    );
};

const App: React.FC = () => {
	// Monitor for log file changes to invalidate the cache
	usePrefetching();

	return (
		<LogFileProvider>
			<AppRoutes />
		</LogFileProvider>
	);
}

export default App; 