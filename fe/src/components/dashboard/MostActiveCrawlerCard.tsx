import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Award } from 'flowbite-react-icons/solid';
import { 
  DataComponentWrapper,
  getLogFileSuffix,
  SELECTED_LOG_FILE_COOKIE
} from '../../shared/analytics-utils';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';

// Define the expected data shape
interface CrawlerData {
  crawler_name: string;
  total: number;
  percentage: number;
}

// Inner component for logic
const MostActiveCrawlerCardComponent: React.FC = () => {
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  
  // Build the query with explicit conditions for both subqueries
  let sqlQuery = `
    SELECT 
      crawler_data.crawler_name,
      crawler_data.total,
      ROUND((crawler_data.total * 100.0 / total_data.count), 1) AS percentage
    FROM 
      (
        SELECT COALESCE(crawler_name, 'Unknown') AS crawler_name, COUNT(*) AS total
        FROM access_logs
        WHERE 1=1
  `;
  
  // Add log file conditions and parameters
  let params: any[] = [];
  
  if (logFileId) {
    sqlQuery += ` AND log_file_id = ?`;
    params.push(logFileId);
  }
  
  sqlQuery += `
        GROUP BY crawler_name
        ORDER BY total DESC
        LIMIT 1
      ) AS crawler_data,
      (
        SELECT COUNT(*) AS count
        FROM access_logs
        WHERE 1=1
  `;
  
  // Add the same condition to the second subquery
  if (logFileId) {
    sqlQuery += ` AND log_file_id = ?`;
    params.push(logFileId);
  }
  
  sqlQuery += `
      ) AS total_data
  `;
  
  // Use direct SQL data fetching instead of the utility hook
  const { data: crawlerData } = useSqlData<CrawlerData[], CrawlerData>(
    sqlQuery,
    params,
    (data) => data?.[0]
  );

  // Default values for when no data is available
  const crawlerName = crawlerData?.crawler_name ?? 'None';
  const percentage = crawlerData?.percentage ?? 0;
  const total = crawlerData?.total ?? 0;

  const statsCardProps = {
    data: {
      title: "🤖 Top Crawler",
      number: crawlerName,
      subtext: `${percentage}% of traffic (${total} requests)${getLogFileSuffix(logFileId)}`,
    },
    icon: Award,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const MostActiveCrawlerCard: React.FC = () => (
  <DataComponentWrapper>
    <MostActiveCrawlerCardComponent />
  </DataComponentWrapper>
); 