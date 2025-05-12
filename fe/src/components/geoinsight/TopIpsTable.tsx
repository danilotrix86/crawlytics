import React, { Suspense, useState, useMemo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';

// Type definitions
interface IpData {
  ip_address: string;
  host_org?: string;
  request_count: number;
  crawler_name?: string;
  last_seen: string;
}

interface TopIpsTableProps {
  ipData?: IpData[];
}

// Cookie name constant
const COOKIE_NAME = 'selected_log_file';

// SQL Query for Top IPs
const TOP_IPS_QUERY = `
  SELECT 
    ip_address,
    COUNT(*) as request_count,
    (
      SELECT crawler_name 
      FROM access_logs a2 
      WHERE a2.ip_address = a1.ip_address 
        {CRAWLER_LOG_FILE_CONDITION}
        AND crawler_name IS NOT NULL 
        AND crawler_name != '' 
      GROUP BY crawler_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as crawler_name,
    MAX(time) as last_seen
  FROM 
    access_logs a1
  {WHERE_CLAUSE}
  GROUP BY 
    ip_address
  ORDER BY 
    request_count DESC
  LIMIT 20
`;

// Known cloud providers and data centers for IP identification
const CLOUD_PROVIDERS: { [prefix: string]: string } = {
  '13.': 'AWS',
  '52.': 'AWS',
  '34.': 'Google Cloud',
  '35.': 'Google Cloud',
  '104.': 'Google Cloud',
  '20.': 'Microsoft Azure',
  '40.': 'Microsoft Azure',
  '51.': 'Microsoft Azure',
  '157.': 'Azure',
  '192.': 'Generic Datacenter',
  '68.': 'Comcast',
  '198.': 'Datacenter',
  '3.': 'AWS',
  '23.': 'Akamai',
  '128.': 'Academic/Research',
  '172.': 'Private',
  '8.8.': 'Google DNS',
  '1.1.': 'Cloudflare DNS',
  '54.': 'AWS'
};

// Helper function to determine the host organization
const getHostOrg = (ip: string): string => {
  for (const [prefix, provider] of Object.entries(CLOUD_PROVIDERS)) {
    if (ip.startsWith(prefix)) {
      return provider;
    }
  }
  return 'Unknown';
};

// Format date string
const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch (e) {
    return dateStr;
  }
};

type SortColumn = keyof IpData;
type SortDirection = 'asc' | 'desc';

// Custom table component with sorting
const IpsTable: React.FC<{ data: IpData[] }> = ({ data }) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('request_count');
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
        No IP data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <tr>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSort('ip_address')}
            >
              <div className="flex items-center gap-2">
                <span>IP Address</span>
                {sortColumn === 'ip_address' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSort('host_org')}
            >
              <div className="flex items-center gap-2">
                <span>Host/Organization</span>
                {sortColumn === 'host_org' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
              onClick={() => handleSort('request_count')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Request Count</span>
                {sortColumn === 'request_count' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSort('crawler_name')}
            >
              <div className="flex items-center gap-2">
                <span>Primary Bot</span>
                {sortColumn === 'crawler_name' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => handleSort('last_seen')}
            >
              <div className="flex items-center gap-2">
                <span>Last Seen</span>
                {sortColumn === 'last_seen' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((ip) => (
            <tr key={ip.ip_address} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="py-4 px-4 font-mono font-medium">
                {ip.ip_address}
              </td>
              <td className="py-4 px-4">
                <span 
                  className={`px-2 py-1 rounded text-xs ${
                    ip.host_org && ip.host_org !== 'Unknown' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {ip.host_org || getHostOrg(ip.ip_address)}
                </span>
              </td>
              <td className="py-4 px-4 text-right font-mono font-medium">
                {Number(ip.request_count).toLocaleString()}
              </td>
              <td className="py-4 px-4">
                {ip.crawler_name ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs">
                    {ip.crawler_name}
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">Unknown</span>
                )}
              </td>
              <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                {formatDate(ip.last_seen)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Inner component with data fetching
const TopIpsTableComponent: React.FC<TopIpsTableProps> = ({ ipData: externalIpData }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  let sqlQuery = TOP_IPS_QUERY;
  let params: any[] = [];
  
  if (logFileId) {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{CRAWLER_LOG_FILE_CONDITION}", "AND log_file_id = ?");
    params = [logFileId, logFileId];
  } else {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "");
    sqlQuery = sqlQuery.replace("{CRAWLER_LOG_FILE_CONDITION}", "");
  }

  // Fetch data using our hook
  const { data: fetchedIpData = [] } = useSqlData<IpData[], IpData[]>(
    sqlQuery,
    params,
    (data) => data || []
  );

  // Use provided data or fetched data
  const data = externalIpData && externalIpData.length > 0
    ? externalIpData
    : fetchedIpData;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Top IP Addresses / Data Centers
          {!logFileId && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">- All Log Files</span>}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Most active individual IPs with host information</p>
      </div>
      <div className="max-h-[600px] overflow-auto">
        <IpsTable data={data} />
      </div>
    </div>
  );
};

// Exported component with Suspense/ErrorBoundary
export const TopIpsTable: React.FC<TopIpsTableProps> = (props) => {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        <TopIpsTableComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default TopIpsTable; 