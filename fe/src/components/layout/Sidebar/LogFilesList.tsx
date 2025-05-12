import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogFileSelection, LogFile } from '../../../hooks/useLogFiles';
import { LogFileItem } from './LogFileItem';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchTrafficInsightData } from '../../../utils/prefetchTrafficInsight';

/**
 * Component that renders the list of log files
 */
export const LogFilesList: React.FC = () => {
    // Get data and functions from the hook
    const { 
        logFiles, 
        selectedLogId, 
        selectLogFile, 
        deleteLogFile, 
        deletingLogId
    } = useLogFileSelection();

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State for managing the confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<LogFile | null>(null);

    if (!logFiles || logFiles.length === 0) {
        return (
            <div className="px-3 py-2 text-gray-500 italic">
                No log files found.
            </div>
        );
    }

    // Handler for selecting a file - now using React Router navigation
    const handleSelectFile = (e: React.MouseEvent<HTMLElement>, fileId: string) => {
        e.preventDefault();
        if (selectedLogId !== fileId) {
            selectLogFile(fileId);
            
            // Invalidate queries related to the log file to force refetch with new log file ID
            queryClient.invalidateQueries({ queryKey: ['sql'] });
            
            // Prefetch data for both insight pages with the new log file
            setTimeout(() => {
                prefetchTrafficInsightData(queryClient);
            }, 100);
            
            // Navigate to the current page to refresh data without full page reload
            navigate(window.location.pathname);
        }
    };

    // Handler for initiating the delete process (opens modal)
    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>, file: LogFile) => {
        e.stopPropagation();
        e.preventDefault();
        setFileToDelete(file);
        setShowConfirmModal(true);
    };

    // Handler for confirming the deletion from the modal
    const confirmDeletion = () => {
        if (fileToDelete) {
            deleteLogFile(fileToDelete.log_file_id);
        }
        setShowConfirmModal(false);
        setFileToDelete(null);
    };

    // Handler for closing the modal without deleting
    const closeModal = () => {
        setShowConfirmModal(false);
        setFileToDelete(null);
    };

    return (
        <>
            <div className="space-y-1.5 px-2 py-2 max-h-[19rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
                {logFiles
                    .slice()
                    .sort((a, b) => {
                        if (a.log_file_id === selectedLogId) return -1;
                        if (b.log_file_id === selectedLogId) return 1;
                        return new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime();
                    })
                    .map((file) => (
                        <LogFileItem
                            key={file.log_file_id}
                            file={file}
                            isSelected={selectedLogId === file.log_file_id}
                            deletingLogId={deletingLogId}
                            onSelect={handleSelectFile}
                            onDelete={handleDeleteClick}
                        />
                    ))}
            </div>

            <DeleteConfirmationModal
                showModal={showConfirmModal}
                fileToDelete={fileToDelete}
                deletingLogId={deletingLogId}
                onClose={closeModal}
                onConfirm={confirmDeletion}
            />
        </>
    );
}; 