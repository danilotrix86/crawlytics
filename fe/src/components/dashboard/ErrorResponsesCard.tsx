import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { ExclamationCircle } from 'flowbite-react-icons/solid';
import { 
	useLogFileData, 
	DataComponentWrapper,
	getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface ErrorRateData {
	client_errors: number;
	server_errors: number;
	total_requests: number;
}

// Inner component for logic
const ErrorResponsesCardComponent: React.FC = () => {
	// Base SQL query with WHERE 1=1 to safely add conditions
	const sqlQuery = `
		SELECT 
			COUNT(CASE WHEN status >= 400 AND status < 500 THEN 1 ELSE NULL END) as client_errors,
			COUNT(CASE WHEN status >= 500 THEN 1 ELSE NULL END) as server_errors,
			COUNT(*) as total_requests
		FROM access_logs 
		WHERE 1=1 {LOG_FILE_CONDITION}
	`;

	// Use our custom hook instead of manually building the query
	const { data: errorData, logFileId } = useLogFileData<ErrorRateData[], ErrorRateData>(
		sqlQuery,
		[],
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
			subtext: `${totalErrors} errors (${clientErrors} client / ${serverErrors} server)${getLogFileSuffix(logFileId)}`,
		},
		icon: ExclamationCircle,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const ErrorResponsesCard: React.FC = () => (
	<DataComponentWrapper>
		<ErrorResponsesCardComponent />
	</DataComponentWrapper>
); 