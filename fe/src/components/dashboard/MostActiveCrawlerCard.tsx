import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Component as StatsCard } from '../stats/StatsCard';
import { Award } from 'flowbite-react-icons/solid';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface CrawlerData {
  crawler_name: string;
  total: number;
  percentage: number;
}

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

// Inner component for logic
const MostActiveCrawlerCardComponent: React.FC = () => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Query to get most active crawler and total requests
  const sqlQuery = `
    SELECT 
      crawler_data.crawler_name,
      crawler_data.total,
      ROUND((crawler_data.total * 100.0 / total_data.count), 1) AS percentage
    FROM 
      (
        SELECT COALESCE(crawler_name, 'Unknown') AS crawler_name, COUNT(*) AS total
        FROM access_logs
        WHERE log_file_id = $1 AND status < 400
        GROUP BY crawler_name
        ORDER BY total DESC
        LIMIT 1
      ) AS crawler_data,
      (
        SELECT COUNT(*) AS count
        FROM access_logs
        WHERE log_file_id = $2 AND status < 400
      ) AS total_data
  `;
  
  const params = [logFileId, logFileId];

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
      subtext: `${percentage}% of traffic (${total} requests)`,
    },
    icon: Award,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with Suspense/ErrorBoundary
export const MostActiveCrawlerCard: React.FC = () => {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        <MostActiveCrawlerCardComponent />
      </Suspense>
    </ErrorBoundary>
  );
}; 