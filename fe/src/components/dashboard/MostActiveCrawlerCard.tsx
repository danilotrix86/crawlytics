import React, { useState, useEffect, useMemo } from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { Award } from 'flowbite-react-icons/solid';
import { 
  DataComponentWrapper,
  getLogFileSuffix,
  SELECTED_LOG_FILE_COOKIE
} from '../../shared/analytics-utils';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';

// Unified data structure for crawler stats
interface CrawlerStat {
  crawler_name: string;
  request_count: number;
}

// Modal component to display crawler activity
const CrawlerActivityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlers: CrawlerStat[];
  primaryCrawlerName: string;
  grandTotalRequests: number;
}> = ({ isOpen, onClose, title, crawlers, primaryCrawlerName, grandTotalRequests }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-gray-500/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col backdrop-blur-sm"
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
            Top crawlers by request volume. Total requests: {grandTotalRequests}
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {crawlers.map((crawler, index) => {
                const isPrimary = crawler.crawler_name === primaryCrawlerName;
                const percentage = grandTotalRequests > 0 
                  ? ((crawler.request_count / grandTotalRequests) * 100).toFixed(1) 
                  : '0.0';
                return (
                  <li 
                    key={index} 
                    className={`flex items-center p-3 ${isPrimary ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                  >
                    <span className={`flex-1 ${isPrimary ? 'font-medium text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {crawler.crawler_name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded mr-2 ${isPrimary ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {crawler.request_count} requests
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${isPrimary ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {percentage}%
                    </span>
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
const MostActiveCrawlerCardComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  
  const CRAWLER_STATS_QUERY = `
    SELECT
        COALESCE(crawler_name, 'Unknown') AS crawler_name,
        COUNT(*) AS request_count
    FROM access_logs
    WHERE 1=1 ${logFileId ? 'AND log_file_id = ?' : ''}
    GROUP BY crawler_name
    ORDER BY request_count DESC
  `;
  
  const params = logFileId ? [logFileId] : [];
  
  const { data: rawStatsData } = useSqlData<CrawlerStat[]>(CRAWLER_STATS_QUERY, params);

  const processedStats = useMemo(() => {
    if (!rawStatsData || rawStatsData.length === 0) {
      return {
        hasData: false,
        crawlerNameForCard: 'None',
        countForCard: 0,
        percentageForCard: '0.0',
        grandTotalRequests: 0,
        modalCrawlers: [],
      };
    }

    const grandTotalRequests = rawStatsData.reduce((sum, stat) => sum + stat.request_count, 0);
    const topCrawlerStat = rawStatsData[0];
    
    const percentageForCard = grandTotalRequests > 0
      ? ((topCrawlerStat.request_count / grandTotalRequests) * 100).toFixed(1)
      : '0.0';

    return {
      hasData: true,
      crawlerNameForCard: topCrawlerStat.crawler_name,
      countForCard: topCrawlerStat.request_count,
      percentageForCard: percentageForCard,
      grandTotalRequests: grandTotalRequests,
      modalCrawlers: rawStatsData.slice(0, 50),
    };
  }, [rawStatsData]);

  const handleModalOpen = () => {
    if (processedStats.hasData) {
        setOpenModal(true);
    }
  };

  useEffect(() => {
    if (processedStats.hasData) {
      const cardContainer = document.querySelector('.most-active-crawler-card-container');
      const subtextElement = cardContainer?.querySelector('.text-gray-500');

      if (subtextElement && !subtextElement.querySelector('.view-all-link')) {
        const originalText = subtextElement.textContent?.replace(/\s*\(View All\)$/, '').trim() ?? '';
        // Ensure the (View All) is not duplicated if text content already includes it from previous renders
        if (!originalText.includes('(View All)')){
             subtextElement.innerHTML = `${originalText} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1 view-all-link">(View All)</span>`;
        }
      }
      
      if (cardContainer && !(cardContainer as any).hasClickListener) {
        cardContainer.addEventListener('click', handleModalOpen);
        (cardContainer as any).hasClickListener = true;
      }
    } else {
        // Clean up if no data (e.g. log file changes to one with no crawlers)
        const cardContainer = document.querySelector('.most-active-crawler-card-container');
        const subtextElement = cardContainer?.querySelector('.text-gray-500 .view-all-link');
        if (subtextElement) {
            subtextElement.remove();
        }
        // Note: Removing event listener might be more complex if component re-renders often,
        // but for this specific case, hasClickListener flag helps avoid re-adding.
    }
  }, [processedStats, handleModalOpen]); // Added handleModalOpen to dependencies

  const statsCardProps = {
    data: {
      title: "🤖 Top Crawler",
      number: processedStats.crawlerNameForCard,
      subtext: `${processedStats.percentageForCard}% of traffic (${processedStats.countForCard} requests)${getLogFileSuffix(logFileId)}`,
    },
    icon: Award,
  };

  return (
    <div className="most-active-crawler-card-container"> 
      <StatsCard {...statsCardProps} />
      <CrawlerActivityModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`Top Crawler Activity (${processedStats.modalCrawlers.length})`}
        crawlers={processedStats.modalCrawlers}
        primaryCrawlerName={processedStats.crawlerNameForCard}
        grandTotalRequests={processedStats.grandTotalRequests}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const MostActiveCrawlerCard: React.FC = () => (
  <DataComponentWrapper>
    <MostActiveCrawlerCardComponent />
  </DataComponentWrapper>
); 