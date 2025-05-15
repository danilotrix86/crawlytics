import React, { useMemo, useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { 
  useLogFileData, 
  DataComponentWrapper,
  createTitle
} from '../../shared/analytics-utils';

const DISTINCT_CRAWLERS_SQL = `
  SELECT crawler_name, COUNT(*) as request_count
  FROM access_logs
  WHERE crawler_name IS NOT NULL AND crawler_name != '' {LOG_FILE_CONDITION}
  GROUP BY crawler_name
  ORDER BY request_count DESC
`;

const TOP_PATHS_FOR_CRAWLER_SQL = `
  SELECT 
    path as path_segment,
    COUNT(*) as request_count
  FROM access_logs
  WHERE crawler_name = ? {LOG_FILE_CONDITION}
  GROUP BY path_segment
  ORDER BY request_count DESC
  LIMIT 12
`;

interface CrawlerOption {
  crawler_name: string;
  request_count: number;
}

interface PathData {
  path_segment: string;
  request_count: number;
}

const CrawlerPathsContent: React.FC = () => {
  // Fetch all crawlers for dropdown
  const { data: crawlersRaw, logFileId } = useLogFileData<CrawlerOption[]>(
    DISTINCT_CRAWLERS_SQL,
    []
  );
  const crawlers = Array.isArray(crawlersRaw) ? crawlersRaw : [];

  // Default to the most active crawler
  const [selectedCrawler, setSelectedCrawler] = useState<string>('');

  // Set default crawler when crawlers are loaded
  useEffect(() => {
    if (crawlers.length > 0 && !selectedCrawler) {
      setSelectedCrawler(crawlers[0].crawler_name);
    }
  }, [crawlers, selectedCrawler]);

  // Fetch top 12 paths for the selected crawler
  const { data: pathsRaw } = useLogFileData<PathData[]>(
    TOP_PATHS_FOR_CRAWLER_SQL,
    [selectedCrawler],
    undefined,
    { logFileConditionPlaceholder: '{LOG_FILE_CONDITION}' }
  );
  const paths = Array.isArray(pathsRaw) ? pathsRaw : [];

  // Chart data
  const chartData = useMemo(() => {
    return {
      series: [{
        name: selectedCrawler,
        data: paths.map(p => p.request_count)
      }],
      labels: paths.map(p => p.path_segment)
    };
  }, [paths, selectedCrawler]);

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: true },
      stacked: false
    },
    title: {
      text: createTitle(`🔍 Top Pages for ${selectedCrawler}`, logFileId),
      align: 'left'
    },
    xaxis: {
      categories: chartData.labels,
      title: { text: 'Page Path' },
      labels: {
        rotate: -45,
        style: { fontSize: '12px', fontFamily: 'monospace' },
        formatter: (val: string) => val.length > 30 ? val.slice(0, 27) + '...' : val
      }
    },
    yaxis: {
      title: { text: 'Number of Requests' }
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value} requests`
      }
    },
    legend: { show: false },
    plotOptions: {
      bar: { horizontal: false, columnWidth: '70%' }
    },
    dataLabels: { enabled: false },
    colors: ['#3B82F6'],
    fill: { opacity: 1 }
  };

  // Copy to clipboard handler
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="mb-4 max-w-xs">
        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Crawler</label>
        <select
          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
          value={selectedCrawler}
          onChange={e => setSelectedCrawler(e.target.value)}
        >
          {crawlers.map(c => (
            <option key={c.crawler_name} value={c.crawler_name}>{c.crawler_name}</option>
          ))}
        </select>
      </div>
      {paths.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          No data for this crawler.
        </div>
      ) : (
        <>
          <ReactApexChart
            options={chartOptions}
            series={chartData.series}
            type="bar"
            height={350}
          />
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Top Pages</div>
            <ul className="space-y-1">
              {chartData.labels.map((path, idx) => (
                <li key={path} className="flex items-center gap-2">
                  <span className="break-all" title={path}>{path}</span>
                  <button
                    className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => handleCopy(path)}
                    title="Copy path"
                  >
                    Copy
                  </button>
                  <span className="text-xs text-gray-400 ml-2">({chartData.series[0].data[idx]} requests)</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export const CrawlerPathsChart: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerPathsContent />
  </DataComponentWrapper>
);

export default CrawlerPathsChart; 