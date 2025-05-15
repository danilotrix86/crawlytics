import React, { useState, useEffect } from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Clock } from 'flowbite-react-icons/solid';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface RequestRateData {
  crawler_name: string;
  total_requests: number;
  time_span_minutes: number;
  calculated_rpm: number;
}

// A simple dialog modal that works with Tailwind
const CrawlerRateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlers: RequestRateData[];
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
            Request rate statistics for all crawlers
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {crawlers.map((crawler, index) => {
                const isMainCrawler = crawler.crawler_name === primaryCrawler;
                const formattedRpm = crawler.calculated_rpm !== null ? `${crawler.calculated_rpm.toFixed(3)} RPM` : 'N/A';
                const formattedTimeSpan = formatTimeSpan(crawler.time_span_minutes);
                
                return (
                  <li 
                    key={index} 
                    className={`flex flex-col p-3 ${isMainCrawler ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <div className="flex items-center w-full">
                      <span className={`flex-1 ${isMainCrawler ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {crawler.crawler_name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        isMainCrawler 
                          ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {formattedRpm}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {crawler.total_requests} requests over {formattedTimeSpan}
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

// Helper function to format time span in appropriate units
const formatTimeSpan = (minutes: number): string => {
  if (minutes < 60) {
    // Less than an hour: show minutes
    return `${minutes.toFixed(1)} min`;
  } else if (minutes < 24 * 60) {
    // Less than a day: show hours
    const hours = minutes / 60;
    return `${hours.toFixed(1)} hours`;
  } else {
    // More than a day: show days
    const days = minutes / (24 * 60);
    return `${days.toFixed(1)} days`;
  }
};

// Inner component for logic
const CrawlerRequestRateComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [allCrawlersData, setAllCrawlersData] = useState<RequestRateData[]>([]);

  // SQL query to calculate requests and time span more carefully
  const sqlQuery = `
    WITH crawler_stats AS (
      SELECT 
        crawler_name,
        COUNT(*) as total_requests,
        MIN(time) as first_request,
        MAX(time) as last_request,
        ROUND((julianday(MAX(time)) - julianday(MIN(time))) * 24 * 60, 2) as time_span_minutes
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name
      ORDER BY total_requests DESC
    )
    SELECT 
      crawler_name,
      total_requests,
      time_span_minutes,
      CASE
        WHEN time_span_minutes < 0.1 THEN NULL -- Avoid division by very small numbers
        ELSE ROUND(CAST(total_requests AS REAL) / time_span_minutes, 3) -- More precision for low values
      END as calculated_rpm
    FROM crawler_stats
    ORDER BY 
      CASE WHEN calculated_rpm IS NULL THEN 0 ELSE 1 END DESC,
      calculated_rpm DESC
    LIMIT 1
  `;

  // SQL query to get data for all crawlers
  const allCrawlersQuery = `
    WITH crawler_stats AS (
      SELECT 
        crawler_name,
        COUNT(*) as total_requests,
        MIN(time) as first_request,
        MAX(time) as last_request,
        ROUND((julianday(MAX(time)) - julianday(MIN(time))) * 24 * 60, 2) as time_span_minutes
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name
    )
    SELECT 
      crawler_name,
      total_requests,
      time_span_minutes,
      CASE
        WHEN time_span_minutes < 0.1 THEN NULL -- Avoid division by very small numbers
        ELSE ROUND(CAST(total_requests AS REAL) / time_span_minutes, 3) -- More precision for low values
      END as calculated_rpm
    FROM crawler_stats
    WHERE total_requests > 5 -- Filter out crawlers with very few requests
    ORDER BY 
      CASE WHEN calculated_rpm IS NULL THEN 0 ELSE 1 END DESC,
      calculated_rpm DESC
    LIMIT 50
  `;
  
  // Use our custom hook for data fetching
  const { data: rateData, logFileId } = useLogFileData<RequestRateData[]>(
    sqlQuery,
    []
  );

  // Fetch data for all crawlers
  const { data: allCrawlers } = useLogFileData<RequestRateData[]>(
    allCrawlersQuery,
    []
  );

  // Update state when data is available
  useEffect(() => {
    if (allCrawlers && allCrawlers.length > 0) {
      setAllCrawlersData(allCrawlers);
    }
  }, [allCrawlers]);

  // Get the top crawler by requests
  const topCrawler = Array.isArray(rateData) && rateData.length > 0 ? rateData[0] : null;
  
  // Default values when no data is available
  const crawlerName = topCrawler?.crawler_name ?? 'No crawler data';
  const totalRequests = topCrawler?.total_requests ?? 0;
  const timeSpanMinutes = topCrawler?.time_span_minutes ?? 0;
  const calculatedRpm = topCrawler?.calculated_rpm ?? null;
  
  // Format the time span in appropriate units
  const formattedTimeSpan = formatTimeSpan(timeSpanMinutes);
  
  // Format the display based on the data
  let displayNumber: string;
  let displayText: string;
  
  if (totalRequests === 0) {
    // No data case
    displayNumber = '0 req';
    displayText = `No crawler data (0 total requests)${getLogFileSuffix(logFileId)}`;
  } else if (timeSpanMinutes < 1) {
    // Burst crawler case (all requests within a minute)
    displayNumber = `${totalRequests} req`;
    displayText = `${crawlerName} (burst crawler)${getLogFileSuffix(logFileId)}`;
  } else if (calculatedRpm === null) {
    // Can't calculate meaningful RPM
    displayNumber = `${totalRequests} req`;
    displayText = `${crawlerName} (${formattedTimeSpan} span)${getLogFileSuffix(logFileId)}`;
  } else {
    // Normal case with valid RPM
    displayNumber = `${calculatedRpm.toFixed(1)} RPM`;
    displayText = `${crawlerName} (${totalRequests} requests over ${formattedTimeSpan})${getLogFileSuffix(logFileId)}`;
  }

  // Create a reference to track if we've added click handlers
  const hasAddedHandlers = React.useRef(false);
  
  // Add "View All" text and make it clickable
  React.useEffect(() => {
    if (allCrawlersData.length > 1 && !hasAddedHandlers.current) {
      const statsCards = document.querySelectorAll('.rate-card-container .text-gray-500');
      statsCards.forEach(card => {
        if (card.textContent?.includes(crawlerName)) {
          // Add view all text at the end
          const text = card.textContent;
          card.innerHTML = `${text} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1">(View All)</span>`;
          hasAddedHandlers.current = true;
        }
      });
      
      // Add event listener for clicks
      const container = document.querySelector('.rate-card-container');
      if (container) {
        container.addEventListener('click', () => setOpenModal(true));
      }
    }
  }, [allCrawlersData, crawlerName]);
  
  const statsCardProps = {
    data: {
      title: "⏱️ Top Crawler Speed",
      number: displayNumber,
      subtext: displayText,
    },
    icon: Clock,
  };

  return (
    <div className="rate-card-container">
      <StatsCard {...statsCardProps} />
      
      {/* Modal dialog for crawler speeds */}
      <CrawlerRateModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`Crawler Request Rates (${allCrawlersData.length})`}
        crawlers={allCrawlersData}
        primaryCrawler={crawlerName}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const CrawlerRequestRateCard: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerRequestRateComponent />
  </DataComponentWrapper>
);