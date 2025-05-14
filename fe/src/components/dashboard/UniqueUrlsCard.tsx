import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Link } from 'flowbite-react-icons/outline';
import { 
	useLogFileData, 
	DataComponentWrapper 
} from '../../shared/analytics-utils';

// Define the expected data shape
interface UniqueUrlCount {
	count: number;
}

// Inner component for logic
const UniqueUrlsCardComponent: React.FC = () => {
	// Base SQL query with placeholder for log file condition
	const sqlQuery = `
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
		WHERE 1=1 {LOG_FILE_CONDITION}
	`;
	
	// Use our custom hook for data fetching with automatic log file handling
	const { data: uniqueUrlData, logFileId } = useLogFileData<UniqueUrlCount[], UniqueUrlCount>(
		sqlQuery,
		[],
		(data) => data?.[0]
	);

	const statsCardProps = {
		data: {
			title: "🔗 Unique URLs Requested",
			subtext: "Distinct URLs requested by crawlers",
			number: uniqueUrlData?.count?.toString() ?? "0",
		},
		icon: Link,
	};

	return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const UniqueUrlsCard: React.FC = () => (
	<DataComponentWrapper>
		<UniqueUrlsCardComponent />
	</DataComponentWrapper>
); 