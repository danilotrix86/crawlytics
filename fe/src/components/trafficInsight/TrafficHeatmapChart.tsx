import React, { useMemo } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { HeatmapChartUI } from '../charts/HeatmapChartUI';
import {
	RawHeatmapData,
	transformGenericHeatmapData,
	HeatmapSeries,
	HeatmapChartConfig
} from '../charts/HeatmapChartTransformer';
import { 
    getCookie, 
} from '../../utils/cookies';
import { 
    DataComponentWrapper,
    getLogFileSuffix,
    SELECTED_LOG_FILE_COOKIE 
} from '../../shared/analytics-utils';
import { CHART_DEFAULTS } from '../../theme/chartTheme';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { ApiError } from '../../hooks/queries/types';

// Placeholder Color Utility - Replace with your actual implementation if needed
const ColorUtil = {
    lighten: (color: string, percent: number): string => {
        try {
            let r = parseInt(color.substring(1, 3), 16);
            let g = parseInt(color.substring(3, 5), 16);
            let b = parseInt(color.substring(5, 7), 16);

            r = Math.min(255, Math.round(r + (255 - r) * percent));
            g = Math.min(255, Math.round(g + (255 - g) * percent));
            b = Math.min(255, Math.round(b + (255 - b) * percent));

            const rr = r.toString(16).padStart(2, '0');
            const gg = g.toString(16).padStart(2, '0');
            const bb = b.toString(16).padStart(2, '0');

            return `#${rr}${gg}${bb}`;
        } catch (e) {
            console.error("Color lighten error:", e);
            return color; // Return original color on error
        }
    }
};

// SQL Query for Traffic Heatmap using SQLite functions
const LLM_TRAFFIC_HEATMAP_SQL = `
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

// Map day numbers to names (matching SQLite %w)
const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Generate hour order ('00' to '23')
const HOUR_ORDER = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));


// Generate color scale ranges dynamically based on max count
const generateColorRanges = (maxCount: number): any[] => {
    if (maxCount <= 0) return []; // No range if no data or only zeros

    const steps = 5; // Number of color ranges
    const stepSize = Math.max(1, Math.ceil(maxCount / steps)); // Ensure step size is at least 1
	const baseColor = '#1A56DB'; // Example: Flowbite blue-700

    return Array.from({ length: steps }).map((_, i) => {
        const from = i * stepSize;
        const to = (i + 1) * stepSize -1 ; // Inclusive range
        const intensity = (i + 1) / steps; // 0.2, 0.4, ..., 1.0

        return {
            from: from,
            to: i === steps - 1 ? maxCount : to, // Ensure last range includes maxCount
            color: ColorUtil.lighten(baseColor, 1 - intensity), // Make color lighter for lower values
            name: `${from}-${i === steps - 1 ? maxCount : to}` // Basic name for legend/tooltip reference if needed
        };
    });
};

// Chart configuration setup function
const getChartConfig = (title: string, maxCount: number, logFileId: string | null): Partial<HeatmapChartConfig> => ({
	title: `${title}${getLogFileSuffix(logFileId)}`,
	height: CHART_DEFAULTS.height.medium, // Adjust height as needed
	emptyMessage: 'No Traffic Data Available for this Period',
	showDataLabels: false, // Heatmaps often look cluttered with labels
    radius: 2, // Slightly rounded cells
    // Dynamically generate color scale based on the fetched data
    colorScaleRanges: generateColorRanges(maxCount),
    legendPosition: 'right', // Legend for color scale
	legendAlign: 'center',
    tooltipFormatter: (value, { seriesIndex, dataPointIndex, w }) => {
        const day = w.globals.seriesNames[seriesIndex];
        const hour = w.globals.labels[dataPointIndex];
        return `${day}, ${hour}:00 - ${hour}:59 : ${value} requests`;
    }
} as Partial<HeatmapChartConfig> & { 
    tooltipFormatter: (value: any, context: any) => string 
});

// Type for the raw data returned by the SQL query
interface RawTrafficData {
    day_of_week: string;
    hour_of_day: string;
    count: number;
}

// Custom hook for fetching traffic data with SQL
const useLLMTrafficData = (logFileId: string | null) => {
    let sqlQuery = LLM_TRAFFIC_HEATMAP_SQL;
    let params: any[] = [];
    
    if (logFileId) {
        sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
        params = [logFileId];
    } else {
        sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "");
    }
    
    return useSuspenseQuery<RawTrafficData[], ApiError>({
        // Include logFileId in query key for proper cache separation
        queryKey: ['sql', 'llm-traffic', logFileId || 'all'],
        queryFn: async () => {
            return await pythonApiFetch<RawTrafficData[]>('/query_sql', {
                method: 'POST',
                body: JSON.stringify({
                    query: sqlQuery,
                    params,
                    limit: 1000
                })
            });
        },
        // Override with enhanced options for static data
        staleTime: Infinity, // Data never goes stale for the same log file
        gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection time
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
    });
};

// Inner component for logic
const TrafficHeatmapChartComponent: React.FC = () => {
	const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
    
    // Fetch traffic data
    const { data: rawData } = useLLMTrafficData(logFileId);

	// Memoize the transformed data
	const chartData = useMemo(() => {
        const transformedApiData: RawHeatmapData[] = (rawData || []).map(item => ({
            x_category: item.hour_of_day, // Hour is already padded by SQLite
            y_category: item.day_of_week ? DAY_ORDER[parseInt(item.day_of_week, 10)] : 'Unknown', // Day is Y (map number to name)
            value: item.count
        }));

        // Find max count for dynamic color scaling
        const maxCount = Math.max(0, ...transformedApiData.map(d => d.value));

        const title = '🔥 Traffic Volume by Day and Hour';
        const config = getChartConfig(title, maxCount, logFileId);

        const transformedData = transformGenericHeatmapData(
            transformedApiData,
            config,
            HOUR_ORDER, // Enforce 00-23 order
            DAY_ORDER   // Enforce Sunday-Saturday order
        );

        return transformedData;
	}, [rawData, logFileId]);

	return (
		<div className="flex flex-col">
            {/* Chart */}
            <HeatmapChartUI
                options={chartData.options}
                series={chartData.series as HeatmapSeries[]}
                testId="llm-traffic-heatmap-chart"
                showCard={true}
                cardClassName="shadow-md" // Example: add shadow
            />
		</div>
	);
};

// Exported component with DataComponentWrapper
export const TrafficHeatmapChart: React.FC = () => (
    <DataComponentWrapper>
        <TrafficHeatmapChartComponent />
    </DataComponentWrapper>
);

export default TrafficHeatmapChart; 