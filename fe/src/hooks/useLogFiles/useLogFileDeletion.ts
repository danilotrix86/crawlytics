import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDeleteLogFileMutation } from '../queries/apiQueries';
import { startTransition } from 'react';
import { LogFile } from './types';

interface UseLogFileDeletionProps {
    selectedLogId: string | null;
    selectLogFile: (logId: string | null) => void;
}

/**
 * Hook for handling log file deletion logic
 */
export function useLogFileDeletion({ selectedLogId, selectLogFile }: UseLogFileDeletionProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

    const deleteMutation = useDeleteLogFileMutation({
        onSuccess: (data, deletedLogId) => {
            console.log(`Log file ${deletedLogId} deleted successfully.`);
            // Handle selection change if the deleted file was the selected one
            // Wrap state updates in startTransition to avoid warnings
            startTransition(() => {
                if (selectedLogId === deletedLogId) {
                    const currentFiles = queryClient.getQueryData<LogFile[]>(['logFiles']) ?? [];
                    const remainingFiles = currentFiles.filter(file => file.log_file_id !== deletedLogId);
                    if (remainingFiles.length > 0) {
                        // Select the next available file
                        selectLogFile(remainingFiles[0].log_file_id);
                    } else {
                        // No files left, navigate to upload if not on settings page
                        selectLogFile(null);
                        
                        // For hash-based routing, check the hash portion of the URL
                        const currentHash = window.location.hash.replace('#', '');
                        if (currentHash !== '/settings') {
                            navigate('/upload');
                        }
                    }
                }
                // Invalidate the queries *after* potential state updates within the transition
                queryClient.invalidateQueries({ queryKey: ['logFiles'] });
                // Also invalidate the active log file query
                queryClient.invalidateQueries({ queryKey: ['activeLogFile'] });
                
                // Refresh the page to reflect the changes
                window.location.reload();
            });
        },
        onError: (error, deletedLogId) => {
            console.error(`Failed to delete log file ${deletedLogId}:`, error);
        },
        // Use onSettled to clear the deleting state regardless of success/error
        onSettled: () => {
            setDeletingLogId(null);
        },
    });

    // Function to trigger the deletion mutation
    const deleteLogFile = useCallback((logId: string) => {
        setDeletingLogId(logId); // Set the ID being deleted *before* mutating
        deleteMutation.mutate(logId);
    }, [deleteMutation]);

    return {
        deleteLogFile,
        deletingLogId
    };
} 