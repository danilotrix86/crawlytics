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
	const sqlQuery = "SELECT COUNT(DISTINCT crawler_name) as count FROM access_logs WHERE log_file_id = ? AND crawler_name IS NOT NULL";
	const params = [logFileId];

	const { data: uniqueLLMData } = useSqlData<UniqueLLMCount[], UniqueLLMCount>(
		sqlQuery,
		params,
		(data) => data?.[0]
	);

	const statsCardProps = {
		data: {
			title: "🧠 Unique LLM Crawlers",
			subtext: "Different crawler types",
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