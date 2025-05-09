import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { User } from 'flowbite-react-icons/outline';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface BotData {
	total_requests: number;
	bot_requests: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const BotVsHumanCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	const sqlQuery = `
		SELECT 
			COUNT(*) as total_requests,
			SUM(CASE WHEN is_bot = true THEN 1 ELSE 0 END) as bot_requests
		FROM access_logs 
		WHERE log_file_id = $1
	`;
	const params = [logFileId];

	const { data: botData } = useSqlData<BotData[], BotData>(
		sqlQuery,
		params,
		(data) => data?.[0]
	);

	const totalRequests = botData?.total_requests ?? 0;
	const botRequests = botData?.bot_requests ?? 0;
	const botPercentage = totalRequests > 0
		? Math.round((botRequests / totalRequests) * 100)
		: 0;

	const statsCardProps = {
		data: {
			title: "🤖 Bot vs Human Requests",
			subtext: "Proportion of requests from known bots vs non-bots",
			number: `${botPercentage}% bot traffic`,
		},
		icon: User,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const BotVsHumanCard: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<BotVsHumanCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 