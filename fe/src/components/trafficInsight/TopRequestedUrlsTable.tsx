import React, { Suspense, useState, useMemo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { useSqlData } from '../../hooks/useSqlData';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Define the expected data shape
interface UrlData {
	page_path: string;
	hits: number;
	unique_ips: number;
	percentage: number;
}

// SQL Query for Top Requested URLs
const TOP_URLS_QUERY = `
  SELECT 
    CASE 
      WHEN path = '/' THEN '/'
      WHEN instr(path, '?') > 0 
      THEN substr(path, 1, instr(path, '?') - 1) 
      WHEN instr(path, '#') > 0
      THEN substr(path, 1, instr(path, '#') - 1)
      ELSE path 
    END AS page_path,
    COUNT(*) as hits,
    COUNT(DISTINCT ip_address) as unique_ips,
    CAST((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM access_logs WHERE log_file_id = ? AND status < 400)) AS REAL) as percentage
  FROM 
    access_logs
  WHERE 
    log_file_id = ?
    AND status < 400 -- Only count successful requests
  GROUP BY 
    page_path
  ORDER BY 
    hits DESC
  LIMIT 
    20
`;

// Constant for cookie name
const COOKIE_NAME = 'selected_log_file';

type SortColumn = keyof UrlData;
type SortDirection = 'asc' | 'desc';

// Function to truncate text with ellipsis
const truncateText = (text: string, maxLength: number) => {
	if (!text || text.length <= maxLength) return text;
	return text.substring(0, maxLength) + '...';
};

// Custom table component with sorting
const CustomTable: React.FC<{ data: UrlData[] }> = ({ data }) => {
	const [sortColumn, setSortColumn] = useState<SortColumn>('hits');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

	// Handle column sorting
	const handleSort = (column: SortColumn) => {
		if (sortColumn === column) {
			// Toggle direction if same column
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			// Set new column and default to descending
			setSortColumn(column);
			setSortDirection('desc');
		}
	};

	// Sort data
	const sortedData = useMemo(() => {
		if (!data || data.length === 0) return [];

		return [...data].sort((a, b) => {
			const aValue = a[sortColumn];
			const bValue = b[sortColumn];

			// Handle case for strings
			if (typeof aValue === 'string' && typeof bValue === 'string') {
				return sortDirection === 'asc'
					? aValue.localeCompare(bValue)
					: bValue.localeCompare(aValue);
			}

			// Handle case for numbers
			return sortDirection === 'asc'
				? Number(aValue) - Number(bValue)
				: Number(bValue) - Number(aValue);
		});
	}, [data, sortColumn, sortDirection]);

	if (!data || data.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500 dark:text-gray-400">
				No URL data available
			</div>
		);
	}

	return (
		<div className="overflow-x-auto relative shadow-md sm:rounded-lg">
			<table className="w-full text-sm text-left text-gray-600 dark:text-gray-300 table-fixed">
				<thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
					<tr>
						<th 
							className="py-4 px-4 font-semibold cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
							style={{ width: '1.5fr' }}
							onClick={() => handleSort('page_path')}
						>
							<div className="flex items-center gap-2">
								<span>🔗 URL Path</span>
								{sortColumn === 'page_path' && (
									<span className="ml-1.5 flex-shrink-0">
										{sortDirection === 'asc' ? 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
											</svg> : 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										}
									</span>
								)}
							</div>
						</th>
						<th 
							className="py-4 px-4 font-semibold cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
							style={{ width: '100px' }}
							onClick={() => handleSort('hits')}
						>
							<div className="flex items-center justify-end gap-2">
								<span>Hits</span>
								{sortColumn === 'hits' && (
									<span className="ml-1.5 flex-shrink-0">
										{sortDirection === 'asc' ? 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
											</svg> : 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										}
									</span>
								)}
							</div>
						</th>
						<th 
							className="py-4 px-4 font-semibold cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
							style={{ width: '120px' }}
							onClick={() => handleSort('unique_ips')}
						>
							<div className="flex items-center justify-end gap-2">
								<span>Unique IPs</span>
								{sortColumn === 'unique_ips' && (
									<span className="ml-1.5 flex-shrink-0">
										{sortDirection === 'asc' ? 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
											</svg> : 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										}
									</span>
								)}
							</div>
						</th>
						<th 
							className="py-4 px-4 font-semibold cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
							style={{ width: '180px' }}
							onClick={() => handleSort('percentage')}
						>
							<div className="flex items-center justify-end gap-2">
								<span>% of Total</span>
								{sortColumn === 'percentage' && (
									<span className="ml-1.5 flex-shrink-0">
										{sortDirection === 'asc' ? 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
											</svg> : 
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
											</svg>
										}
									</span>
								)}
							</div>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
					{sortedData.map((item) => (
						<tr key={item.page_path} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
							<td className="py-4 px-4 font-medium">
								<div title={item.page_path} className="truncate max-w-full">
									{truncateText(item.page_path, 50)}
								</div>
							</td>
							<td className="py-4 px-4 text-right font-mono font-medium">
								{Number(item.hits).toLocaleString()}
							</td>
							<td className="py-4 px-4 text-right font-mono font-medium">
								{Number(item.unique_ips).toLocaleString()}
							</td>
							<td className="py-4 px-4">
								<div className="flex items-center justify-end">
									<div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mr-2">
										<div 
											className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full" 
											style={{ width: `${Math.min(100, item.percentage)}%` }}
										/>
									</div>
									<span className="font-mono font-medium">{item.percentage.toFixed(1)}%</span>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

// Inner component for logic
const TopRequestedUrlsTableComponent: React.FC = () => {
	const logFileId = getCookie(COOKIE_NAME);
	const params = [logFileId, logFileId]; // Match the prefetch function parameter format

	// Fetch data using the hook
	const { data: rawData } = useSqlData<UrlData[], UrlData[]>(
		TOP_URLS_QUERY,
		params
	);

	return (
		<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md">
			<div className="max-h-[500px] overflow-auto">
				<CustomTable data={rawData || []} />
			</div>
		</div>
	);
};

// Exported component with Suspense/ErrorBoundary
export const TopRequestedUrlsTable: React.FC = () => {
	const { reset } = useQueryErrorResetBoundary();

	return (
		<ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
			<Suspense fallback={<CardLoadingSpinner />}>
				<TopRequestedUrlsTableComponent />
			</Suspense>
		</ErrorBoundary>
	);
};

export default TopRequestedUrlsTable; 