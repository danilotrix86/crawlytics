import React, { memo } from 'react';
import { TotalLogsCard } from '../components/dashboard/TotalLogsCard';
import GeoWorldMap from '../components/geoinsight/GeoWorldMap';
import TopCountriesTable from '../components/geoinsight/TopCountriesTable';
import TopIpsTable from '../components/geoinsight/TopIpsTable';

interface DashboardProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const GeographicInsight: React.FC<DashboardProps> = memo(({ className = '' }) => {
	return (
		<div className={className} >
			{/* React 19 Document Metadata */}
			<title>Crawlytics Geographic Insight</title>
			<meta name="description" content="View your geographic analytics" />

			<h1 className="text-3xl font-bold mb-6 ">Geographic Insight</h1>
			
			<div className="mb-6">
				<GeoWorldMap />
			</div>
			
			<div className="mb-6">
				<TopCountriesTable />
			</div>

			<div className="mb-6">
				<TopIpsTable />
			</div>
		</div>
	);
});

// Add display name for better debugging
GeographicInsight.displayName = 'GeographicInsight';

export default GeographicInsight; 