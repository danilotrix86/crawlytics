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
  crawler_name: string;
  error_count: number;
  total_requests: number;
  error_rate: number;
}

// Inner component for logic
const CrawlerErrorRateComponent: React.FC = () => {
  // SQL query to find crawlers with high error rates
  const sqlQuery = `
    WITH crawler_requests AS (
      SELECT 
        crawler_name,
        COUNT(CASE WHEN status >= 400 THEN 1 ELSE NULL END) as error_count,
        COUNT(*) as total_requests
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name
      HAVING total_requests >= 10 -- Only consider crawlers with meaningful sample size
    )
    SELECT 
      crawler_name,
      error_count,
      total_requests,
      ROUND((error_count * 100.0) / total_requests, 1) as error_rate
    FROM crawler_requests
    ORDER BY error_rate DESC
    LIMIT 1
  `;
  
  // Use our custom hook for data fetching
  const { data: errorData, logFileId } = useLogFileData<ErrorRateData[], ErrorRateData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Default values when no data is available
  const crawlerName = errorData?.crawler_name ?? 'No crawler data';
  const errorCount = errorData?.error_count ?? 0;
  const totalRequests = errorData?.total_requests ?? 0;
  const errorRate = errorData?.error_rate ?? 0;
  
  // Format for display
  const errorRateFormatted = `${errorRate}%`;
  
  // Determine compliance level
  let complianceLevel = 'Good';
  if (errorRate >= 50) complianceLevel = 'Poor';
  else if (errorRate >= 25) complianceLevel = 'Problematic';
  else if (errorRate >= 10) complianceLevel = 'Fair';
  
  // Format the message based on compliance
  const message = complianceLevel === 'Good' 
    ? `${crawlerName} (${errorCount}/${totalRequests} requests)${getLogFileSuffix(logFileId)}`
    : `${crawlerName} needs review (${errorCount} errors)${getLogFileSuffix(logFileId)}`;
  
  const statsCardProps = {
    data: {
      title: "⚠️ Highest Error Rate",
      number: errorRateFormatted,
      subtext: message,
    },
    icon: ExclamationCircle,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const CrawlerErrorRateCard: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerErrorRateComponent />
  </DataComponentWrapper>
); 