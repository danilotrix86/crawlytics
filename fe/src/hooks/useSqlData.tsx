import React, { ComponentType, ReactNode, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuspenseQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { defaultQueryOptions, ApiError } from './queries/types';
import { pythonApiFetch } from '../utils/pythonApiClient';
import { getCookie } from '../utils/cookies';

/**
 * Hook version of createSqlComponent using Suspense for data fetching
 * Optimized for static log files with infinite cache life
 */
export function useSqlData<DataType = any, TransformedType = DataType>(
	sqlQuery: string,
	params: any[] = [],
	transformer?: (data: DataType) => TransformedType,
	limit: number = 1000
) {
	// Get current log file ID for query key
	const logFileId = getCookie('selected_log_file') || 'all';
	
	const { data, refetch } = useSuspenseQuery<DataType, ApiError>({
		// Include logFileId in query key to ensure proper cache separation
		queryKey: ['sql', sqlQuery, params, limit, logFileId],
		queryFn: async () => {
			try {
				return await pythonApiFetch<DataType>('/query_sql', {
					method: 'POST',
					body: JSON.stringify({
						query: sqlQuery,
						params,
						limit: limit
					})
				});
			} catch (error) {
				console.error('SQL query error:', error);
				throw error;
			}
		},
		// Override with enhanced options for static data
		staleTime: Infinity, // Data never goes stale for the same log file
		gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection time
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false
	});

	// Provide safe default data when data is undefined
	const safeData = data || ([] as unknown as DataType);
	const transformedData = safeData && transformer ? transformer(safeData) : (safeData as unknown as TransformedType);

	return {
		data: transformedData,
		refetch
	};
} 