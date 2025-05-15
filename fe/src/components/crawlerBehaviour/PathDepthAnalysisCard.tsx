import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { ArrowsRepeat } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface PathDepthData {
  avg_path_depth: number;
  max_path_depth: number;
  most_active_crawler: string;
}

// Inner component for logic
const PathDepthAnalysisComponent: React.FC = () => {
  // SQL query to calculate path depth statistics
  const sqlQuery = `
    WITH path_depths AS (
      SELECT 
        crawler_name,
        path,
        LENGTH(path) - LENGTH(REPLACE(path, '/', '')) AS path_depth
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
    ),
    crawler_depths AS (
      SELECT 
        crawler_name,
        AVG(path_depth) AS avg_depth,
        MAX(path_depth) AS max_depth,
        COUNT(*) AS request_count
      FROM path_depths
      GROUP BY crawler_name
      ORDER BY avg_depth DESC
      LIMIT 1
    )
    SELECT 
      crawler_name AS most_active_crawler,
      ROUND(avg_depth, 1) AS avg_path_depth,
      max_depth AS max_path_depth
    FROM crawler_depths
  `;
  
  // Use our custom hook for data fetching
  const { data: depthData, logFileId } = useLogFileData<PathDepthData[], PathDepthData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Default values when no data is available
  const avgDepth = depthData?.avg_path_depth ?? 0;
  const maxDepth = depthData?.max_path_depth ?? 0;
  const crawler = depthData?.most_active_crawler ?? 'No crawler data';
  
  const statsCardProps = {
    data: {
      title: "🔍 Path Depth",
      number: `${avgDepth} levels`,
      subtext: `${crawler} (max: ${maxDepth} levels)${getLogFileSuffix(logFileId)}`,
    },
    icon: ArrowsRepeat,
  };

  return <StatsCard {...statsCardProps} />;
};

// Exported component with DataComponentWrapper
export const PathDepthAnalysisCard: React.FC = () => (
  <DataComponentWrapper>
    <PathDepthAnalysisComponent />
  </DataComponentWrapper>
); 