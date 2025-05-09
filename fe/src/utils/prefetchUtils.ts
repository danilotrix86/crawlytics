/**
 * Prefetching utilities for React 19
 */
import { createApiResource, createSQLQueryResource } from './cacheUtils';

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

/**
 * Prefetches data and stores it in the cache
 * Useful for preloading data before it's needed
 */
export function prefetch<T>(
	endpoint: string,
	options: RequestInit = {},
	ttl: number = DEFAULT_CACHE_TTL
): void {
	createApiResource<T>(endpoint, options, ttl);
}

/**
 * Prefetches SQL query results and stores them in the cache
 */
export function prefetchSQLQuery<T>(
	query: string,
	params: any[] = [],
	limit: number = 1000,
	ttl: number = DEFAULT_CACHE_TTL
): void {
	createSQLQueryResource<T>(query, params, limit, ttl);
} 