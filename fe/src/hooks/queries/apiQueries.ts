import { useQuery, useMutation, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationOptions, UseQueryOptions, UseSuspenseQueryOptions } from '@tanstack/react-query';
import { pythonApiFetch, pythonApiUpload } from '../../utils/pythonApiClient';
import { defaultQueryOptions, UploadResponse, TaskStatusResponse } from './types';

/**
 * Generic API query hook that can be used with any endpoint
 * 
 * @param endpoint - API endpoint path (e.g., '/data')
 * @param options - Fetch options for the request
 * @param queryOptions - TanStack Query options
 * @returns Query result with data, loading state, and error handling
 */
export function useApiQuery<TData = unknown>(
	endpoint: string,
	fetchOptions?: RequestInit,
	queryOptions?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
	return useQuery<TData, Error>({
		queryKey: ['api', endpoint, fetchOptions],
		queryFn: async () => {
			try {
				return await pythonApiFetch<TData>(endpoint, fetchOptions);
			} catch (error) {
				console.error('API query error:', error);
				throw error;
			}
		},
		...defaultQueryOptions,
		...queryOptions
	});
}

/**
 * Suspense-enabled API query hook optimized for React 19
 * 
 * @param endpoint - API endpoint path (e.g., '/data')
 * @param fetchOptions - Fetch options for the request
 * @param queryOptions - TanStack Query Suspense options
 * @returns Query result with data ready for use with Suspense
 */
export function useSuspenseApiQuery<TData = unknown>(
	endpoint: string,
	fetchOptions?: RequestInit,
	queryOptions?: Omit<UseSuspenseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
	return useSuspenseQuery<TData, Error>({
		queryKey: ['api', endpoint, fetchOptions],
		queryFn: async () => {
			try {
				return await pythonApiFetch<TData>(endpoint, fetchOptions);
			} catch (error) {
				console.error('API query error:', error);
				throw error;
			}
		},
		...defaultQueryOptions,
		...queryOptions
	});
}

/**
 * Generic API mutation hook for data mutations
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
	endpoint: string,
	options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
	return useMutation<TData, Error, TVariables>({
		mutationFn: async (variables) => {
			try {
				return await pythonApiFetch<TData>(endpoint, {
					method: 'POST',
					body: JSON.stringify(variables)
				});
			} catch (error) {
				console.error('API mutation error:', error);
				throw error;
			}
		},
		...options
	});
}

/**
 * Mutation hook specifically for deleting a log file
 * 
 * @param options - TanStack Query mutation options
 * @returns Mutation result object
 */
export function useDeleteLogFileMutation(
	options?: Omit<UseMutationOptions<unknown, Error, string>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, string>({ // TVariables is string (logFileId)
		mutationFn: async (logFileId: string) => {
			try {
				// Construct the specific endpoint for deletion
				const endpoint = `/logs/${logFileId}`;
				return await pythonApiFetch<unknown>(endpoint, {
					method: 'DELETE',
				});
			} catch (error) {
				console.error(`API deletion error for log ${logFileId}:`, error);
				throw error; // Re-throw to be handled by TanStack Query
			}
		},
		// Note: Explicitly defining onSuccess here to ensure invalidation always runs.
		// The original onSuccess from options is called within this wrapper.
		onSuccess: (data, variables, context) => {
			// Invalidate the log files query to refresh the list
			queryClient.invalidateQueries({ queryKey: ['logFiles'] });
			
			// Call the original onSuccess if provided
			options?.onSuccess?.(data, variables, context);
		},
		...options // Spread any additional options provided by the caller
	});
}

export function useFileUploadMutation<TData = UploadResponse, TVariables = File>(
	options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
	return useMutation<TData, Error, TVariables>({
		mutationFn: async (file: TVariables) => {
			const formData = new FormData();
			formData.append('log_file', file as unknown as File);
			
			return await pythonApiUpload<TData>('/import-log', formData);
		},
		...options
	});
}

/**
 * Hook for getting task status
 */
export function useTaskStatusQuery<TData = TaskStatusResponse>(
	taskId: string | null,
	options?: Omit<UseQueryOptions<TData | null, Error>, 'queryKey' | 'queryFn'>
) {
	return useQuery<TData | null, Error>({
		queryKey: ['taskStatus', taskId],
		queryFn: async () => {
			if (!taskId) return null;
			
			try {
				return await pythonApiFetch<TData>(`/task/${taskId}`);
			} catch (error) {
				console.error('Error fetching task status:', error);
				throw error;
			}
		},
		enabled: !!taskId && (options?.enabled !== false),
		...defaultQueryOptions,
		...options
	});
}

/**
 * Hook for getting crawler patterns
 */
export function useCrawlerPatternsQuery(
	options?: Omit<UseQueryOptions<{patterns: string[]}, Error>, 'queryKey' | 'queryFn'>
) {
	return useQuery<{patterns: string[]}, Error>({
		queryKey: ['crawlerPatterns'],
		queryFn: async () => {
			try {
				return await pythonApiFetch<{patterns: string[]}>('/crawler-patterns');
			} catch (error) {
				console.error('Error fetching crawler patterns:', error);
				throw error;
			}
		},
		...defaultQueryOptions,
		...options
	});
}

/**
 * Hook for updating crawler patterns
 */
export function useUpdateCrawlerPatternsMutation(
	options?: Omit<UseMutationOptions<unknown, Error, string[]>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, string[]>({
		mutationFn: async (patterns: string[]) => {
			try {
				return await pythonApiFetch<unknown>('/crawler-patterns', {
					method: 'POST',
					body: JSON.stringify(patterns)
				});
			} catch (error) {
				console.error('Error updating crawler patterns:', error);
				throw error;
			}
		},
		onSuccess: (data, variables, context) => {
			// Invalidate the crawler patterns query to refresh the data
			queryClient.invalidateQueries({ queryKey: ['crawlerPatterns'] });
			
			// Call the original onSuccess if provided
			options?.onSuccess?.(data, variables, context);
		},
		...options
	});
}

/**
 * Hook for resetting crawler patterns to default values
 */
export function useResetCrawlerPatternsMutation(
	options?: Omit<UseMutationOptions<unknown, Error, void>, 'mutationFn'>
) {
	const queryClient = useQueryClient();

	return useMutation<unknown, Error, void>({
		mutationFn: async () => {
			try {
				return await pythonApiFetch<unknown>('/crawler-patterns/reset', {
					method: 'POST'
				});
			} catch (error) {
				console.error('Error resetting crawler patterns:', error);
				throw error;
			}
		},
		onSuccess: (data, variables, context) => {
			// Invalidate the crawler patterns query to refresh the data
			queryClient.invalidateQueries({ queryKey: ['crawlerPatterns'] });
			
			// Call the original onSuccess if provided
			options?.onSuccess?.(data, variables, context);
		},
		...options
	});
} 