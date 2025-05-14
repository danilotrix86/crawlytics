import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Chart } from 'flowbite-react-icons/outline';
import { 
	useLogFileData, 
	DataComponentWrapper,
	getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface UniqueLLMCount {
	count: number;
}

// Inner component for logic
const UniqueLLMsCardComponent: React.FC = () => {
	// Define the base SQL query with placeholders
	const sqlQuery = "SELECT COUNT(DISTINCT crawler_name) as count FROM access_logs WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}";
	
	// Use our custom hook instead of manually building the query
	const { data: uniqueLLMData, logFileId } = useLogFileData<UniqueLLMCount[], UniqueLLMCount>(
		sqlQuery,
		[],
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

// Exported component with DataComponentWrapper
export const UniqueLLMs: React.FC = () => (
	<DataComponentWrapper>
		<UniqueLLMsCardComponent />
	</DataComponentWrapper>
); 