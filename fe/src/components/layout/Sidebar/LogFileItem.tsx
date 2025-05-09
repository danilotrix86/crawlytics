import React from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { FileChartBar, TrashBin } from 'flowbite-react-icons/outline';
import { LogFile } from '../../../hooks/useLogFiles';

interface LogFileItemProps {
    file: LogFile;
    isSelected: boolean;
    deletingLogId: string | null;
    onSelect: (e: React.MouseEvent<HTMLElement>, fileId: string) => void;
    onDelete: (e: React.MouseEvent<HTMLButtonElement>, file: LogFile) => void;
}

/**
 * Format timestamp to be more readable
 */
const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
};

/**
 * A single log file item component
 */
export const LogFileItem: React.FC<LogFileItemProps> = ({
    file,
    isSelected,
    deletingLogId,
    onSelect,
    onDelete
}) => {
    // Custom click handler to force page reload when selecting a log file
    const handleLogFileClick = (e: React.MouseEvent<HTMLElement>) => {
        // Set a cookie to track the selected log file
        document.cookie = `selectedLogFile=${file.log_file_id}; path=/; max-age=86400`;
        
        // Call the original onSelect handler
        onSelect(e, file.log_file_id);
        
        // Force a page reload to ensure data is refreshed
        window.location.reload();
    };
    
    return (
        <div className={`relative group rounded-lg overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
            <Link 
                to="#"
                className="block transition-standard rounded-lg hover:translate-x-1 overflow-hidden w-full cursor-default"
                onClick={handleLogFileClick}
                aria-current={isSelected ? 'page' : undefined}
            >
                <div className={`flex items-center gap-2 p-2 rounded-lg ${isSelected 
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700'} 
                    hover:bg-blue-50 dark:hover:bg-blue-900/20 border transition-colors-standard`}>
                    <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 rounded-md text-white shadow-sm">
                        <FileChartBar className="w-4 h-4" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={file.file_name}>
                            {file.file_name}
                        </div>
                        {file.upload_timestamp && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatTimestamp(file.upload_timestamp)}
                            </div>
                        )}
                    </div>
                    <div className="w-6 flex-shrink-0"></div> 
                </div>
            </Link>
            <button
                onClick={(e) => onDelete(e, file)}
                disabled={!!deletingLogId} 
                className={`absolute top-1/2 right-1.5 transform -translate-y-1/2 p-1 rounded-md 
                            text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 
                            hover:bg-red-100 dark:hover:bg-red-900/30 
                            focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-800
                            transition-opacity duration-150 ease-in-out
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent
                            cursor-pointer`}
                aria-label={`Delete log file ${file.file_name}`}
            >
                {deletingLogId === file.log_file_id ? ( 
                    <Spinner size="xs" aria-label="Deleting..." />
                ) : (
                    <TrashBin className="w-4 h-4" /> 
                )}
            </button>
        </div>
    );
}; 