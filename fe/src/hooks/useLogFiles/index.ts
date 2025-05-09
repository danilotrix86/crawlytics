import { useLogFileSelection } from './useLogFileSelection';
export * from './useLogFileSelection';
export * from './types';
export * from './useLogFileDeletion';

/**
 * Simple helper to get the currently selected log file ID
 * 
 * @returns The currently selected log file ID or null if none is selected
 */
export function useSelectedLogFile(): string | null {
    const { selectedLogId } = useLogFileSelection();
    return selectedLogId;
} 