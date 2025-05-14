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
        1=1 {LOG_FILE_CONDITION} -- Count all requests, including errors
    GROUP BY 
        page_path
    ORDER BY 
        count DESC
    LIMIT 10;
`;

// Chart configuration - will be modified at runtime based on log file selection
const getChartConfig = (logFileId: string | null): Partial<BarChartConfig> => {
	return {
		title: createTitle('📄 Top Requested Pages', logFileId),
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
};

// Inner component for logic
const TopPagesChartComponent: React.FC = () => {
	// Use our custom hook for data fetching with automatic log file handling
	const { data: rawData, logFileId } = useLogFileData<RawTopPagesData[], RawTopPagesData[]>(
		TOP_PAGES_SQL_QUERY,
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
			testId="top-pages-chart"
		/>
	);
};

// Exported component with DataComponentWrapper
export const TopPagesChart: React.FC = () => (
	<DataComponentWrapper>
		<TopPagesChartComponent />
	</DataComponentWrapper>
);

export default TopPagesChart; 