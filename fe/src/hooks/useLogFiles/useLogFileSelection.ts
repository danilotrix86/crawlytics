import { useCallback, useEffect, useOptimistic, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { defaultQueryOptions } from '../queries/types';
import { LogFile, COOKIE_NAME, COOKIE_MAX_AGE } from './types';
import { setCookie, getCookie, deleteCookie, getActiveLogFileId, setActiveLogFileId } from '../../utils/cookies';
import { useLogFileDeletion } from './useLogFileDeletion';

/**
 * Hook to manage log file selection state and persist it in the database
 */
export function useLogFileSelection() {
    const navigate = useNavigate();

    // Fetch all available log files using TanStack Query with Suspense
    const { data: logFiles } = useSuspenseQuery<LogFile[]>({
        queryKey: ['logFiles'],
        queryFn: async () => {
            try {
                return await pythonApiFetch<LogFile[]>('/get-logs-name');
            } catch (error) {
                console.error('Failed to fetch log files:', error);
                throw error;
            }
        },
        ...defaultQueryOptions,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Fetch the active log file using TanStack Query with Suspense
    const { data: activeLogFileData, refetch: refetchActiveLogFile } = useSuspenseQuery<{log_file_id: string | null}>({
        queryKey: ['activeLogFile'],
        queryFn: async () => {
            try {
                return await pythonApiFetch<{log_file_id: string | null}>('/active-log-file');
            } catch (error) {
                console.error('Failed to fetch active log file:', error);
                throw error;
            }
        },
        ...defaultQueryOptions,
        staleTime: 10 * 1000, // 10 seconds
    });

    // Get the initial selected log ID from active log file or first available log
    const getInitialSelectedLogId = useCallback(() => {
        const activeLogFileId = activeLogFileData?.log_file_id;
        // Check if the active log file actually exists in the fetched logFiles
        if (activeLogFileId && logFiles?.some(file => file.log_file_id === activeLogFileId)) {
            return activeLogFileId;
        }
        // If no valid active log or logFiles, return the first log file's ID or null
        return logFiles && logFiles.length > 0 ? logFiles[0].log_file_id : null;
    }, [logFiles, activeLogFileData]);

    // Use React 19's useOptimistic for UI updates
    const [selectedLogId, setSelectedLogId] = useOptimistic(
        getInitialSelectedLogId(),
        (current, newId: string | null) => newId // Allow null for when no file is selected
    );

    // Function to select a log file and update the database
    const selectLogFile = useCallback((logId: string | null) => {
        if (logId) {
            // Update active log file in the database
            setActiveLogFileId(logId);
            startTransition(() => {
                setSelectedLogId(logId);
                // Refetch to ensure UI is in sync with database
                refetchActiveLogFile();
            });
        } else {
            startTransition(() => {
                setSelectedLogId(null);
            });
        }
    }, [setSelectedLogId, refetchActiveLogFile]);

    // Update initial selection when logFiles or activeLogFile data changes
    useEffect(() => {
        const initialId = getInitialSelectedLogId();
        if (selectedLogId !== initialId && initialId) {
            setSelectedLogId(initialId);
            // Update active log file in the database if needed
            if (activeLogFileData?.log_file_id !== initialId) {
                setActiveLogFileId(initialId);
                // Refetch to ensure UI is in sync with database
                refetchActiveLogFile();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logFiles, activeLogFileData, getInitialSelectedLogId]);

    // Use the separate deletion hook
    const { deleteLogFile, deletingLogId } = useLogFileDeletion({
        selectedLogId,
        selectLogFile
    });

    // Redirect to upload page if no log files are available (except for Settings page)
    useEffect(() => {
        // Ensure deletion isn't pending when checking length
        if (logFiles && logFiles.length === 0 && !deletingLogId) {
            // For hash-based routing, check the hash portion of the URL
            const currentHash = window.location.hash.replace('#', '');
            
            // Only redirect if not already on upload page and not on settings page
            if (currentHash !== '/upload' && currentHash !== '/settings') {
                console.log("No log files found, redirecting to upload.");
                navigate('/upload');
            }
        }
    }, [logFiles, navigate, deletingLogId]);

    // Get the selected log file object from the ID
    const selectedLogFile = logFiles?.find(file => file.log_file_id === selectedLogId) || null;

    return {
        logFiles,
        selectedLogId,
        selectedLogFile,
        selectLogFile,
        deleteLogFile,
        deletingLogId,
    };
} 