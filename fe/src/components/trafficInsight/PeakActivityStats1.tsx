import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Clock } from 'flowbite-react-icons/solid';
import { 
	DataComponentWrapper,
	getLogFileSuffix,
	SELECTED_LOG_FILE_COOKIE
} from '../../shared/analytics-utils';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';

// Define the expected data shape from the SQL query
interface PeakHourData {
	hour_of_day: number;
	request_count: number;
	percentage: number;
}

// Helper function to format hour
const formatHour = (hour: number | null | undefined): string => {
	if (hour === null || hour === undefined) return 'Invalid Time';
	if (hour === 0) return '12 AM';
	if (hour === 12) return '12 PM';
	if (hour < 12) return `${hour} AM`;
	return `${hour - 12} PM`;
};

// Inner component for logic
const PeakActivityStats1Component: React.FC = () => {
	const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
	
	// Base SQL query with multiple placeholders that need to be handled manually
	let sqlQuery = `
		WITH HourlyCounts AS (
			SELECT 
				-- Extract hour from ISO timestamp using SQLite time functions
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE time IS NOT NULL
		`;
		
	// Add parameters for log file filtering
	let params: any[] = [];
	
	if (logFileId) {
		sqlQuery += ` AND log_file_id = ?`;
		params.push(logFileId);
	}
	
	sqlQuery += `
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs 
	`;
	
	// Add the same condition to the subquery
	if (logFileId) {
		sqlQuery += ` WHERE log_file_id = ?`;
		params.push(logFileId);
	}
	
	sqlQuery += `
			)) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 0;
	`;

	const { data: peakHours } = useSqlData<PeakHourData[], PeakHourData[]>(
		sqlQuery,
		params,
		(data) => data || [] 
	);

	const hourData = peakHours?.[0]; // Get the first (and only) result

	if (!hourData) {
		return <div className="text-center text-gray-500 dark:text-gray-400 min-h-36 flex items-center justify-center">No peak activity data available.</div>;
	}

	const statsCardProps = {
		data: {
			title: formatHour(hourData.hour_of_day),
			number: '⏱️ Peak Activity 1',
			subtext: `${hourData.request_count.toLocaleString()} requests (${hourData.percentage}%)${getLogFileSuffix(logFileId)}`,
		},
		icon: Clock, 
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const PeakActivityStats1: React.FC = () => (
	<DataComponentWrapper>
		<PeakActivityStats1Component />
	</DataComponentWrapper>
); 