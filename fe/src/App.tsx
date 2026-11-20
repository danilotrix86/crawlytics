import React, { createContext, useEffect, useState } from 'react';
import AppRoutes from './routes/AppRoutes';
import CardLoadingSpinner from './components/ui/CardLoadingSpinner';
import { initActiveLogFile, subscribeActiveLogFile } from './utils/cookies';

// ===== Log File Context Management =====
// The selected log file id. SQL query keys include it, so changing the
// selection refetches every chart with the new file.
export const LogFileContext = createContext<string | null>(null);

/**
 * Loads the selected log file once, then follows changes from the store in
 * utils/cookies.ts. Shows a spinner until the first value is known.
 */
const LogFileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logFileId, setLogFileId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeActiveLogFile(setLogFileId);
        initActiveLogFile()
            .then(setLogFileId)
            .finally(() => setLoading(false));
        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <CardLoadingSpinner />
                <span className="ml-2 text-gray-600">Loading application data...</span>
            </div>
        );
    }

    return (
        <LogFileContext.Provider value={logFileId}>
            {children}
        </LogFileContext.Provider>
    );
};

/**
 * Main application component
 */
const App: React.FC = () => (
    <LogFileProvider>
        <AppRoutes />
    </LogFileProvider>
);

export default App;
