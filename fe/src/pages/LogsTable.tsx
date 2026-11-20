import React, { memo } from 'react';
import SimpleLogsTable from '../components/tables/SimpleLogsTable';
import { useLogFileSelection } from '../hooks/useLogFiles/useLogFileSelection';
import { apiUrl } from '../utils/pythonApiClient';

interface LogsTableProps {
	className?: string;
}

// Use memo to prevent unnecessary re-renders
const LogsTable: React.FC<LogsTableProps> = memo(({ className = '' }) => {
	// Use the log file selection hook to ensure we have the latest selected log file
	const { selectedLogId } = useLogFileSelection();
	
	return (
		<div className={className}>
			{/* React 19 Document Metadata */}
			<title>Crawlytics Logs</title>
			<meta name="description" content="View and filter detailed access logs" />

			<div className="flex flex-wrap items-center justify-between gap-3 mb-6">
				<h1 className="text-3xl font-bold">Access Logs</h1>
				<div className="flex gap-2">
					{(['requests', 'referrals'] as const).map((dataset) => (
						<a
							key={dataset}
							href={apiUrl(`/export/${dataset}.csv${selectedLogId ? `?log_file_id=${encodeURIComponent(selectedLogId)}` : ''}`)}
							className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
							download
						>
							⬇ {dataset === 'requests' ? 'Crawler requests' : 'AI referrals'} (CSV)
						</a>
					))}
				</div>
			</div>
			
			<div className="grid grid-cols-1 gap-4 mb-6">
				<div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4">
					<h2 className="text-xl font-semibold mb-2">Detailed Logs</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-4">
						This table shows detailed access logs with advanced filtering, searching, and pagination capabilities.
					</p>
					<div className="mt-4">
						<SimpleLogsTable />
					</div>
				</div>
			</div>
		</div>
	);
});

// Add display name for better debugging
LogsTable.displayName = 'LogsTable';

export default LogsTable; 