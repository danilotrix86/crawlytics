import React, { ComponentType, ReactNode, Suspense, useMemo, useRef, useEffect, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuspenseQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { defaultQueryOptions, ApiError } from './queries/types';
import { pythonApiFetch } from '../utils/pythonApiClient';
import { getCookie } from '../utils/cookies';
import { LogFileContext } from '../App';

// Query instance cache for deduplication
const queryCache = new Map<string, Promise<any>>();

// Global reference to queries that are currently rendering
// This helps prevent duplicate requests during initial render phase
const renderingQueries = new Set<string>();

/**
 * Generate a stable key for query deduplication
 */
function getStableQueryKey(sqlQuery: string, params: any[], limit: number, logFileId: string): string {
	return `${logFileId}:${limit}:${sqlQuery}:${JSON.stringify(params)}`;
}

/**
 * Hook version of createSqlComponent using Suspense for data fetching
 * Optimized for static log files with infinite cache life and request deduplication
 */
export function useSqlData<DataType = any, TransformedType = DataType>(
	sqlQuery: string,
	params: any[] = [],
	transformer?: (data: DataType) => TransformedType,
	limit: number = 1000
) {
	// DEBUG: Log component mount/render with SQL query hash
	console.debug(`[SQL Debug] useSqlData called with query hash: ${sqlQuery.substring(0, 20)}...`);
	
	// Get current log file ID from context instead of cookies
	const logFileId = useContext(LogFileContext) || 'all';
	
	// Create a stable query key for the React Query cache
	const queryKey = useMemo(() => 
		['sql', sqlQuery, params, limit, logFileId] as const, 
		[sqlQuery, params, limit, logFileId]
	);
	
	// Create a stable key for our own deduplication cache
	const dedupeKey = useMemo(() => 
		getStableQueryKey(sqlQuery, params, limit, logFileId),
		[sqlQuery, params, limit, logFileId]
	);
	
	// Mark this query as rendering before it executes
	useEffect(() => {
		if (!renderingQueries.has(dedupeKey)) {
			renderingQueries.add(dedupeKey);
			return () => {
				renderingQueries.delete(dedupeKey);
			};
		}
	}, [dedupeKey]);

	const { data, refetch } = useSuspenseQuery<DataType, ApiError>({
		queryKey,
		queryFn: async () => {
			try {
				// DEBUG: Log when queryFn is executed
				console.debug(`[SQL Debug] Executing queryFn for: ${dedupeKey.substring(0, 40)}...`);
				
				// Check if another component is already rendering this exact query
				// This provides deduplication during initial renders
				if (renderingQueries.has(dedupeKey) && renderingQueries.size > 1) {
					console.info(`[SQL Debug] Another component is already handling this query, waiting...`);
					
					// Wait a tiny bit for the first component's query to start
					await new Promise(resolve => setTimeout(resolve, 5));
				}
				
				// Check if this exact query is already in flight
				if (queryCache.has(dedupeKey)) {
					// Reuse the in-flight request
					const cachedPromise = queryCache.get(dedupeKey);
					console.info(`Reusing in-flight SQL query: ${dedupeKey.substring(0, 40)}...`);
					return await cachedPromise as DataType;
				}
				
				// Create a new request promise
				console.info(`Executing SQL query: ${dedupeKey.substring(0, 40)}...`);
				const fetchPromise = pythonApiFetch<DataType>('/query_sql', {
					method: 'POST',
					body: JSON.stringify({
						query: sqlQuery,
						params,
						limit: limit
					})
				});
				
				// Store the promise in the cache
				queryCache.set(dedupeKey, fetchPromise);
				
				// When the promise resolves, remove it from cache
				fetchPromise.finally(() => {
					queryCache.delete(dedupeKey);
				});
				
				// Return the actual data
				return await fetchPromise;
			} catch (error) {
				console.error('SQL query error:', error);
				// Always clean up cache on error
				queryCache.delete(dedupeKey);
				throw error;
			}
		},
		// Enhanced options to prevent hydration mismatches
		...defaultQueryOptions
	});

	// Provide safe default data when data is undefined
	const safeData = data || ([] as unknown as DataType);
	const transformedData = safeData && transformer ? transformer(safeData) : (safeData as unknown as TransformedType);

	return {
		data: transformedData,
		refetch
	};
} 