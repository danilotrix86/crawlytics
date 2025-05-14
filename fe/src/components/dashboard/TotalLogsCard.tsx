import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { List } from 'flowbite-react-icons/outline';
import { 
	useLogFileData, 
	DataComponentWrapper 
} from '../../shared/analytics-utils';

// Define the expected data shape from the query
interface LogCount {
	count: number;
}

// Refactored component using hooks
const TotalLogsCardComponent: React.FC = () => {
	// Base SQL query with placeholder for log file condition
	const sqlQuery = "SELECT COUNT(*) as count FROM access_logs WHERE 1=1 {LOG_FILE_CONDITION}";
	
	// Use our custom hook for data fetching with automatic log file handling
	const { data: logCountData, logFileId } = useLogFileData<LogCount[], LogCount>(
		sqlQuery,
		[],
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

// Component with DataComponentWrapper
export const TotalLogsCard: React.FC = () => (
	<DataComponentWrapper>
		<TotalLogsCardComponent />
	</DataComponentWrapper>
); 