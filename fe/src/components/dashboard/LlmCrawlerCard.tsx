import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Terminal } from 'flowbite-react-icons/outline';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape from the query
interface LlmData {
	total_requests: number;
	llm_requests: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Refactored inner component using hooks
const LlmCrawlerCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	const sqlQuery = `
		SELECT 
			COUNT(*) as total_requests,
			SUM(CASE WHEN is_llm = true THEN 1 ELSE 0 END) as llm_requests
		FROM access_logs 
		WHERE log_file_id = $1
	`;
	const params = [logFileId];

	// Fetch data using the hook
	const { data: llmData } = useSqlData<LlmData[], LlmData>(
		sqlQuery,
		params,
		(data) => data?.[0] // Transformer: get the first item
	);

	// Calculate derived values safely
	const totalRequests = llmData?.total_requests ?? 0;
	const llmRequests = llmData?.llm_requests ?? 0;
	const llmPercentage = totalRequests > 0
		? ((llmRequests / totalRequests) * 100).toFixed(1)
		: "0.0";

	// Prepare props for the StatsCard
	const statsCardProps = {
		data: {
			title: "🧠 LLM Crawler Hits",
			subtext: `${llmRequests} of ${totalRequests} requests (${llmPercentage}%)`,
			number: `${llmPercentage}%`,
		},
		icon: Terminal,
	};

	return <StatsCard {...statsCardProps} />;
};

// Component with Suspense and Error Boundary
export const LlmCrawlerCard: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<LlmCrawlerCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 