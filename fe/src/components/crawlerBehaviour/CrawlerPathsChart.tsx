import React, { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { 
  useLogFileData, 
  DataComponentWrapper,
  createTitle
} from '../../shared/analytics-utils';

// SQL Query for crawler paths analysis
const CRAWLER_PATHS_SQL = `
  WITH path_segments AS (
    SELECT 
      crawler_name,
      CASE 
        WHEN path LIKE '/' THEN '/'
        WHEN path LIKE '/%' THEN 
          CASE 
            WHEN instr(substr(path, 2), '/') > 0 
            THEN '/' || substr(path, 2, instr(substr(path, 2), '/'))
            ELSE path
          END
        ELSE path
      END as path_segment,
      COUNT(*) as request_count
    FROM access_logs
    WHERE 
      crawler_name IS NOT NULL
      {LOG_FILE_CONDITION}
    GROUP BY crawler_name, path_segment
    ORDER BY request_count DESC
  )
  SELECT 
    crawler_name,
    path_segment,
    request_count
  FROM path_segments
  ORDER BY crawler_name, request_count DESC
  LIMIT 50
`;

// Type definitions
interface PathData {
  crawler_name: string;
  path_segment: string;
  request_count: number;
}

// Function to transform SQL data into chart format
const transformPathData = (data: PathData[]) => {
  if (!data || !data.length) {
    return {
      series: [],
      labels: []
    };
  }

  // Group by crawler name
  const crawlerGroups = new Map<string, {path: string, count: number}[]>();
  
  // Process and group the data
  data.forEach(item => {
    if (!crawlerGroups.has(item.crawler_name)) {
      crawlerGroups.set(item.crawler_name, []);
    }
    
    crawlerGroups.get(item.crawler_name)!.push({
      path: item.path_segment,
      count: item.request_count
    });
  });
  
  // Get top 5 crawlers by total activity
  const topCrawlers = [...crawlerGroups.entries()]
    .map(([name, paths]) => ({
      name,
      totalRequests: paths.reduce((sum, p) => sum + p.count, 0)
    }))
    .sort((a, b) => b.totalRequests - a.totalRequests)
    .slice(0, 5)
    .map(c => c.name);
  
  // Prepare series data for chart
  const series = topCrawlers.map(crawlerName => {
    const paths = crawlerGroups.get(crawlerName) || [];
    // Sort by count and take top 8 paths
    const topPaths = paths
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    
    return {
      name: crawlerName,
      data: topPaths.map(p => p.count)
    };
  });
  
  // Get unique path segments across top crawlers
  const allTopPaths = new Set<string>();
  topCrawlers.forEach(crawler => {
    const paths = crawlerGroups.get(crawler) || [];
    paths.slice(0, 8).forEach(p => allTopPaths.add(p.path));
  });
  
  // Limit to most common paths if we have too many
  let labels = [...allTopPaths].sort();
  if (labels.length > 10) {
    // This is a simplification - in a real app we would need more sophisticated logic
    labels = labels.slice(0, 10);
  }
  
  return {
    series,
    labels
  };
};

// Content component
const CrawlerPathsContent: React.FC = () => {
  // Use our custom hook for data fetching
  const { data, logFileId } = useLogFileData<PathData[]>(
    CRAWLER_PATHS_SQL,
    []
  );
  
  // Safe data handling
  const safeData = Array.isArray(data) ? data : [];
  
  // Transform data for chart
  const chartData = useMemo(() => transformPathData(safeData), [safeData]);
  
  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: true
      },
      stacked: true
    },
    title: {
      text: createTitle('🔍 Top Crawler Path Analysis', logFileId),
      align: 'left'
    },
    xaxis: {
      categories: chartData.labels,
      title: {
        text: 'Path Segments'
      },
      labels: {
        rotate: -45,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Requests'
      }
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} requests`
      }
    },
    legend: {
      position: 'top'
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%'
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
    fill: {
      opacity: 1
    }
  };
  
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <ReactApexChart 
        options={chartOptions}
        series={chartData.series}
        type="bar"
        height={350}
      />
    </div>
  );
};

// Main exported component
export const CrawlerPathsChart: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerPathsContent />
  </DataComponentWrapper>
);

export default CrawlerPathsChart; 