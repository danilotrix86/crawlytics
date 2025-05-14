import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Bug } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper, 
  getLogFileSuffix 
} from '../../shared/analytics-utils';

// Define the expected data shape
interface AvgCrawlersData {
  avg_crawlers_per_page: number;
  total_pages: number;
}

// Inner component for logic
const CrawlersPerPageCardComponent: React.FC = () => {
  // Base SQL with placeholder for the log_file_id condition
  const sqlQuery = `
    WITH 
      page_crawler_counts AS (
        SELECT 
          path,
          COUNT(DISTINCT crawler_name) AS unique_crawlers
        FROM access_logs
        WHERE 
          crawler_name IS NOT NULL
          {LOG_FILE_CONDITION}
        GROUP BY path
      )
    SELECT 
      ROUND(AVG(unique_crawlers), 2) AS avg_crawlers_per_page,
      COUNT(*) AS total_pages
    FROM page_crawler_counts
  `;
  
  // Use our custom hook instead of manually building the query
  const { data: avgData, logFileId } = useLogFileData<AvgCrawlersData[], AvgCrawlersData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Default values for when no data is available
  const avgCrawlers = avgData?.avg_crawlers_per_page ?? 0;
  const totalPages = avgData?.total_pages ?? 0;
  
  // Format the average for display (ensuring it shows as a decimal)
  const formattedAvg = Number(avgCrawlers).toFixed(1);

  const statsCardProps = {
    data: {
      title: "🕸️ Crawlers per Page",
      number: formattedAvg,
      subtext: `Across ${totalPages} unique pages${getLogFileSuffix(logFileId)}`,
    },
    icon: Bug,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const CrawlersPerPageCard: React.FC = () => (
  <DataComponentWrapper>
    <CrawlersPerPageCardComponent />
  </DataComponentWrapper>
); 