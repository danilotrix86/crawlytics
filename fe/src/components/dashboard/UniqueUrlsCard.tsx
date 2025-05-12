import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Link } from 'flowbite-react-icons/outline';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface UniqueUrlCount {
	count: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const UniqueUrlsCardComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	let sqlQuery = `
		SELECT COUNT(DISTINCT 
			CASE 
				WHEN path = '/' THEN '/'
				WHEN instr(path, '?') > 0 
				THEN substr(path, 1, instr(path, '?') - 1) 
				WHEN instr(path, '#') > 0
				THEN substr(path, 1, instr(path, '#') - 1)
				ELSE path 
			END
		) as count 
		FROM access_logs 
		WHERE 1=1
	`;
	let params: any[] = [];
	
	// Only filter by log_file_id if a file is selected
	if (logFileId) {
		sqlQuery = sqlQuery.replace("WHERE", "WHERE log_file_id = ? AND");
		params = [logFileId];
	}

	const { data: uniqueUrlData } = useSqlData<UniqueUrlCount[], UniqueUrlCount>(
		sqlQuery,
		params,
		(data) => data?.[0]
	);

	const statsCardProps = {
		data: {
			title: "🔗 Unique URLs Requested",
			subtext: logFileId ? "Selected Log File" : "All Log Files",
			number: uniqueUrlData?.count?.toString() ?? "0",
		},
		icon: Link,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const UniqueUrlsCard: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<UniqueUrlsCardComponent />
			</Suspense>
		</ErrorBoundary>
	);
}; 