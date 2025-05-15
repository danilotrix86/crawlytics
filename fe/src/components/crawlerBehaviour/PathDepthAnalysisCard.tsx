import React, { useState, useEffect } from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { ArrowsRepeat } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';

// Define the expected data shape
interface PathDepthData {
  crawler_name: string;
  avg_path_depth: number;
  max_path_depth: number;
  request_count: number;
}

// A simple dialog modal that works with Tailwind
const CrawlerDepthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlers: PathDepthData[];
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
            Path depth statistics for all crawlers
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {crawlers.map((crawler, index) => {
                const isMainCrawler = crawler.crawler_name === primaryCrawler;
                
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
                        avg {crawler.avg_path_depth.toFixed(1)} levels
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Max: {crawler.max_path_depth} levels ({crawler.request_count} requests)
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
const PathDepthAnalysisComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [allCrawlersData, setAllCrawlersData] = useState<PathDepthData[]>([]);

  // SQL query to calculate path depth statistics for top crawler
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
      crawler_name AS crawler_name,
      ROUND(avg_depth, 1) AS avg_path_depth,
      max_depth AS max_path_depth,
      request_count
    FROM crawler_depths
  `;

  // SQL query to get data for all crawlers
  const allCrawlersQuery = `
    WITH path_depths AS (
      SELECT 
        crawler_name,
        path,
        LENGTH(path) - LENGTH(REPLACE(path, '/', '')) AS path_depth
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
    )
    SELECT 
      crawler_name,
      ROUND(AVG(path_depth), 1) AS avg_path_depth,
      MAX(path_depth) AS max_path_depth,
      COUNT(*) AS request_count
    FROM path_depths
    GROUP BY crawler_name
    HAVING request_count > 5
    ORDER BY avg_path_depth DESC
    LIMIT 50
  `;
  
  // Use our custom hook for data fetching
  const { data: depthData, logFileId } = useLogFileData<PathDepthData[]>(
    sqlQuery,
    []
  );

  // Fetch data for all crawlers
  const { data: allCrawlers } = useLogFileData<PathDepthData[]>(
    allCrawlersQuery,
    []
  );

  // Update state when data is available
  useEffect(() => {
    if (allCrawlers && allCrawlers.length > 0) {
      setAllCrawlersData(allCrawlers);
    }
  }, [allCrawlers]);

  // Get the top crawler by path depth
  const topCrawler = Array.isArray(depthData) && depthData.length > 0 ? depthData[0] : null;
  
  // Default values when no data is available
  const avgDepth = topCrawler?.avg_path_depth ?? 0;
  const maxDepth = topCrawler?.max_path_depth ?? 0;
  const crawler = topCrawler?.crawler_name ?? 'No crawler data';
  
  // Create a reference to track if we've added click handlers
  const hasAddedHandlers = React.useRef(false);
  
  // Add "View All" text and make it clickable
  React.useEffect(() => {
    if (allCrawlersData.length > 1 && !hasAddedHandlers.current) {
      const statsCards = document.querySelectorAll('.depth-card-container .text-gray-500');
      statsCards.forEach(card => {
        if (card.textContent?.includes(crawler)) {
          // Add view all text at the end
          const text = card.textContent;
          card.innerHTML = `${text} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1">(View All)</span>`;
          hasAddedHandlers.current = true;
        }
      });
      
      // Add event listener for clicks
      const container = document.querySelector('.depth-card-container');
      if (container) {
        container.addEventListener('click', () => setOpenModal(true));
      }
    }
  }, [allCrawlersData, crawler]);
  
  const statsCardProps = {
    data: {
      title: "🔍 Path Depth",
      number: `avg ${avgDepth} levels`,
      subtext: `${crawler} (max: ${maxDepth} levels)${getLogFileSuffix(logFileId)}`,
    },
    icon: ArrowsRepeat,
  };

  return (
    <div className="depth-card-container">
      <StatsCard {...statsCardProps} />
      
      {/* Modal dialog for crawler depths */}
      <CrawlerDepthModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`Crawler Path Depths (${allCrawlersData.length})`}
        crawlers={allCrawlersData}
        primaryCrawler={crawler}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const PathDepthAnalysisCard: React.FC = () => (
  <DataComponentWrapper>
    <PathDepthAnalysisComponent />
  </DataComponentWrapper>
); 