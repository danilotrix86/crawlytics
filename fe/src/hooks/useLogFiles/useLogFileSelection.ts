import { useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { defaultQueryOptions } from '../queries/types';
import { LogFile } from './types';
import { setActiveLogFileId } from '../../utils/cookies';
import { LogFileContext } from '../../App';
import { useLogFileDeletion } from './useLogFileDeletion';

/**
 * The list of imported log files and the selected one.
 *
 * The selection comes from the shared store (utils/cookies.ts, exposed via
 * LogFileContext), so every component sees the same value immediately.
 */
export function useLogFileSelection() {
    const navigate = useNavigate();
    const selectedLogId = useContext(LogFileContext);

    const { data: logFiles } = useSuspenseQuery<LogFile[]>({
        queryKey: ['logFiles'],
        queryFn: () => pythonApiFetch<LogFile[]>('/get-logs-name'),
        ...defaultQueryOptions,
        staleTime: 5 * 60 * 1000,
    });

    const selectLogFile = useCallback((logId: string | null) => {
        setActiveLogFileId(logId);
    }, []);

    // Keep the selection valid: if the selected file no longer exists (or none is
    // selected), fall back to the most recent import.
    useEffect(() => {
        if (!logFiles) return;
        const exists = selectedLogId && logFiles.some((file) => file.log_file_id === selectedLogId);
        if (!exists) {
            setActiveLogFileId(logFiles.length > 0 ? logFiles[0].log_file_id : null);
        }
    }, [logFiles, selectedLogId]);

    const { deleteLogFile, deletingLogId } = useLogFileDeletion({ selectedLogId, selectLogFile });

    // Redirect to the upload page when there are no log files (except from Settings)
    useEffect(() => {
        if (logFiles && logFiles.length === 0 && !deletingLogId) {
            const currentHash = window.location.hash.replace('#', '');
            if (currentHash !== '/upload' && currentHash !== '/settings') {
                navigate('/upload');
            }
        }
    }, [logFiles, navigate, deletingLogId]);

    const selectedLogFile = logFiles?.find((file) => file.log_file_id === selectedLogId) || null;

    return {
        logFiles,
        selectedLogId,
        selectedLogFile,
        selectLogFile,
        deleteLogFile,
        deletingLogId,
    };
}
