/**
 * Cookie helpers, plus the single source of truth for the selected log file.
 *
 * The selected log file is stored in the database (log_files.in_use) so it
 * survives reloads. In the browser it lives in one in-memory store, loaded
 * once at startup by LogFileProvider. Reads are synchronous and always
 * current; writes update the store immediately, notify subscribers (which
 * re-renders the app with the new LogFileContext value) and persist to the API.
 *
 * getCookie/setCookie('selected_log_file') are kept as aliases so existing
 * components keep working.
 */
import { pythonApiFetch } from './pythonApiClient';

const SELECTED_LOG_FILE = 'selected_log_file';

let activeLogFileId: string | null = null;
const listeners = new Set<(id: string | null) => void>();

/** Load the selected log file from the database. Called once by LogFileProvider. */
export async function initActiveLogFile(): Promise<string | null> {
    try {
        const response = await pythonApiFetch<{ log_file_id: string | null }>('/active-log-file');
        activeLogFileId = response.log_file_id;
    } catch (error) {
        console.error('Error loading the active log file:', error);
        activeLogFileId = null;
    }
    return activeLogFileId;
}

/** Subscribe to selection changes. Returns an unsubscribe function. */
export function subscribeActiveLogFile(listener: (id: string | null) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** The currently selected log file id */
export function getActiveLogFileId(): string | null {
    return activeLogFileId;
}

/** Select a log file: updates the app immediately and saves the choice in the database */
export function setActiveLogFileId(logFileId: string | null, persist = true): void {
    if (logFileId === activeLogFileId) return;
    activeLogFileId = logFileId;
    listeners.forEach((listener) => listener(logFileId));
    if (persist && logFileId) {
        pythonApiFetch(`/active-log-file/${encodeURIComponent(logFileId)}`, { method: 'POST' }).catch((error) =>
            console.error('Error saving the active log file:', error)
        );
    }
}

/**
 * Get a cookie value by name. 'selected_log_file' reads the selected log file.
 */
export function getCookie(name: string): string | null {
    if (name === SELECTED_LOG_FILE) {
        return activeLogFileId;
    }
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
    return cookieValue ? decodeURIComponent(cookieValue) : null;
}

/**
 * Set a cookie. 'selected_log_file' selects a log file instead.
 */
export function setCookie(name: string, value: string, maxAgeInSeconds: number): void {
    if (name === SELECTED_LOG_FILE) {
        setActiveLogFileId(value);
        return;
    }
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeInSeconds}; path=/; SameSite=Lax`;
}

/**
 * Delete a cookie. For 'selected_log_file' this is a no-op: the selection is
 * cleared by the log file list when the selected file no longer exists.
 */
export function deleteCookie(name: string): void {
    if (name === SELECTED_LOG_FILE) {
        return;
    }
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}
