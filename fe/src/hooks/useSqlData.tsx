import React, { ComponentType, ReactNode, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSuspenseQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { defaultQueryOptions, ApiError } from './queries/types';
import { pythonApiFetch } from '../utils/pythonApiClient';

/**
 * Hook version of createSqlComponent using Suspense for data fetching
 */
export function useSqlData<DataType = any, TransformedType = DataType>(
	sqlQuery: string,
	params: any[] = [],
	transformer?: (data: DataType) => TransformedType,
	limit: number = 1000
) {
	const { data, refetch } = useSuspenseQuery<DataType, ApiError>({
		queryKey: ['sql', sqlQuery, params, limit],
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