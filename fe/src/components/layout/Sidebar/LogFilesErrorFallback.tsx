import React from 'react';

interface LogFilesErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

/**
 * Error fallback component for log files section
 */
export const LogFilesErrorFallback: React.FC<LogFilesErrorFallbackProps> = ({ 
    error, 
    resetErrorBoundary 
}) => {
    return (
        <div className="px-3 py-2">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">Failed to load log files</p>
                <button 
                    onClick={resetErrorBoundary}
                    className="mt-2 text-xs font-medium px-2 py-1 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}; 