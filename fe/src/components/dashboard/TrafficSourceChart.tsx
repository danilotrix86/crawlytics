import React, { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useSqlData } from '../../hooks/useSqlData';
import { DonutChartUI } from '../charts/DonutChartUI';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { 
	RawDonutData, 
	transformTrafficSourceData, 
	DonutChartConfig 
} from '../charts/DonutChartTransformer';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Constants
const SELECTED_LOG_FILE_COOKIE = 'selected_log_file';

// Traffic source configuration
const TRAFFIC_SOURCE_CONFIG: Partial<DonutChartConfig> = {
	labelOrder: [
		'Human',
		'Bot',
		'LLM'
	],
	colors: [
		'#2E93fA',  // Human (Blue)
		'#FF9800',  // Bot (Orange)
		'#66DA26'   // LLM (Green)
	],
	title: '🔄 Traffic by Source Type',
	tooltipSuffix: 'requests',
	emptyMessage: 'No traffic source data available',
	donutSize: '70%',
	customOptions: {
		plotOptions: {
			pie: {
				donut: {
					labels: {
						show: true,
						name: {
							show: true,
							fontSize: '16px',
							fontWeight: 600,
							color: 'var(--tw-text-opacity)'
						},
						value: {
							show: true,
							fontSize: '20px',
							fontWeight: 400,
							color: 'var(--tw-text-opacity)',
							formatter: (val) => val.toString()
						},
						total: {
							show: true,
							label: 'Total',
							fontSize: '16px',
							color: 'var(--tw-text-opacity)',
							formatter: (w) => {
								return 'Total';
							}
						}
					}
				}
			}
		},
		legend: {
			position: 'bottom',
			formatter: (seriesName, opts) => {
				const value = opts.w.globals.series[opts.seriesIndex] || 0;
				let percent = 0;
				
				// Calculate percentage manually
				const total = opts.w.globals.series.reduce((sum, val) => sum + (val || 0), 0);
				if (total > 0) {
				    percent = (value / total) * 100;
				}
				
				return `${seriesName} - ${value.toLocaleString()} (${percent.toFixed(1)}%)`;
			}
		},
		// Ensure tooltip is properly configured
		tooltip: {
			enabled: true,
			fillSeriesColor: false,
			theme: 'light',
			// Don't override the formatter here, it will be handled by the transformer
		}
	}
};

// SQL Query for traffic source distribution
const TRAFFIC_SOURCE_SQL_QUERY = `
    WITH SourceTypes AS (
        SELECT 
            CASE 
                WHEN is_bot = TRUE AND is_llm != TRUE THEN 'Bot'
                WHEN is_llm = TRUE THEN 'LLM'
                ELSE 'Human'
            END as label,
            COUNT(*) as value
        FROM 
            logs
        WHERE 
            log_file_id = $1
        GROUP BY 
            CASE 
                WHEN is_bot = TRUE AND is_llm != TRUE THEN 'Bot'
                WHEN is_llm = TRUE THEN 'LLM'
                ELSE 'Human'
            END
    )
    SELECT label, value 
    FROM SourceTypes
    ORDER BY 
        CASE label
            WHEN 'Human' THEN 1
            WHEN 'Bot' THEN 2
            WHEN 'LLM' THEN 3
            ELSE 4
        END ASC
`;

// Inner component that handles data fetching and transformation
const TrafficSourceChartContent: React.FC = () => {
	// Get selected log file from cookie with safe fallback
	const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE) || '';
	
	// Fetch SQL data with proper typing
	const { data } = useSqlData<RawDonutData[]>(
		TRAFFIC_SOURCE_SQL_QUERY,
		[logFileId]
	);
	
	// Convert data to safe array with type checking
	const safeData = Array.isArray(data) ? data : [];
	
	// Ensure all categories exist (Human, Bot, LLM) even if count is 0
	const completeData = useMemo(() => {
		const categories = ['Human', 'Bot', 'LLM'];
		const existingLabels = safeData.map(item => item.label);
		
		// Create complete dataset including missing categories with zero counts
		return [
			...safeData,
			...categories
				.filter(category => !existingLabels.includes(category))
				.map(category => ({ label: category, value: 0 }))
		];
	}, [safeData]);
	
	// Calculate percentages for each category
	const processedData = useMemo(() => {
		// Calculate total
		const total = completeData.reduce((sum, item) => sum + item.value, 0);
		
		// If there's no data, return the original array
		if (total === 0) return completeData;
		
		// Otherwise calculate and add percentage to each item
		return completeData.map(item => ({
			...item,
			percentage: (item.value / total) * 100
		}));
	}, [completeData]);
	
	// Transform data for chart visualization (memoized)
	const chartData = useMemo(() => 
		transformTrafficSourceData(processedData, TRAFFIC_SOURCE_CONFIG.title!, TRAFFIC_SOURCE_CONFIG),
	[processedData]);

	return (
		<DonutChartUI
			options={chartData.options}
			series={chartData.series}
			testId="traffic-source-chart"
		/>
	);
};

// Main exported component with error boundary and suspense
export const TrafficSourceChart: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary 
			onReset={reset} 
			FallbackComponent={DefaultQueryErrorFallback}
		>
			<Suspense fallback={<CardLoadingSpinner />}>
				<TrafficSourceChartContent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default TrafficSourceChart; 