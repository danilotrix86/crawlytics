import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { SQLQueryRequest, defaultQueryOptions, ApiError } from './types';

/**
 * SQL Query hook that uses the new SQL query endpoint
 * 
 * @param sqlQuery - SQL query string
 * @param params - SQL query parameters
 * @param limit - Optional result limit
 * @param options - Additional TanStack Query options
 * @returns Query result with data and status
 */
export function useSqlQuery<TData = unknown>(
	sqlQuery: string | null,
	params: any[] = [],
	limit: number = 1000,
	options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>
) {
	return useQuery<TData, ApiError>({
		queryKey: ['sql', sqlQuery, params, limit],
		queryFn: async () => {
			if (!sqlQuery) return [] as unknown as TData;
      
			try {
				return await pythonApiFetch<TData>('/query_sql', {
					method: 'POST',
					body: JSON.stringify({
						query: sqlQuery,
						params,
						limit
					} as SQLQueryRequest)
				});
			} catch (error) {
				console.error('SQL query error:', error);
				throw error;
			}
		},
		...defaultQueryOptions,
		...options,
		// Enable query based on presence of sqlQuery
		enabled: options?.enabled !== false && !!sqlQuery
	});
} 