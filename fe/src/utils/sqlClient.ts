/**
 * SQL-specific API client for making SQL queries
 */
import { pythonApiFetch } from './pythonApiClient';

/**
 * Interface for SQL query request
 */
export interface SQLQueryRequest {
	query: string;
	params?: any[];
	limit?: number;
}

/**
 * Executes an SQL query via the API proxy
 * 
 * @param query - SQL query string
 * @param params - Optional parameters for the SQL query
 * @param limit - Optional result limit
 * @returns Promise that resolves to the query results
 */
export async function executeSQLQuery<T>(
	query: string,
	params: any[] = [],
	limit: number = 1000
): Promise<T> {
	return pythonApiFetch<T>('/query_sql', {
		method: 'POST',
		body: JSON.stringify({
			query,
			params,
			limit
		} as SQLQueryRequest)
	});
} 