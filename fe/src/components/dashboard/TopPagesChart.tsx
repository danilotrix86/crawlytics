import React, { Suspense, useMemo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { useSqlData } from '../../hooks/useSqlData';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';
import { BarChartUI } from '../charts/BarChartUI';
import { 
	RawTopPagesData, 
	transformTopPagesData, 
	BarChartConfig
} from '../charts/BarChartTransformer';
import { getCookie } from '../../utils/cookies';
import { EXTENDED_COLORS, CHART_DEFAULTS } from '../../theme/chartTheme';

// Custom hook to get the selected log file ID
const useSelectedLogFile = () => {
	const COOKIE_NAME = 'selected_log_file';
	return getCookie(COOKIE_NAME);
};

// SQL Query for TopPagesChart with better path extraction
const TOP_PAGES_SQL_QUERY = `
    SELECT 
        CASE 
            WHEN path = '/' THEN '/'
            WHEN instr(path, '?') > 0 
            THEN substr(path, 1, instr(path, '?') - 1) 
            WHEN instr(path, '#') > 0
            THEN substr(path, 1, instr(path, '#') - 1)
            ELSE path 
        END AS page_path,
        COUNT(*) as count
    FROM 
        access_logs
    WHERE 
        log_file_id = ? -- Parameter 1: log_file_id
        AND status < 400 -- Only count successful requests
    GROUP BY 
        page_path
    ORDER BY 
        count DESC
    LIMIT 10;
`;

// Chart configuration
const CHART_CONFIG: Partial<BarChartConfig> = {
	title: '📄 Top Requested Pages',
	xAxisTitle: 'Visits',
	yAxisTitle: 'Page URL',
	horizontal: true,
	height: CHART_DEFAULTS.height.medium,
	tooltipSuffix: 'visits',
	emptyMessage: 'No page view data available',
	showDataLabels: true,
	limit: 5,
	sortDirection: 'desc',
	distributed: true,
	colors: EXTENDED_COLORS.slice(0, 5) // Take first 5 colors from extended palette
};

// Inner component for logic
const TopPagesChartComponent: React.FC = () => {
	const logFileId = useSelectedLogFile();
	const params = [logFileId];

	// Fetch data using the hook with TanStack Query v5 features
	const { data: rawData } = useSqlData<RawTopPagesData[], RawTopPagesData[]>(
		TOP_PAGES_SQL_QUERY,
		params,
	);

	// Memoize the transformed data to prevent unnecessary recalculations
	const chartData = useMemo(() => {
		return transformTopPagesData(rawData || [], CHART_CONFIG);
	}, [rawData]);

	return (
		<BarChartUI 
			options={chartData.options} 
			series={chartData.series}
			testId="top-pages-chart"
		/>
	);
};

// Exported component with Suspense/ErrorBoundary
export const TopPagesChart: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<TopPagesChartComponent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default TopPagesChart; 