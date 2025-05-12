import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { prefetchTrafficInsightData } from './utils/prefetchTrafficInsight';

// Create a client with improved configuration for static data
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 24 * 60 * 60 * 1000, // 24 hours - since data is static
			gcTime: 30 * 60 * 1000, // 30 minutes (replaces cacheTime)
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

// Prefetch common data that will be needed across the application
// This helps avoid waterfalls and ensures data is ready when components need it
const prefetchCriticalData = async () => {
	try {
		// Prefetch Traffic Insight and Geographic Insight data for faster navigation
		prefetchTrafficInsightData(queryClient);
		
		// Other critical data prefetching...
		// await queryClient.prefetchQuery({ 
		//   queryKey: ['critical-data'], 
		//   queryFn: () => fetch('/api/critical-data').then(res => res.json()) 
		// });
	} catch (error) {
		console.error('Error prefetching critical data:', error);
	}
};

// Call the prefetch function
prefetchCriticalData();

// Create a navigation event listener to prefetch data when user hovers over links
document.addEventListener('DOMContentLoaded', () => {
	// Immediately prefetch all insight data when DOM loads
	setTimeout(() => {
		prefetchTrafficInsightData(queryClient);
	}, 1000);

	// Set up event delegation for tracking mouse hover over navigation links
	document.body.addEventListener('mouseover', (e) => {
		const target = e.target as HTMLElement;
		// Check for links with both regular and hash paths
		const trafficLink = target.closest('a[href="/traffic-insight"], a[href="#/traffic-insight"]');
		const geoLink = target.closest('a[href="/geographic-insight"], a[href="#/geographic-insight"]');
		
		if (trafficLink || geoLink) {
			// User is hovering over a link to one of the insight pages
			prefetchTrafficInsightData(queryClient);
		}
	});
});

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement, {
	// React 19 error handling options
	onCaughtError: (error, errorInfo) => {
		// Log errors caught by ErrorBoundaries
		console.error('Error caught by ErrorBoundary:', error);
		console.error('Component stack:', errorInfo);
		// You could send to an error tracking service here
	},
	onUncaughtError: (error, errorInfo) => {
		// Handle errors not caught by any error boundary
		console.error('Uncaught React error:', error);
		console.error('Component stack:', errorInfo);
		// Could trigger global error UI or reporting
	},
	onRecoverableError: (error, errorInfo) => {
		// Handle errors that React automatically recovered from
		console.warn('React recovered from error:', error);
		console.warn('Component stack:', errorInfo);
	}
}).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<HashRouter>
				<App />
			</HashRouter>
		</QueryClientProvider>
	</StrictMode>,
); 