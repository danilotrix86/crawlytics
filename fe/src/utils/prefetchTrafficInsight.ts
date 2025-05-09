/**
 * Traffic Insight prefetching utilities
 * 
 * This module provides functions to prefetch data for the Traffic Insight page
 * allowing instant rendering when navigating to it.
 */
import { QueryClient } from '@tanstack/react-query';
import { pythonApiFetch } from './pythonApiClient';
import { getCookie } from './cookies';
import { defaultQueryOptions } from '../hooks/queries/types';

// Cookie name for selected log file
const COOKIE_NAME = 'selected_log_file';

/**
 * Prefetch all data needed for the Traffic Insight page
 * 
 * @param queryClient The TanStack Query client
 */
export function prefetchTrafficInsightData(queryClient: QueryClient): void {
    const logFileId = getCookie(COOKIE_NAME);
    if (!logFileId) return;

    prefetchPeakActivityStats(queryClient, logFileId);
    prefetchTopRequestedUrls(queryClient, logFileId);
    prefetchTrafficHeatmap(queryClient, logFileId);
}

/**
 * Prefetch the peak activity statistics
 */
function prefetchPeakActivityStats(queryClient: QueryClient, logFileId: string): void {
    // Peak Activity 1 - Top peak
    const peakHourQuery1 = `
		WITH HourlyCounts AS (
			SELECT 
				-- Extract hour from ISO timestamp using SQLite time functions
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE log_file_id = ? AND time IS NOT NULL
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ?)) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 0;
	`;

    // Peak Activity 2 - Second peak
    const peakHourQuery2 = `
		WITH HourlyCounts AS (
			SELECT 
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE log_file_id = ? AND time IS NOT NULL
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ?)) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 1;
	`;

    // Peak Activity 3 - Third peak
    const peakHourQuery3 = `
		WITH HourlyCounts AS (
			SELECT 
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE log_file_id = ? AND time IS NOT NULL
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ?)) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 2;
	`;

    // Prefetch peak activity stats
    const queries = [peakHourQuery1, peakHourQuery2, peakHourQuery3];
    queries.forEach(sqlQuery => {
        const params = [logFileId, logFileId];
        queryClient.prefetchQuery({
            queryKey: ['sql', sqlQuery, params, 1000],
            queryFn: async () => {
                return await pythonApiFetch('/query_sql', {
                    method: 'POST',
                    body: JSON.stringify({
                        query: sqlQuery,
                        params,
                        limit: 1000
                    })
                });
            },
            ...defaultQueryOptions
        });
    });
}

/**
 * Prefetch the top requested URLs table data
 */
function prefetchTopRequestedUrls(queryClient: QueryClient, logFileId: string): void {
    const sqlQuery = `
  SELECT 
    CASE 
      WHEN path = '/' THEN '/'
      WHEN instr(path, '?') > 0 
      THEN substr(path, 1, instr(path, '?') - 1) 
      WHEN instr(path, '#') > 0
      THEN substr(path, 1, instr(path, '#') - 1)
      ELSE path 
    END AS page_path,
    COUNT(*) as hits,
    COUNT(DISTINCT ip_address) as unique_ips,
    CAST((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ? AND status < 400)) AS REAL) as percentage
  FROM 
    access_logs
  WHERE 
    log_file_id = ?
    AND status < 400 -- Only count successful requests
  GROUP BY 
    page_path
  ORDER BY 
    hits DESC
  LIMIT 
    20
`;
    const params = [logFileId, logFileId];

    queryClient.prefetchQuery({
        queryKey: ['sql', sqlQuery, params, 1000],
        queryFn: async () => {
            return await pythonApiFetch('/query_sql', {
                method: 'POST',
                body: JSON.stringify({
                    query: sqlQuery,
                    params,
                    limit: 1000
                })
            });
        },
        ...defaultQueryOptions
    });
}

/**
 * Prefetch the traffic heatmap chart data
 */
function prefetchTrafficHeatmap(queryClient: QueryClient, logFileId: string): void {
    // SQL for the heatmap chart
    const TRAFFIC_HEATMAP_SQL = `
    WITH TimeExtract AS (
        SELECT
            -- Extract day of week (0-6, Sunday = 0) using SQLite strftime
            strftime('%w', time) as day_of_week,
            
            -- Extract hour (00-23) using SQLite strftime
            strftime('%H', time) as hour_of_day
        FROM
            access_logs
        WHERE
            log_file_id = ?
    )
    SELECT 
        day_of_week,
        hour_of_day,
        COUNT(*) as count
    FROM TimeExtract
    GROUP BY
        day_of_week, 
        hour_of_day
    ORDER BY
        day_of_week ASC, 
        hour_of_day ASC
    `;
    
    queryClient.prefetchQuery({
        queryKey: ['sql', 'llm-traffic', logFileId],
        queryFn: async () => {
            return await pythonApiFetch('/query_sql', {
                method: 'POST',
                body: JSON.stringify({
                    query: TRAFFIC_HEATMAP_SQL,
                    params: [logFileId],
                    limit: 1000
                })
            });
        },
        ...defaultQueryOptions
    });
} 