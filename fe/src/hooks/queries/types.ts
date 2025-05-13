// Type declaration for Vite environment variables
export interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string;
}

// Augment the import.meta object
export interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Types for request options
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface FetchOptions extends Omit<RequestInit, 'method' | 'body'> {
	method?: HttpMethod;
	body?: unknown;
	params?: Record<string, string | number | boolean | undefined>;
}

// Type definition for API responses (renamed to avoid conflict)
export interface ApiResponseData<T = unknown> {
	data: T;
	meta?: {
		status: number;
		message: string;
		timestamp: string;
	};
}

// SQL Query Request type
export interface SQLQueryRequest {
	query: string;
	params?: any[];
	limit?: number;
}

/**
 * Custom error class for API requests
 */
export class ApiError extends Error {
	status: number;
	details: unknown;

	constructor(message: string, status: number = 500, details?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.details = details;
	}
}

// Response type from the upload endpoint
export interface UploadResponse {
	log_file_id: string;
	records_imported: number;
	issues: string[];
	file_size_mb: number;
}

// Task status response type
export interface TaskStatusResponse {
	status: string;
	records_imported: number;
	issues: string[];
	file_name?: string;
	log_file_id: string;
	file_size_mb: number;
	message?: string;
}

// Default React 19 compatible query options
// Updated for static log files that never change once loaded
export const defaultQueryOptions = {
	gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection time
	staleTime: Infinity, // Never consider data stale since log files don't change
	retry: 1, // Only retry once
	refetchOnWindowFocus: false, // Don't refetch when window gets focus
	refetchOnMount: false, // Don't refetch on component mount
	refetchOnReconnect: false // Don't refetch on network reconnection
} 