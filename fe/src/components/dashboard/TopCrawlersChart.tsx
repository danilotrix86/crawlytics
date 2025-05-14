import React, { useMemo } from 'react';
import { BarChartUI } from '../charts/BarChartUI';
import { 
	RawTopPagesData, 
	transformTopPagesData, 
	BarChartConfig
} from '../charts/BarChartTransformer';
import { 
	useLogFileData, 
	DataComponentWrapper,
	createTitle
} from '../../shared/analytics-utils';
import { EXTENDED_COLORS, CHART_DEFAULTS } from '../../theme/chartTheme';

// SQL Query for TopCrawlersChart with placeholder
const TOP_CRAWLERS_SQL_QUERY = `
    SELECT 
        COALESCE(crawler_name, 'Unknown') AS page_path,
        COUNT(*) as count
    FROM 
        access_logs
    WHERE 
        1=1 {LOG_FILE_CONDITION}
    GROUP BY 
        crawler_name
    ORDER BY 
        count DESC
    LIMIT 5;
`;

// Chart configuration - will be modified at runtime based on log file selection
const getChartConfig = (logFileId: string | null): Partial<BarChartConfig> => {
	return {
		title: createTitle('🕷️ Top Crawlers by Requests', logFileId),
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
};

// Inner component for logic
const TopCrawlersChartComponent: React.FC = () => {
	// Use our custom hook instead of manually building the query
	const { data: rawData, logFileId } = useLogFileData<RawTopPagesData[], RawTopPagesData[]>(
		TOP_CRAWLERS_SQL_QUERY,
		[]
	);
	
	// Get chart configuration with dynamic title
	const CHART_CONFIG = getChartConfig(logFileId);

	// Memoize the transformed data to prevent unnecessary recalculations
	const chartData = useMemo(() => {
		return transformTopPagesData(rawData || [], CHART_CONFIG);
	}, [rawData, CHART_CONFIG]);

	return (
		<BarChartUI 
			options={chartData.options} 
			series={chartData.series}
			testId="top-crawlers-chart"
		/>
	);
};

// Exported component with DataComponentWrapper
export const TopCrawlersChart: React.FC = () => (
	<DataComponentWrapper>
		<TopCrawlersChartComponent />
	</DataComponentWrapper>
);

export default TopCrawlersChart; 