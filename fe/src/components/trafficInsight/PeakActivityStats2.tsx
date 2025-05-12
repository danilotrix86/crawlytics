import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Clock } from 'flowbite-react-icons/solid';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

interface PeakHourData {
	hour_of_day: number;
	request_count: number;
	percentage: number;
}

const COOKIE_NAME = 'selected_log_file';

const formatHour = (hour: number | null | undefined): string => {
	if (hour === null || hour === undefined) return 'Invalid Time';
	if (hour === 0) return '12 AM';
	if (hour === 12) return '12 PM';
	if (hour < 12) return `${hour} AM`;
	return `${hour - 12} PM`;
};

const PeakActivityStats2Component: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	let sqlQuery = `
		WITH HourlyCounts AS (
			SELECT 
				CAST(strftime('%H', time) AS INTEGER) as hour_of_day,
				COUNT(*) as request_count
			FROM access_logs
			WHERE time IS NOT NULL {LOG_FILE_CONDITION}
			GROUP BY hour_of_day
		)
		SELECT 
			hour_of_day,
			request_count,
			CAST((request_count * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_LOG_FILE_CONDITION})) AS INTEGER) as percentage
		FROM HourlyCounts
		ORDER BY request_count DESC
		LIMIT 1 OFFSET 1;
	`;
	
	let params: any[] = [];
	
	// Only filter by log_file_id if a file is selected
	if (logFileId) {
		sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
		sqlQuery = sqlQuery.replace("{TOTAL_LOG_FILE_CONDITION}", "WHERE log_file_id = ?");
		params = [logFileId, logFileId];
	} else {
		sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "");
		sqlQuery = sqlQuery.replace("{TOTAL_LOG_FILE_CONDITION}", "");
	}

	const { data: peakHours } = useSqlData<PeakHourData[], PeakHourData[]>(
		sqlQuery,
		params,
		(data) => data || []
	);

	const hourData = peakHours?.[0];

	if (!hourData) {
		return <div className="text-center text-gray-500 dark:text-gray-400 min-h-36 flex items-center justify-center">Not available</div>; // Simpler message
	}

	const statsCardProps = {
		data: {
			title: formatHour(hourData.hour_of_day),
			number: '⏱️ Peak Activity 2',
			subtext: `${hourData.request_count.toLocaleString()} requests (${hourData.percentage}%)${logFileId ? "" : " - All Log Files"}`,
		},
		icon: Clock,
	};

	return <StatsCard {...statsCardProps} />;
};

export const PeakActivityStats2: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<PeakActivityStats2Component />
			</Suspense>
		</ErrorBoundary>
	);
}; 