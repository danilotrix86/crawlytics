/**
 * Cache utilities for React 19 and TanStack Query
 */
import { pythonApiFetch } from './pythonApiClient';
import { executeSQLQuery } from './sqlClient';
import { QueryClient } from '@tanstack/react-query';

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Creates a prefetched query that can be used with React 19's Suspense
 * 
 * @param queryClient - TanStack Query client instance
 * @param queryKey - The query key to prefetch
 * @param queryFn - The query function to execute
 * @returns Promise that resolves when prefetching is complete
 */
export function prefetchQueryForSuspense(
	queryClient: QueryClient,
	queryKey: unknown[],
	queryFn: () => Promise<unknown>,
	staleTime = DEFAULT_CACHE_TTL
) {
	return queryClient.prefetchQuery({
		queryKey,
		queryFn,
		staleTime
	});
}

/**
 * Ensures data is available in cache for Suspense rendering
 * Useful for route transitions and server-side rendering
 */
export async function preloadQueries(
	queryClient: QueryClient,
	queries: Array<{
		queryKey: unknown[],
		queryFn: () => Promise<unknown>,
		staleTime?: number
	}>
) {
	return Promise.all(
		queries.map(({ queryKey, queryFn, staleTime }) =>
			prefetchQueryForSuspense(queryClient, queryKey, queryFn, staleTime)
		)
	);
}

/**
 * Prefetches SQL data for use with Suspense components
 * 
 * @param queryClient - QueryClient instance
 * @param query - SQL query to execute
 * @param params - Query parameters
 * @param limit - Result limit
 */
export function prefetchSQLQuery<T = unknown>(
	queryClient: QueryClient,
	query: string,
	params: any[] = [],
	limit: number = 1000
) {
	const queryKey = ['sql', query, params, limit];
	
	return prefetchQueryForSuspense(
		queryClient,
		queryKey,
		() => executeSQLQuery<T>(query, params, limit)
	);
}

/**
 * Prefetches API data for use with Suspense components
 * 
 * @param queryClient - QueryClient instance
 * @param endpoint - API endpoint
 * @param options - Fetch options
 */
export function prefetchApiData<T = unknown>(
	queryClient: QueryClient,
	endpoint: string,
	options: RequestInit = {}
) {
	const queryKey = ['api', endpoint, options];
	
	return prefetchQueryForSuspense(
		queryClient,
		queryKey,
		() => pythonApiFetch<T>(endpoint, options)
	);
}

/**
 * Legacy cache utilities (maintained for backward compatibility)
 */

// Modern request cache using AbortController for cancelability
const requestCache = new Map<string, {
	promise: Promise<any>;
	controller: AbortController;
	timestamp: number;
}>();

/**
 * Creates a cached SQL query resource for use with React 19's use() hook
 * @deprecated Use useSuspenseQuery from TanStack Query instead
 */
export function createSQLQueryResource<T>(
	query: string,
	params: any[] = [],
	limit: number = 1000,
	ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
	// Create cache key based on the query and params
	const cacheKey = JSON.stringify({ query, params, limit });
	
	const now = Date.now();
	const cachedItem = requestCache.get(cacheKey);
	
	// Return cached promise if it exists and isn't expired
	if (cachedItem && (now - cachedItem.timestamp) < ttl) {
		return cachedItem.promise;
	}
	
	// Cancel any existing request
	if (cachedItem) {
		cachedItem.controller.abort();
		requestCache.delete(cacheKey);
	}
	
	// Create new AbortController for this request
	const controller = new AbortController();
	
	// Create and cache the promise
	const promise = executeSQLQuery<T>(query, params, limit);
	
	requestCache.set(cacheKey, {
		promise,
		controller,
		timestamp: now
	});
	
	// Remove from cache after TTL
	promise.finally(() => {
		setTimeout(() => {
			const item = requestCache.get(cacheKey);
			if (item && item.promise === promise) {
				requestCache.delete(cacheKey);
			}
		}, ttl);
	});
	
	return promise;
}

/**
 * Creates a generic API resource for use with React 19's use() hook
 * @deprecated Use useSuspenseQuery from TanStack Query instead
 */
export function createApiResource<T>(
	endpoint: string,
	options: RequestInit = {},
	ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
	// Create cache key based on the endpoint and options
	const cacheKey = JSON.stringify({ endpoint, options });
	
	const now = Date.now();
	const cachedItem = requestCache.get(cacheKey);
	
	// Return cached promise if it exists and isn't expired
	if (cachedItem && (now - cachedItem.timestamp) < ttl) {
		return cachedItem.promise;
	}
	
	// Cancel any existing request
	if (cachedItem) {
		cachedItem.controller.abort();
		requestCache.delete(cacheKey);
	}
	
	// Create new AbortController for this request
	const controller = new AbortController();
	
	// Create and cache the promise
	const promise = pythonApiFetch<T>(endpoint, {
		...options,
		signal: controller.signal
	});
	
	requestCache.set(cacheKey, {
		promise,
		controller,
		timestamp: now
	});
	
	// Remove from cache after TTL
	promise.finally(() => {
		setTimeout(() => {
			const item = requestCache.get(cacheKey);
			if (item && item.promise === promise) {
				requestCache.delete(cacheKey);
			}
		}, ttl);
	});
	
	return promise;
}

/**
 * Clears the entire request cache or a specific key
 */
export function clearCache(cacheKey?: string): void {
	if (cacheKey) {
		const item = requestCache.get(cacheKey);
		if (item) {
			item.controller.abort();
			requestCache.delete(cacheKey);
		}
		return;
	}
	
	// Clear all cache entries
	requestCache.forEach((item) => {
		item.controller.abort();
	});
	requestCache.clear();
} 