import React from 'react';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { getHostOrg, formatDate } from '../../utils/cloudProviders';
import { COOKIE_NAME, getTopIpsQuery, prepareQuery } from '../../utils/geoQueries';
import DataComponentWrapper from './shared/DataComponentWrapper';
import { SortableTable, SortableColumn } from './shared/SortableTable';

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

// Inner component with data fetching
const TopIpsTableComponent: React.FC<TopIpsTableProps> = ({ ipData: externalIpData }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  const { sqlQuery, params } = prepareQuery(getTopIpsQuery(), logFileId);

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

  // Define columns for sortable table
  const columns: SortableColumn<IpData>[] = [
    {
      key: 'ip_address',
      label: 'IP Address',
      render: (ip) => (
        <span className="font-mono font-medium">{ip.ip_address}</span>
      )
    },
    {
      key: 'host_org',
      label: 'Host/Organization',
      render: (ip) => {
        const hostOrg = ip.host_org || getHostOrg(ip.ip_address);
        return (
          <span 
            className={`px-2 py-1 rounded text-xs ${
              hostOrg !== 'Unknown' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {hostOrg}
          </span>
        );
      }
    },
    {
      key: 'request_count',
      label: 'Request Count',
      align: 'right',
      render: (ip) => (
        <span className="font-mono font-medium">{Number(ip.request_count).toLocaleString()}</span>
      )
    },
    {
      key: 'crawler_name',
      label: 'Primary Bot',
      render: (ip) => (
        ip.crawler_name ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs">
            {ip.crawler_name}
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-xs">Unknown</span>
        )
      )
    },
    {
      key: 'last_seen',
      label: 'Last Seen',
      render: (ip) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(ip.last_seen)}
        </span>
      )
    }
  ];

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
        <SortableTable 
          data={data} 
          columns={columns} 
          initialSortColumn="request_count" 
          initialSortDirection="desc"
          emptyMessage="No IP data available"
        />
      </div>
    </div>
  );
};

// Exported component with Suspense/ErrorBoundary
export const TopIpsTable: React.FC<TopIpsTableProps> = (props) => {
  return (
    <DataComponentWrapper>
      <TopIpsTableComponent {...props} />
    </DataComponentWrapper>
  );
};

export default TopIpsTable; 