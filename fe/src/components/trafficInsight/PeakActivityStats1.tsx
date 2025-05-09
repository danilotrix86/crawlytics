import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Clock } from 'flowbite-react-icons/solid';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape from the SQL query
interface PeakHourData {
	hour_of_day: number;
	request_count: number;
	percentage: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

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
	const logFileId = getCookie(COOKIE_NAME);
	const sqlQuery = `
		WITH HourlyCounts AS (
			SELECT 
				-- Extract hour from ISO timestamp using SQLite time functions
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE log_file_id = ? AND time IS NOT NULL
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ?)) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 0;
	`;
	const params = [logFileId, logFileId];

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
			subtext: `${hourData.request_count.toLocaleString()} requests (${hourData.percentage}%)`,
		},
		icon: Clock, 
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component
export const PeakActivityStats1: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<PeakActivityStats1Component />
			</Suspense>
		</ErrorBoundary>
	);
}; 