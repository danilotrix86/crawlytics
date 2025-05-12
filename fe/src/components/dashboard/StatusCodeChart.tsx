import React, { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useSqlData } from '../../hooks/useSqlData';
import { ColumnBarChartUI } from '../charts/ColumnBarChartUI';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { 
	RawStatusCodeData, 
	transformStatusCodeData, 
	ColumnChartConfig 
} from '../charts/ColumnChartTransformer';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';
import { COLOR_MAPS } from '../../theme/chartTheme';

// Constants
const SELECTED_LOG_FILE_COOKIE = 'selected_log_file';

// Status code configuration - will be modified at runtime based on log file selection
const getStatusCodeConfig = (logFileId: string | null): Partial<ColumnChartConfig> => {
	return {
		categoryOrder: [
			'2xx Success',
			'3xx Redirection',
			'4xx Client Error',
			'5xx Server Error',
			'Other'
		],
		colorMap: COLOR_MAPS.statusCodes,
		title: `📊 Status Code Distribution${logFileId ? "" : " - All Log Files"}`,
		seriesName: 'Requests',
		xAxisTitle: 'Status Code Group',
		yAxisTitle: 'Request Count',
		tooltipSuffix: 'requests',
		emptyMessage: 'No status code data available'
	};
};

// SQL Query for status code distribution with placeholder for log_file_id condition
const STATUS_CODE_SQL_QUERY = `
    WITH StatusGroups AS (
        SELECT 
            CASE 
                WHEN status >= 200 AND status < 300 THEN '2xx Success'
                WHEN status >= 300 AND status < 400 THEN '3xx Redirection'
                WHEN status >= 400 AND status < 500 THEN '4xx Client Error'
                WHEN status >= 500 AND status < 600 THEN '5xx Server Error'
                ELSE 'Other'
            END as status_group,
            COUNT(*) as count
        FROM 
            access_logs
        {WHERE_CLAUSE}
        GROUP BY 
            CASE 
                WHEN status >= 200 AND status < 300 THEN '2xx Success'
                WHEN status >= 300 AND status < 400 THEN '3xx Redirection'
                WHEN status >= 400 AND status < 500 THEN '4xx Client Error'
                WHEN status >= 500 AND status < 600 THEN '5xx Server Error'
                ELSE 'Other'
            END
    )
    SELECT status_group, count
    FROM StatusGroups
    ORDER BY 
        CASE status_group
            WHEN '2xx Success' THEN 1
            WHEN '3xx Redirection' THEN 2
            WHEN '4xx Client Error' THEN 3
            WHEN '5xx Server Error' THEN 4
            ELSE 5
        END ASC
`;

// Inner component that handles data fetching and transformation
const StatusCodeChartContent: React.FC = () => {
	// Get selected log file from cookie with safe fallback
	const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE) || '';
	
	// Prepare SQL query based on log file selection
	let sqlQuery = STATUS_CODE_SQL_QUERY;
	let params: any[] = [];
	
	if (logFileId) {
		sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "WHERE log_file_id = ?");
		params = [logFileId];
	} else {
		sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "");
	}
	
	// Get the dynamic config based on log file selection
	const STATUS_CODE_CONFIG = getStatusCodeConfig(logFileId);
	
	// Fetch SQL data with proper typing
	const { data } = useSqlData<RawStatusCodeData[]>(
		sqlQuery,
		params
	);
	
	// Convert data to safe array with type checking
	const safeData = Array.isArray(data) ? data : [];
	
	// Transform data for chart visualization (memoized)
	const chartData = useMemo(() => 
		transformStatusCodeData(safeData, STATUS_CODE_CONFIG.title!, STATUS_CODE_CONFIG),
	[safeData, STATUS_CODE_CONFIG]);

	return (
		<ColumnBarChartUI
			options={chartData.options}
			series={chartData.series}
			testId="status-code-chart"
		/>
	);
};

// Main exported component with error boundary and suspense
export const StatusCodeChart: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary 
			onReset={reset} 
			FallbackComponent={DefaultQueryErrorFallback}
		>
			<Suspense fallback={<CardLoadingSpinner />}>
				<StatusCodeChartContent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default StatusCodeChart; 