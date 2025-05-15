import React from 'react';
import { Component as StatsCard } from '../stats/StatsCard';
import { CalendarEdit } from 'flowbite-react-icons/outline';
import { 
  useLogFileData, 
  DataComponentWrapper,
  getLogFileSuffix
} from '../../shared/analytics-utils';
import { useState } from 'react';

// Define the expected data shape
interface ConsistencyData {
  crawler_name: string;
  consistency_score: number;
  total_days: number;
  visit_days: number;
  similar_crawlers: number;
  similar_crawler_names?: string;
}

// A simple dialog modal that works with Tailwind
const CrawlerListModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  crawlers: string[];
  primaryCrawler: string;
  visitDays: number;
  totalDays: number;
  consistencyScore: number;
}> = ({ isOpen, onClose, title, crawlers, primaryCrawler, visitDays, totalDays, consistencyScore }) => {
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
            All these crawlers were active for {visitDays} days out of {totalDays} total days ({consistencyScore}% consistency)
          </p>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              <li className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20">
                <span className="flex-1 font-medium text-blue-700 dark:text-blue-400">{primaryCrawler}</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">{visitDays} days</span>
              </li>
              {crawlers.map((name, index) => (
                <li key={index} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span className="flex-1 text-gray-800 dark:text-gray-200">{name}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">{visitDays} days</span>
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
const CrawlerConsistencyComponent: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  
  // SQL query to calculate crawler visit consistency with improved sorting
  const sqlQuery = `
    WITH daily_crawler_visits AS (
      SELECT 
        crawler_name,
        date(time) as visit_date,
        COUNT(*) as daily_count
      FROM access_logs
      WHERE crawler_name IS NOT NULL {LOG_FILE_CONDITION}
      GROUP BY crawler_name, date(time)
    ),
    date_range AS (
      SELECT 
        MIN(visit_date) as min_date,
        MAX(visit_date) as max_date,
        (julianday(MAX(visit_date)) - julianday(MIN(visit_date)) + 1) as total_days_in_range
      FROM daily_crawler_visits
    ),
    crawler_consistency AS (
      SELECT 
        crawler_name,
        COUNT(DISTINCT visit_date) as visit_days,
        (SELECT total_days_in_range FROM date_range) as total_days,
        ROUND(COUNT(DISTINCT visit_date) * 100.0 / 
          (SELECT total_days_in_range FROM date_range), 1) as consistency_score
      FROM daily_crawler_visits
      GROUP BY crawler_name
    ),
    top_crawler AS (
      SELECT 
        c1.crawler_name,
        c1.visit_days,
        c1.total_days,
        c1.consistency_score,
        (
          SELECT COUNT(*) 
          FROM crawler_consistency c2 
          WHERE c2.visit_days = c1.visit_days AND c2.crawler_name != c1.crawler_name
        ) as similar_crawlers,
        (
          SELECT GROUP_CONCAT(c3.crawler_name, '||')
          FROM crawler_consistency c3
          WHERE c3.visit_days = c1.visit_days AND c3.crawler_name != c1.crawler_name
          ORDER BY c3.crawler_name
          LIMIT 50
        ) as similar_crawler_names
      FROM crawler_consistency c1
      ORDER BY 
        c1.visit_days DESC,
        c1.consistency_score DESC
      LIMIT 1
    )
    SELECT 
      crawler_name,
      consistency_score,
      total_days,
      visit_days,
      similar_crawlers,
      similar_crawler_names
    FROM top_crawler
  `;
  
  // Use our custom hook for data fetching
  const { data: consistencyData, logFileId } = useLogFileData<ConsistencyData[], ConsistencyData>(
    sqlQuery,
    [],
    (data) => data?.[0]
  );

  // Default values when no data is available
  const crawlerName = consistencyData?.crawler_name ?? 'No crawler data';
  const consistencyScore = consistencyData?.consistency_score ?? 0;
  const visitDays = consistencyData?.visit_days ?? 0;
  const totalDays = consistencyData?.total_days ?? 0;
  const similarCrawlers = consistencyData?.similar_crawlers ?? 0;
  const similarCrawlerNames = consistencyData?.similar_crawler_names ?? '';
  
  // Format the score for display
  const formattedScore = `${consistencyScore}%`;
  
  // Parse the list of similar crawler names
  const similarCrawlersList = similarCrawlerNames.split('||').filter(name => name);
  
  // Create a div with the StatsCard inside so we can add a custom click handler
  const handleModalOpen = () => {
    setOpenModal(true);
  };
  
  // Format the subtitle text based on available crawlers
  let subtitle: string;
  
  if (similarCrawlers > 0) {
    // Just show the name and days, we'll add the View All link via DOM
    subtitle = `${crawlerName} (${visitDays}/${totalDays} days)${getLogFileSuffix(logFileId)}`;
  } else {
    subtitle = `${crawlerName} (${visitDays}/${totalDays} days)${getLogFileSuffix(logFileId)}`;
  }
  
  const statsCardProps = {
    data: {
      title: similarCrawlers > 0 ? "📅 Consistent Crawlers" : "📅 Most Consistent Crawler",
      number: formattedScore,
      subtext: subtitle,
    },
    icon: CalendarEdit,
  };

  // Find the stats card text and add a View All link if needed
  React.useEffect(() => {
    if (similarCrawlers > 0) {
      const statsCards = document.querySelectorAll('.consistency-card-container .text-gray-500');
      statsCards.forEach(card => {
        if (card.textContent?.includes(crawlerName)) {
          // Add view all text at the end
          const text = card.textContent;
          card.innerHTML = `${text} <span class="text-blue-600 dark:text-blue-400 underline cursor-pointer ml-1">(View All)</span>`;
        }
      });
      
      // Add event listener for clicks
      const container = document.querySelector('.consistency-card-container');
      if (container) {
        container.addEventListener('click', () => handleModalOpen());
      }
    }
  }, [similarCrawlers, crawlerName, handleModalOpen]);

  return (
    <div className="consistency-card-container">
      <StatsCard {...statsCardProps} />
      
      {/* Modal dialog for crawler list */}
      <CrawlerListModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        title={`All Consistent Crawlers (${similarCrawlersList.length + 1})`}
        crawlers={similarCrawlersList}
        primaryCrawler={crawlerName}
        visitDays={visitDays}
        totalDays={totalDays}
        consistencyScore={consistencyScore}
      />
    </div>
  );
};

// Exported component with DataComponentWrapper
export const CrawlerConsistencyCard: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerConsistencyComponent />
  </DataComponentWrapper>
); 