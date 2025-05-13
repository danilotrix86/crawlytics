import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Create a client optimized for static log file data with deduplication
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity, // Never consider data stale since log files don't change
			gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in memory for a day
			refetchOnWindowFocus: false, // Disable since data is static
			refetchOnMount: false, // Disable refetching when components mount
			refetchOnReconnect: false, // Disable refetching when reconnecting
			retry: (failureCount, error) => {
				// Don't retry on 404s or other client errors
				if (error instanceof Error && 'status' in error && (error as any).status < 500) {
					return false;
				}
				return failureCount < 2; // Retry twice for server errors
			},
		},
	},
});

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement, {
	// React 19 error handling options
	onCaughtError: (error, errorInfo) => {
		// Log errors caught by ErrorBoundaries
		console.error('Error caught by ErrorBoundary:', error);
		console.error('Component stack:', errorInfo);
	},
	onUncaughtError: (error, errorInfo) => {
		// Handle errors not caught by any error boundary
		console.error('Uncaught React error:', error);
		console.error('Component stack:', errorInfo);
	},
	onRecoverableError: (error, errorInfo) => {
		// Handle errors that React automatically recovered from
		console.warn('React recovered from error:', error);
		console.warn('Component stack:', errorInfo);
	}
}).render(
	// Removing StrictMode to prevent double mounting in development
	<QueryClientProvider client={queryClient}>
		<HashRouter>
			<App />
		</HashRouter>
		<ReactQueryDevtools initialIsOpen={false} />
	</QueryClientProvider>
); 