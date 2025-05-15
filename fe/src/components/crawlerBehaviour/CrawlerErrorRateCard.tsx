import React, { useState, useEffect } from 'react';
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

// A simple dialog modal that works with Tailwind
const CrawlerErrorRateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlers: ErrorRateData[];
  primaryCrawler: string;
}> = ({ isOpen, onClose, title, crawlers, primaryCrawler }) => {
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
            Error rate statistics for all crawlers
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {crawlers.map((crawler, index) => {
                const isMainCrawler = crawler.crawler_name === primaryCrawler;
                
                // Determine badge color based on error rate
                let badgeColorClass = '';
                if (crawler.error_rate >= 50) {
                  badgeColorClass = 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-300';
                } else if (crawler.error_rate >= 25) {
                  badgeColorClass = 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-300';
                } else if (crawler.error_rate >= 10) {
                  badgeColorClass = 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-300';
                } else {
                  badgeColorClass = 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-300';
                }
                
                if (isMainCrawler) {
                  badgeColorClass = 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300';
                }
                
                return (
                  <li 
                    key={index} 
                    className={`flex flex-col p-3 ${isMainCrawler ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className="flex items-center w-full">
                      <span className={`flex-1 ${isMainCrawler ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {crawler.crawler_name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${badgeColorClass}`}>
                        {crawler.error_rate}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {crawler.error_count} errors / {crawler.total_requests} requests
                    </div>
                  </li>
                );
              })}
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
const CrawlerErrorRateComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [allCrawlersData, setAllCrawlersData] = useState<ErrorRateData[]>([]);

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

  // SQL query to get data for all crawlers with error rates
  const allCrawlersQuery = `
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
    LIMIT 50
  `;
  
  // Use our custom hook for data fetching
  const { data: errorData, logFileId } = useLogFileData<ErrorRateData[]>(
    sqlQuery,
    []
  );

  // Fetch data for all crawlers
  const { data: allCrawlers } = useLogFileData<ErrorRateData[]>(
    allCrawlersQuery,
    []
  );

  // Update state when data is available
  useEffect(() => {
    if (allCrawlers && allCrawlers.length > 0) {
      setAllCrawlersData(allCrawlers);
    }
  }, [allCrawlers]);

  // Get the top crawler by error rate
  const topCrawler = Array.isArray(errorData) && errorData.length > 0 ? errorData[0] : null;

  // Default values when no data is available
  const crawlerName = topCrawler?.crawler_name ?? 'No crawler data';
  const errorCount = topCrawler?.error_count ?? 0;
  const totalRequests = topCrawler?.total_requests ?? 0;
  const errorRate = topCrawler?.error_rate ?? 0;
  
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
  
  // Create a reference to track if we've added click handlers
  const hasAddedHandlers = React.useRef(false);
  
  // Add "View All" text and make it clickable
  React.useEffect(() => {
    if (allCrawlersData.length > 1 && !hasAddedHandlers.current) {
      const statsCards = document.querySelectorAll('.error-card-container .text-gray-500');
      statsCards.forEach(card => {
        if (card.textContent?.includes(crawlerName)) {
          // Add view all text at the end
          const text = card.textContent;
          card.innerHTML = `${text} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1">(View All)</span>`;
          hasAddedHandlers.current = true;
        }
      });
      
      // Add event listener for clicks
      const container = document.querySelector('.error-card-container');
      if (container) {
        container.addEventListener('click', () => setOpenModal(true));
      }
    }
  }, [allCrawlersData, crawlerName]);
  
  const statsCardProps = {
    data: {
      title: "⚠️ Highest Error Rate",
      number: errorRateFormatted,
      subtext: message,
    },
    icon: ExclamationCircle,
  };

  return (
    <div className="error-card-container">
      <StatsCard {...statsCardProps} />
      
      {/* Modal dialog for crawler error rates */}
      <CrawlerErrorRateModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`Crawler Error Rates (${allCrawlersData.length})`}
        crawlers={allCrawlersData}
        primaryCrawler={crawlerName}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const CrawlerErrorRateCard: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerErrorRateComponent />
  </DataComponentWrapper>
); 