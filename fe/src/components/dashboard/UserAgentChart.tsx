import React, { Suspense, useMemo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { useSqlData } from '../../hooks/useSqlData';
import { TimeSeriesChartUI } from '../charts/ChartUI';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { 
	RawUserAgentData, 
	transformUserAgentData, 
	SeriesItem,
	TimeSeriesChartConfig 
} from '../charts/ChartTransformer';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';
import { CHART_DEFAULTS } from '../../theme/chartTheme';

// Custom hook to get the selected log file ID
const useSelectedLogFile = () => {
	const COOKIE_NAME = 'selected_log_file';
	return getCookie(COOKIE_NAME);
};

// SQL Query for CrawlerChart
const CRAWLER_SQL_QUERY = `
    WITH TopCrawlers AS (
        SELECT 
            COALESCE(crawler_name, 'Unknown') as crawler_name
        FROM 
            access_logs
        WHERE 
            log_file_id = ? 
            AND crawler_name IS NOT NULL
        GROUP BY 
            crawler_name
        ORDER BY 
            COUNT(*) DESC
        LIMIT 8
    ),
    FormattedDates AS (
        -- Create a normalized date from the time field
        SELECT
            CASE
                -- Handle timestamp format: 27/Mar/2025:10:05:59 +0000
                WHEN instr(cast(time as text), '/') > 0 THEN
                    substr(cast(time as text), 8, 4) || '-' || -- Year
                    CASE 
                        WHEN substr(cast(time as text), 4, 3) = 'Jan' THEN '01'
                        WHEN substr(cast(time as text), 4, 3) = 'Feb' THEN '02'
                        WHEN substr(cast(time as text), 4, 3) = 'Mar' THEN '03'
                        WHEN substr(cast(time as text), 4, 3) = 'Apr' THEN '04'
                        WHEN substr(cast(time as text), 4, 3) = 'May' THEN '05'
                        WHEN substr(cast(time as text), 4, 3) = 'Jun' THEN '06'
                        WHEN substr(cast(time as text), 4, 3) = 'Jul' THEN '07'
                        WHEN substr(cast(time as text), 4, 3) = 'Aug' THEN '08'
                        WHEN substr(cast(time as text), 4, 3) = 'Sep' THEN '09'
                        WHEN substr(cast(time as text), 4, 3) = 'Oct' THEN '10'
                        WHEN substr(cast(time as text), 4, 3) = 'Nov' THEN '11'
                        WHEN substr(cast(time as text), 4, 3) = 'Dec' THEN '12'
                    END || '-' || -- Month
                    substr(cast(time as text), 1, 2) -- Day
                -- Handle ISO format: 2025-03-27T10:05:59+00:00
                ELSE
                    substr(cast(time as text), 1, 10)
            END as log_day,
            COALESCE(crawler_name, 'Unknown') as crawler_name,
            access_logs.id
        FROM 
            access_logs
        WHERE 
            log_file_id = ? 
            AND crawler_name IN (SELECT crawler_name FROM TopCrawlers)
    )
    SELECT 
        log_day,
        crawler_name as user_agent, -- Keep the field name as user_agent for compatibility with existing chart transformer
        COUNT(*) as count
    FROM 
        FormattedDates
    GROUP BY 
        log_day, crawler_name
    ORDER BY 
        log_day ASC,
        count DESC,
        crawler_name ASC;
`;

// Chart configuration
const CHART_CONFIG: Partial<TimeSeriesChartConfig> = {
	title: 'Daily Requests by Crawler Type (Top 8)',
	xAxisTitle: 'Date',
	yAxisTitle: 'Total Request Count',
	chartType: 'area',
	stacked: true,
	height: CHART_DEFAULTS.height.large,
	tooltipSuffix: 'requests',
	emptyMessage: 'No Crawler Data Available',
	legendPosition: 'top',
	legendAlign: 'left',
	dateFormat: 'yyyy-MM-dd',
	// Ensure consistent chart behavior with the new interpolation
	stroke: {
		curve: 'smooth',
		width: 2
	}
};

// Inner component for logic
const UserAgentChartComponent: React.FC = () => {
	const logFileId = useSelectedLogFile();
	const params = [logFileId, logFileId]; // Using the same value for both placeholders

	// Fetch data using the hook
	const { data: rawData } = useSqlData<RawUserAgentData[], RawUserAgentData[]>(
		CRAWLER_SQL_QUERY,
		params,
	);

	// Memoize the transformed data to prevent unnecessary recalculations
	const chartData = useMemo(() => {
		return transformUserAgentData(rawData || [], CHART_CONFIG);
	}, [rawData]);

	return (
		<TimeSeriesChartUI 
			options={chartData.options} 
			series={chartData.series as SeriesItem[]}
			testId="crawler-chart"
		/>
	);
};

// Exported component with Suspense/ErrorBoundary
export const UserAgentChart: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<UserAgentChartComponent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default UserAgentChart; 