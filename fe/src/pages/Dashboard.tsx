import React, { memo } from 'react';
import { TotalLogsCard } from '../components/dashboard/TotalLogsCard';
import { UniqueLLMs } from '../components/dashboard/UniqueLLMs';
import { UniqueUrlsCard } from '../components/dashboard/UniqueUrlsCard';
import { ErrorResponsesCard } from '../components/dashboard/ErrorResponsesCard';
import UserAgentChart from '../components/dashboard/UserAgentChart';
import TopPagesChart from '../components/dashboard/TopPagesChart';
import { MostActiveCrawlerCard } from '../components/dashboard/MostActiveCrawlerCard';
import { CrawlersPerPageCard } from '../components/dashboard/CrawlersPerPageCard';
import StatusCodeChart from '../components/dashboard/StatusCodeChart';
import TopCrawlersChart from '../components/dashboard/TopCrawlersChart';

interface DashboardProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const Dashboard: React.FC<DashboardProps> = memo(({ className = '' }) => {
	return (
		<div className={className} >
			{/* React 19 Document Metadata */}
			<title>Crawlytics Dashboard</title>
			<meta name="description" content="View your web crawling analytics" />

			<h1 className="text-3xl font-bold mb-6 ">Dashboard</h1>
			
			<div className="grid grid-cols-3 gap-4 mb-6">
				<TotalLogsCard />
				<UniqueLLMs />
				<UniqueUrlsCard />
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				<MostActiveCrawlerCard />
				<ErrorResponsesCard />
				<CrawlersPerPageCard />
			</div>

			<div className="w-full mb-12">
				<UserAgentChart />
			</div>
			
			<div className="grid grid-cols-1 gap-4 mb-6">
				<TopCrawlersChart />
				<StatusCodeChart />
				<TopPagesChart />
			</div>
			
		</div>
	);
});

// Add display name for better debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard; 