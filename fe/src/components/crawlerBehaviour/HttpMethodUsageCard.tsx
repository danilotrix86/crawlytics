import React, { useState, useEffect } from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Code } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface MethodData {
  crawler_name: string;
  method_count: number;
  total_requests: number;
  primary_method: string;
}

interface CrawlerMethodData {
  crawler_name: string;
  primary_method: string;
  method_count: number;
  total_requests: number;
  usage_percentage: number;
}

// A simple dialog modal that works with Tailwind
const CrawlerMethodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlerMethods: CrawlerMethodData[];
  primaryCrawler: string;
}> = ({ isOpen, onClose, title, crawlerMethods, primaryCrawler }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-gray-500/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="px-4 py-3 flex-grow overflow-y-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            HTTP method usage statistics for crawlers
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              <li className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20">
                <span className="flex-1 font-medium text-blue-700 dark:text-blue-400">{primaryCrawler}</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300 px-2 py-1 rounded flex items-center">
                  <span className="font-semibold mr-2">{crawlerMethods[0]?.primary_method}</span>
                  <span>{crawlerMethods[0]?.usage_percentage.toFixed(1)}%</span>
                </span>
              </li>
              {crawlerMethods.slice(1).map((crawler, index) => (
                <li key={index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span className="flex-1 text-gray-800 dark:text-gray-200">{crawler.crawler_name}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded flex items-center">
                    <span className="font-semibold mr-2">{crawler.primary_method}</span>
                    <span>{crawler.usage_percentage.toFixed(1)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Inner component for logic
const HttpMethodUsageComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [allCrawlerMethods, setAllCrawlerMethods] = useState<CrawlerMethodData[]>([]);

  // SQL query to analyze HTTP method usage by crawler (for primary display)
  const sqlQuery = `
    WITH method_counts AS (
      SELECT 
        crawler_name,
        method,
        COUNT(*) as method_count
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name, method
    ),
    crawler_totals AS (
      SELECT 
        crawler_name,
        SUM(method_count) as total_requests
      FROM method_counts
      GROUP BY crawler_name
    ),
    primary_methods AS (
      SELECT 
        m.crawler_name,
        m.method as primary_method,
        m.method_count,
        t.total_requests
      FROM method_counts m
      JOIN crawler_totals t ON m.crawler_name = t.crawler_name
      WHERE (m.crawler_name, m.method_count) IN (
        SELECT 
          crawler_name, 
          MAX(method_count)
        FROM method_counts
        GROUP BY crawler_name
      )
      ORDER BY t.total_requests DESC
      LIMIT 1
    )
    SELECT 
      crawler_name,
      primary_method,
      method_count,
      total_requests
    FROM primary_methods
  `;

  // SQL query for all crawlers and their method stats
  const allCrawlersQuery = `
    WITH method_counts AS (
      SELECT 
        crawler_name,
        method,
        COUNT(*) as method_count
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name, method
    ),
    crawler_totals AS (
      SELECT 
        crawler_name,
        SUM(method_count) as total_requests
      FROM method_counts
      GROUP BY crawler_name
    ),
    primary_methods AS (
      SELECT 
        m.crawler_name,
        m.method as primary_method,
        m.method_count,
        t.total_requests
      FROM method_counts m
      JOIN crawler_totals t ON m.crawler_name = t.crawler_name
      WHERE (m.crawler_name, m.method_count) IN (
        SELECT 
          crawler_name, 
          MAX(method_count)
        FROM method_counts
        GROUP BY crawler_name
      )
      ORDER BY t.total_requests DESC
      LIMIT 50
    )
    SELECT 
      crawler_name,
      primary_method,
      method_count,
      total_requests
    FROM primary_methods
  `;
  
  // Use our custom hook for data fetching
  const { data: methodData, logFileId } = useLogFileData<MethodData[], MethodData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Get all crawler methods data
  const { data: allMethodsData } = useLogFileData<CrawlerMethodData[], CrawlerMethodData[]>(
    allCrawlersQuery,
    [],
    (data) => {
      if (!data) return [];
      return data.map(item => ({
        ...item,
        usage_percentage: (item.method_count / item.total_requests) * 100
      }));
    }
  );

  // Update state when all methods data is available
  useEffect(() => {
    if (allMethodsData) {
      setAllCrawlerMethods(allMethodsData);
    }
  }, [allMethodsData]);

  // Default values when no data is available
  const crawlerName = methodData?.crawler_name ?? 'No crawler data';
  const primaryMethod = methodData?.primary_method ?? 'None';
  const methodCount = methodData?.method_count ?? 0;
  const totalRequests = methodData?.total_requests ?? 0;
  
  // Calculate percentage of requests using the primary method
  const methodPercentage = totalRequests > 0 
    ? ((methodCount / totalRequests) * 100).toFixed(1) 
    : "0.0";

  // Create a reference to track if we've added click handlers
  const hasAddedHandlers = React.useRef(false);
  
  // Add "View All" text and make it clickable
  React.useEffect(() => {
    if (allCrawlerMethods.length > 1 && !hasAddedHandlers.current) {
      const statsCards = document.querySelectorAll('.method-card-container .text-gray-500');
      statsCards.forEach(card => {
        if (card.textContent?.includes(crawlerName)) {
          // Add view all text
          const text = card.textContent;
          card.innerHTML = `${text} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1">(View All)</span>`;
          hasAddedHandlers.current = true;
        }
      });
      
      // Add event listener for clicks
      const container = document.querySelector('.method-card-container');
      if (container) {
        container.addEventListener('click', () => setOpenModal(true));
      }
    }
  }, [allCrawlerMethods, crawlerName]);

  const statsCardProps = {
    data: {
      title: "🔄 Method Preference",
      number: primaryMethod,
      subtext: `${crawlerName} (${methodPercentage}% of requests)${getLogFileSuffix(logFileId)}`,
    },
    icon: Code,
  };

  return (
    <div className="method-card-container">
      <StatsCard {...statsCardProps} />
      
      {/* Modal dialog for crawler methods */}
      <CrawlerMethodModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`HTTP Method Usage (${allCrawlerMethods.length} Crawlers)`}
        crawlerMethods={allCrawlerMethods}
        primaryCrawler={crawlerName}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const HttpMethodUsageCard: React.FC = () => (
  <DataComponentWrapper>
    <HttpMethodUsageComponent />
  </DataComponentWrapper>
); 