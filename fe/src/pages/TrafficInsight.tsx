import React, { memo } from 'react';
import TrafficHeatmapChart from '../components/trafficInsight/TrafficHeatmapChart';
import { PeakActivityStats1 } from '../components/trafficInsight/PeakActivityStats1';
import { PeakActivityStats2 } from '../components/trafficInsight/PeakActivityStats2';
import { PeakActivityStats3 } from '../components/trafficInsight/PeakActivityStats3';
import TopRequestedUrlsTable from '../components/trafficInsight/TopRequestedUrlsTable';

interface TrafficInsightProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const TrafficInsight: React.FC<TrafficInsightProps> = memo(({ className = '' }) => {
	return (
		<div className={className}>
			{/* React 19 Document Metadata */}
			<title>Crawlytics Traffic Insight</title>
			<meta name="description" content="Analyze your website traffic patterns" />

			<h1 className="text-3xl font-bold mb-6">Traffic Insight</h1>
			
			{/* Peak Activity Section - Now using 3 separate components */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				<PeakActivityStats1 />
				<PeakActivityStats2 />
				<PeakActivityStats3 />
			</div>
			
			<div className="grid grid-cols-1 gap-4 mb-6">
				<div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
					<h2 className="text-xl font-semibold mb-2">Traffic Patterns</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						This heatmap visualizes traffic by day of week and hour of day. 
						Use the toggles to switch between all traffic, bot traffic, and human traffic.
					</p>
					<div className="mt-4">
						<TrafficHeatmapChart />
					</div>
				</div>
			</div>
			
			{/* Top Requested URLs Table */}
			<div className="grid grid-cols-1 gap-4 mb-6">
				<div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
					<h2 className="text-xl font-semibold mb-2">Top Requested URLs</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						This table shows the most frequently accessed URLs, the number of hits, unique IP addresses,
						and the percentage of total traffic each URL represents.
					</p>
					<div className="mt-4">
						<TopRequestedUrlsTable />
					</div>
				</div>
			</div>
			
			
		</div>
	);
});

// Add display name for better debugging
TrafficInsight.displayName = 'TrafficInsight';

export default TrafficInsight; 