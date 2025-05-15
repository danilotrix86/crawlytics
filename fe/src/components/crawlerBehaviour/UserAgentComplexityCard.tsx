import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { FileDoc } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface UserAgentData {
  crawler_name: string;
  avg_length: number;
  max_length: number;
  request_count: number;
}

// Inner component for logic
const UserAgentComplexityComponent: React.FC = () => {
  // SQL query to analyze user agent strings
  const sqlQuery = `
    WITH user_agent_stats AS (
      SELECT 
        crawler_name,
        user_agent,
        LENGTH(user_agent) as ua_length,
        COUNT(*) as request_count
      FROM access_logs
      WHERE 
        crawler_name IS NOT NULL 
        AND user_agent IS NOT NULL
        {LOG_FILE_CONDITION}
      GROUP BY crawler_name, user_agent
    ),
    crawler_ua_stats AS (
      SELECT 
        crawler_name,
        ROUND(AVG(ua_length), 0) as avg_length,
        MAX(ua_length) as max_length,
        SUM(request_count) as request_count
      FROM user_agent_stats
      GROUP BY crawler_name
      ORDER BY avg_length DESC
      LIMIT 1
    )
    SELECT 
      crawler_name,
      avg_length,
      max_length,
      request_count
    FROM crawler_ua_stats
  `;
  
  // Use our custom hook for data fetching
  const { data: uaData, logFileId } = useLogFileData<UserAgentData[], UserAgentData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Default values when no data is available
  const crawlerName = uaData?.crawler_name ?? 'No crawler data';
  const avgLength = uaData?.avg_length ?? 0;
  const maxLength = uaData?.max_length ?? 0;
  const requestCount = uaData?.request_count ?? 0;
  
  // Prepare classification based on avg length with better descriptions
  let complexityClass = 'Basic UA';
  if (avgLength > 150) complexityClass = 'Long UA String';
  else if (avgLength > 100) complexityClass = 'Detailed UA';
  else if (avgLength > 50) complexityClass = 'Standard UA';
  
  const statsCardProps = {
    data: {
      title: "📝 User-Agent Length",
      number: `${avgLength} chars`,
      subtext: `${crawlerName} (${complexityClass})${getLogFileSuffix(logFileId)}`,
    },
    icon: FileDoc,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const UserAgentComplexityCard: React.FC = () => (
  <DataComponentWrapper>
    <UserAgentComplexityComponent />
  </DataComponentWrapper>
); 