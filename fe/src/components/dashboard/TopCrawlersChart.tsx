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

// SQL Query for TopCrawlersChart
const TOP_CRAWLERS_SQL_QUERY = `
    SELECT 
        COALESCE(crawler_name, 'Unknown') AS page_path,
        COUNT(*) as count
    FROM 
        access_logs
    WHERE 
        log_file_id = $1
    GROUP BY 
        crawler_name
    ORDER BY 
        count DESC
    LIMIT 5;
`;

// Chart configuration
const CHART_CONFIG: Partial<BarChartConfig> = {
	title: '🕷️ Top Crawlers by Requests',
	xAxisTitle: 'Requests',
	yAxisTitle: 'Crawler Name',
	horizontal: true,
	height: CHART_DEFAULTS.height.medium,
	tooltipSuffix: 'requests',
	emptyMessage: 'No crawler data available',
	showDataLabels: true,
	limit: 5,
	sortDirection: 'desc',
	distributed: true,
	colors: EXTENDED_COLORS.slice(0, 5) // Use different color palette than pages chart
};

// Inner component for logic
const TopCrawlersChartComponent: React.FC = () => {
	const logFileId = useSelectedLogFile();
	const params = [logFileId];

	// Fetch data using the hook with TanStack Query v5 features
	const { data: rawData } = useSqlData<RawTopPagesData[], RawTopPagesData[]>(
		TOP_CRAWLERS_SQL_QUERY,
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
			testId="top-crawlers-chart"
		/>
	);
};

// Exported component with Suspense/ErrorBoundary
export const TopCrawlersChart: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<TopCrawlersChartComponent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default TopCrawlersChart; 