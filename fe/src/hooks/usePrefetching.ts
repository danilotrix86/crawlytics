/**
 * Prefetching hook for React navigation
 * 
 * This hook enables intelligent prefetching of data based on navigation patterns.
 * It can be used within layout components to preload data for child routes
 * when a user is likely to navigate to them.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { prefetchTrafficInsightData } from '../utils/prefetchTrafficInsight';

/**
 * Routes that should trigger related data prefetching when active
 */
const PREFETCH_MAPPING = {
    '/dashboard': ['/traffic-insight'], // When on dashboard, prefetch traffic insight data
    // Add more mappings as needed
};

/**
 * Hook to intelligently prefetch data for likely navigation paths
 * 
 * @returns Methods to manually trigger prefetching
 */
export function usePrefetching() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const currentPath = location.pathname;

    // Map of prefetching functions by route
    const prefetchFunctionsByRoute = {
        '/traffic-insight': () => prefetchTrafficInsightData(queryClient),
        // Add more routes and their prefetch functions here
    };

    // Prefetch based on current location
    useEffect(() => {
        // Get routes to prefetch based on current location
        const routesToPrefetch = PREFETCH_MAPPING[currentPath as keyof typeof PREFETCH_MAPPING] || [];
        
        // Perform prefetching for each related route
        routesToPrefetch.forEach(route => {
            const prefetchFn = prefetchFunctionsByRoute[route as keyof typeof prefetchFunctionsByRoute];
            if (prefetchFn) {
                // Use a small delay to avoid competing with current page rendering
                setTimeout(() => {
                    prefetchFn();
                }, 1000);
            }
        });
    }, [currentPath, queryClient]);

    // Return methods to manually trigger prefetching
    return {
        prefetchTrafficInsight: () => prefetchTrafficInsightData(queryClient),
        // Add more prefetching methods as needed
    };
} 