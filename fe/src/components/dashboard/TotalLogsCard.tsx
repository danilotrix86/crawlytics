import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { List } from 'flowbite-react-icons/outline';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape from the query
interface LogCount {
	count: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Refactored component using hooks
const TotalLogsCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	let sqlQuery = "SELECT COUNT(*) as count FROM access_logs";
	let params: any[] = [];
	
	// Only filter by log_file_id if a file is selected
	if (logFileId) {
		sqlQuery += " WHERE log_file_id = ?";
		params = [logFileId];
	}

	// Fetch data using the hook
	const { data: logCountData } = useSqlData<LogCount[], LogCount>(
		sqlQuery,
		params,
		(data) => data?.[0] // Transformer: get the first item from the array
	);

	// Prepare props for the StatsCard
	const statsCardProps = {
		data: {
			title: "📋 Total Log Entries",
			subtext: logFileId ? "Selected Log File" : "All Log Files",
			number: logCountData?.count?.toString() ?? "0",
		},
		icon: List,
	};

	return <StatsCard {...statsCardProps} />;
};

// Component with Suspense and Error Boundary
export const TotalLogsCard: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<TotalLogsCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 