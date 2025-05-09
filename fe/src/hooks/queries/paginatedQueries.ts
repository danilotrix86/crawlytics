import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { SQLQueryRequest, defaultQueryOptions, ApiError } from './types';

/**
 * Paginated SQL query hook with optimized fetching
 */
export function usePaginatedSqlQuery<TData = unknown>(
	sqlQuery: string | null,
	params: any[] = [],
	page: number = 0,
	pageSize: number = 20,
	options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>
) {
	return useQuery<TData, ApiError>({
		queryKey: ['sql', 'paginated', sqlQuery, params, page, pageSize],
		queryFn: async () => {
			if (!sqlQuery) return [] as unknown as TData;
			
			try {
				// Add pagination to the SQL query if not already present
				const paginatedQuery = sqlQuery.toLowerCase().includes('limit') 
					? sqlQuery
					: `${sqlQuery} LIMIT ${pageSize} OFFSET ${page * pageSize}`;
				
				return await pythonApiFetch<TData>('/query_sql', {
					method: 'POST',
					body: JSON.stringify({
						query: paginatedQuery,
						params,
						limit: pageSize
					} as SQLQueryRequest)
				});
			} catch (error) {
				console.error('Paginated SQL query error:', error);
				throw error;
			}
		},
		placeholderData: (oldData) => oldData, // React Query v5 replacement for keepPreviousData
		...defaultQueryOptions,
		...options,
		// Enable query based on presence of sqlQuery
		enabled: options?.enabled !== false && !!sqlQuery
	});
} 