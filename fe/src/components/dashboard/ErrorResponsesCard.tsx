import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { ExclamationCircle } from 'flowbite-react-icons/solid';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface ErrorRateData {
	client_errors: number;
	server_errors: number;
	total_requests: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const ErrorResponsesCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	const sqlQuery = `
		SELECT 
			COUNT(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE NULL END) as client_errors,
			COUNT(CASE WHEN status >= 500 THEN 1 ELSE NULL END) as server_errors,
			COUNT(*) as total_requests
		FROM access_logs 
		WHERE log_file_id = $1
	`;
	const params = [logFileId];

	const { data: errorData } = useSqlData<ErrorRateData[], ErrorRateData>(
		sqlQuery,
		params,
		(data) => data?.[0]
	);

	const clientErrors = errorData?.client_errors ?? 0;
	const serverErrors = errorData?.server_errors ?? 0;
	const totalErrors = clientErrors + serverErrors;
	const totalRequests = errorData?.total_requests ?? 0;
	
	// Calculate error rate as percentage
	const errorRate = totalRequests > 0 
		? ((totalErrors / totalRequests) * 100).toFixed(1) 
		: "0.0";

	const statsCardProps = {
		data: {
			title: "⚠️ Error Rate",
			number: `${errorRate}%`,
			subtext: `${totalErrors} errors (${clientErrors} client / ${serverErrors} server)`,
		},
		icon: ExclamationCircle,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const ErrorResponsesCard: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<ErrorResponsesCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 