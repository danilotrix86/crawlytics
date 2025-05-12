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
import { getGeoDataQuery, getTopCountriesQuery, getTopIpsQuery, prepareQuery } from './geoQueries';

// Cookie name for selected log file
const COOKIE_NAME = 'selected_log_file';

/**
 * Prefetch all data needed for the Traffic Insight page
 * 
 * @param queryClient The TanStack Query client
 */
export function prefetchTrafficInsightData(queryClient: QueryClient): void {
    const logFileId = getCookie(COOKIE_NAME);
    
    // Important: Query keys must exactly match the ones used in components
    // - For most components: ['sql', sqlQuery, params, 1000]
    // - For TrafficHeatmap: ['sql', 'llm-traffic', logFileId]
    
    // Prefetch all data - we're calling each function directly since they don't return promises
    prefetchPeakActivityStats(queryClient, logFileId);
    prefetchTopRequestedUrls(queryClient, logFileId);
    prefetchTrafficHeatmap(queryClient, logFileId);
    
    // Geographic insight data
    prefetchGeoData(queryClient, logFileId);
    prefetchTopCountries(queryClient, logFileId);
    prefetchTopIps(queryClient, logFileId);
}

/**
 * Prefetch the peak activity statistics
 */
function prefetchPeakActivityStats(queryClient: QueryClient, logFileId: string | null): void {
    // Peak Activity 1 - Top peak
    let peakHourQuery1 = `
		WITH HourlyCounts AS (
			SELECT 
				-- Extract hour from ISO timestamp using SQLite time functions
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE time IS NOT NULL {LOG_FILE_CONDITION}
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_LOG_FILE_CONDITION})) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 0;
	`;

    // Peak Activity 2 - Second peak
    let peakHourQuery2 = `
		WITH HourlyCounts AS (
			SELECT 
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE time IS NOT NULL {LOG_FILE_CONDITION}
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_LOG_FILE_CONDITION})) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 1;
	`;

    // Peak Activity 3 - Third peak
    let peakHourQuery3 = `
		WITH HourlyCounts AS (
			SELECT 
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE time IS NOT NULL {LOG_FILE_CONDITION}
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_LOG_FILE_CONDITION})) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 2;
	`;

    // Prefetch peak activity stats
    const queries = [peakHourQuery1, peakHourQuery2, peakHourQuery3];
    queries.forEach(baseQuery => {
        let sqlQuery = baseQuery;
        let params: any[] = [];
        
        // Only filter by log_file_id if a file is selected
        if (logFileId) {
            sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
            sqlQuery = sqlQuery.replace("{TOTAL_LOG_FILE_CONDITION}", "WHERE log_file_id = ?");
            params = [logFileId, logFileId];
        } else {
            sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "");
            sqlQuery = sqlQuery.replace("{TOTAL_LOG_FILE_CONDITION}", "");
        }
        
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
function prefetchTopRequestedUrls(queryClient: QueryClient, logFileId: string | null): void {
    let sqlQuery = `
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
    CAST((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_CONDITION})) AS REAL) as percentage
  FROM 
    access_logs
  WHERE 
    1=1 {LOG_FILE_CONDITION}
  GROUP BY 
    page_path
  ORDER BY 
    hits DESC
  LIMIT 
    20
`;
    let params: any[] = [];
    
    if (logFileId) {
        sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
        sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "WHERE log_file_id = ?");
        params = [logFileId, logFileId];
    } else {
        sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "");
        sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "");
    }

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
function prefetchTrafficHeatmap(queryClient: QueryClient, logFileId: string | null): void {
    // SQL for the heatmap chart
    let TRAFFIC_HEATMAP_SQL = `
    WITH TimeExtract AS (
        SELECT
            -- Extract day of week (0-6, Sunday = 0) using SQLite strftime
            strftime('%w', time) as day_of_week,
            
            -- Extract hour (00-23) using SQLite strftime
            strftime('%H', time) as hour_of_day
        FROM
            access_logs
        WHERE
            1=1 {LOG_FILE_CONDITION}
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
    
    let params: any[] = [];
    
    if (logFileId) {
        TRAFFIC_HEATMAP_SQL = TRAFFIC_HEATMAP_SQL.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
        params = [logFileId];
    } else {
        TRAFFIC_HEATMAP_SQL = TRAFFIC_HEATMAP_SQL.replace("{LOG_FILE_CONDITION}", "");
    }
    
    queryClient.prefetchQuery({
        queryKey: ['sql', 'llm-traffic', logFileId],
        queryFn: async () => {
            return await pythonApiFetch('/query_sql', {
                method: 'POST',
                body: JSON.stringify({
                    query: TRAFFIC_HEATMAP_SQL,
                    params,
                    limit: 1000
                })
            });
        },
        ...defaultQueryOptions
    });
}

/**
 * Prefetch the world map geo data
 */
function prefetchGeoData(queryClient: QueryClient, logFileId: string | null): void {
    const geoDataQuery = getGeoDataQuery();
    const { sqlQuery, params } = prepareQuery(geoDataQuery, logFileId);
    
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
 * Prefetch the top countries data
 */
function prefetchTopCountries(queryClient: QueryClient, logFileId: string | null): void {
    const topCountriesQuery = getTopCountriesQuery();
    const { sqlQuery, params } = prepareQuery(topCountriesQuery, logFileId);
    
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
 * Prefetch the top IPs data
 */
function prefetchTopIps(queryClient: QueryClient, logFileId: string | null): void {
    const topIpsQuery = getTopIpsQuery();
    const { sqlQuery, params } = prepareQuery(topIpsQuery, logFileId);
    
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