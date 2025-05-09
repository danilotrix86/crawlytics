import React from 'react';

/**
 * Loading state for log files
 */
export const LogFilesLoading: React.FC = () => (
    <div className="px-3 py-2">
        <div className="space-y-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
            ))}
        </div>
    </div>
); 