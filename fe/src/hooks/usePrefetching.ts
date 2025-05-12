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
    '/dashboard': ['/traffic-insight', '/geographic-insight'], // When on dashboard, prefetch both insights
    '#/dashboard': ['#/traffic-insight', '#/geographic-insight'], // HashRouter versions
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
    const hashPath = '#' + location.pathname;

    // Map of prefetching functions by route
    const prefetchFunctionsByRoute = {
        '/traffic-insight': () => prefetchTrafficInsightData(queryClient),
        '/geographic-insight': () => prefetchTrafficInsightData(queryClient),
        '#/traffic-insight': () => prefetchTrafficInsightData(queryClient),
        '#/geographic-insight': () => prefetchTrafficInsightData(queryClient),
        // Add more routes and their prefetch functions here
    };

    // Prefetch based on current location
    useEffect(() => {
        // Try both paths - with and without hash
        let routesToPrefetch = PREFETCH_MAPPING[currentPath as keyof typeof PREFETCH_MAPPING] || [];
        
        // If no routes found with pathname, try with hash path
        if (routesToPrefetch.length === 0) {
            routesToPrefetch = PREFETCH_MAPPING[hashPath as keyof typeof PREFETCH_MAPPING] || [];
        }
        
        // Always prefetch both insights when on any dashboard screen
        if (currentPath.includes('dashboard') || hashPath.includes('dashboard')) {
            // Force prefetch both insights
            prefetchTrafficInsightData(queryClient);
            return;
        }
        
        // Perform prefetching for each related route
        routesToPrefetch.forEach(route => {
            const prefetchFn = prefetchFunctionsByRoute[route as keyof typeof prefetchFunctionsByRoute];
            if (prefetchFn) {
                // Use a small delay to avoid competing with current page rendering
                setTimeout(() => {
                    prefetchFn();
                }, 500); // Reduced from 1000ms to 500ms for faster prefetching
            }
        });
    }, [currentPath, hashPath, queryClient]);

    // Return methods to manually trigger prefetching
    return {
        prefetchTrafficInsight: () => prefetchTrafficInsightData(queryClient),
        prefetchGeographicInsight: () => prefetchTrafficInsightData(queryClient),
        // Add more prefetching methods as needed
    };
} 