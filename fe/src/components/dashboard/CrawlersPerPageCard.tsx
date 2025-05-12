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
interface AvgCrawlersData {
  avg_crawlers_per_page: number;
  total_pages: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const CrawlersPerPageCardComponent: React.FC = () => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Base SQL with placeholder for the log_file_id condition
  let sqlQuery = `
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
  
  let params: any[] = [];
  
  // Only filter by log_file_id if a file is selected
  if (logFileId) {
    sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "AND log_file_id = ?");
    params = [logFileId];
  } else {
    sqlQuery = sqlQuery.replace("{LOG_FILE_CONDITION}", "");
  }

  const { data: avgData } = useSqlData<AvgCrawlersData[], AvgCrawlersData>(
    sqlQuery,
    params,
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
      subtext: `Across ${totalPages} unique pages${logFileId ? "" : " - All Log Files"}`,
    },
    icon: Link,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const CrawlersPerPageCard: React.FC = () => {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        <CrawlersPerPageCardComponent />
      </Suspense>
    </ErrorBoundary>
  );
}; 