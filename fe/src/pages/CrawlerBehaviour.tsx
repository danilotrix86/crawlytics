import React, { memo } from 'react';
import { CrawlerRequestRateCard } from '../components/crawlerBehaviour/CrawlerRequestRateCard';
import { PathDepthAnalysisCard } from '../components/crawlerBehaviour/PathDepthAnalysisCard';
import { CrawlerErrorRateCard } from '../components/crawlerBehaviour/CrawlerErrorRateCard';
import { CrawlerPathsChart } from '../components/crawlerBehaviour/CrawlerPathsChart';

interface CrawlerBehaviourProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const CrawlerBehaviour: React.FC<CrawlerBehaviourProps> = memo(({ className = '' }) => {
	return (
		<div className={className}>
			{/* React 19 Document Metadata */}
			<title>Crawlytics Crawler Behaviour</title>
			<meta name="description" content="Analyze crawler behaviour patterns on your website" />

			<h1 className="text-3xl font-bold mb-6">Crawler Behaviour</h1>
			
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<CrawlerRequestRateCard />
				<PathDepthAnalysisCard />
				<CrawlerErrorRateCard />
			</div>
			
			<div className="grid grid-cols-1 gap-4 mb-6">
				<CrawlerPathsChart />
			</div>
			
			<div className="grid grid-cols-1 gap-4 mb-6">
				<div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
					<h2 className="text-xl font-semibold mb-2">Crawler Identification Accuracy</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						This table shows how accurately different crawlers identify themselves and their compliance with standards.
					</p>
					<div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
						<p className="text-gray-500 dark:text-gray-400">Crawler Identification Table</p>
					</div>
				</div>
			</div>
		</div>
	);
});

// Add display name for better debugging
CrawlerBehaviour.displayName = 'CrawlerBehaviour';

export default CrawlerBehaviour; 