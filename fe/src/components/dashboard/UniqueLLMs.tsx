import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Chart } from 'flowbite-react-icons/outline';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface UniqueLLMCount {
	count: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const UniqueLLMsCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	let sqlQuery = "SELECT COUNT(DISTINCT crawler_name) as count FROM access_logs";
	let params: any[] = [];
	
	// Only filter by log_file_id if a file is selected
	if (logFileId) {
		sqlQuery += " WHERE log_file_id = ?";
		params = [logFileId];
		// Add the crawler_name IS NOT NULL condition
		sqlQuery += " AND crawler_name IS NOT NULL";
	} else {
		sqlQuery += " WHERE crawler_name IS NOT NULL";
	}

	const { data: uniqueLLMData } = useSqlData<UniqueLLMCount[], UniqueLLMCount>(
		sqlQuery,
		params,
		(data) => data?.[0]
	);

	const statsCardProps = {
		data: {
			title: "🧠 Unique LLM Crawlers",
			subtext: logFileId ? "Selected Log File" : "All Log Files",
			number: uniqueLLMData?.count?.toString() ?? "0",
		},
		icon: Chart,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const UniqueLLMs: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<UniqueLLMsCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 