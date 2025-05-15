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
  const [isCopied, setIsCopied] = useState<string | null>(null);

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

  // Reset copy indicator after 2 seconds
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  // Find max request value for better scaling
  const maxRequests = useMemo(() => {
    if (!paths.length) return 100;
    return Math.max(...paths.map(p => p.request_count));
  }, [paths]);

  // Determine loading state
  const isLoading = crawlers.length === 0 || (selectedCrawler && paths.length === 0);

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
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    title: {
      text: createTitle(`🔍 Top Pages for ${selectedCrawler}`, logFileId),
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: '600'
      }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        distributed: false,
        dataLabels: {
          position: 'top'
        },
        barHeight: '70%'
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${value.toLocaleString()} requests`
      },
      theme: 'dark',
      style: {
        fontSize: '12px'
      }
    },
    grid: {
      borderColor: '#e0e0e0',
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: false
        }
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 10
      }
    },
    colors: ['#3B82F6'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'horizontal',
        shadeIntensity: 0.25,
        gradientToColors: ['#60A5FA'],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1
      }
    },
    xaxis: {
      categories: chartData.labels,
      title: {
        text: 'Number of Requests',
        style: {
          fontSize: '12px',
          fontWeight: '400'
        }
      },
      axisBorder: {
        show: true,
        color: '#e0e0e0'
      },
      axisTicks: {
        show: true,
        color: '#e0e0e0'
      },
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
          fontFamily: 'monospace'
        },
        formatter: ((val: string) => {
          if (val.length > 30) {
            return val.slice(0, 27) + '...';
          }
          return val;
        }) as any,
        maxWidth: 200
      }
    },
    legend: {
      show: false
    }
  };

  // Copy to clipboard handler
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(text);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-2">
        <div className="w-full md:w-auto">
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Crawler</label>
          <select
            className="w-full md:w-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-blue-500 dark:focus:border-blue-600 transition-colors"
            value={selectedCrawler}
            onChange={e => setSelectedCrawler(e.target.value)}
            disabled={crawlers.length === 0}
          >
            {crawlers.length ? (
              crawlers.map(c => (
                <option key={c.crawler_name} value={c.crawler_name}>{c.crawler_name}</option>
              ))
            ) : (
              <option value="">Loading crawlers...</option>
            )}
          </select>
        </div>
        {!isLoading && paths.length > 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing top {paths.length} paths crawled by <span className="font-semibold">{selectedCrawler}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : paths.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
          No data for this crawler.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ReactApexChart
              options={chartOptions}
              series={chartData.series}
              type="bar"
              height={380}
            />
          </div>
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Top Pages</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Click "Copy" to copy the full path</div>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {chartData.labels.map((path, idx) => {
                  const count = chartData.series[0].data[idx];
                  const percentage = maxRequests > 0 ? (count / maxRequests) * 100 : 0;
                  
                  return (
                    <li key={path} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <div className="relative p-3">
                        <div className="absolute top-0 left-0 h-full bg-blue-100 dark:bg-blue-900/20" style={{ width: `${percentage}%` }}></div>
                        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="font-mono text-sm truncate flex-1" title={path}>
                            {path}
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                              {count.toLocaleString()} requests
                            </span>
                            <button
                              className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                              onClick={() => handleCopy(path)}
                              title="Copy path"
                            >
                              {isCopied === path ? (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Copied
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                                    <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                                  </svg>
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
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