import React from 'react';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { getCountryName } from '../../utils/countryMappings';
import { COOKIE_NAME, getTopCountriesQuery, prepareQuery } from '../../utils/geoQueries';
import DataComponentWrapper from './shared/DataComponentWrapper';
import { SortableTable, SortableColumn } from './shared/SortableTable';

// Type definitions
interface CountryData {
  country_code: string;
  country_name?: string;
  request_count: number;
  unique_ips: number;
  percentage: number;
  top_bots: string;
}

interface TopCountriesTableProps {
  countryData?: CountryData[];
}

// Inner component with data fetching
const TopCountriesTableComponent: React.FC<TopCountriesTableProps> = ({ countryData: externalCountryData }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  const { sqlQuery, params } = prepareQuery(getTopCountriesQuery(), logFileId);

  // Fetch data using our hook
  const { data: fetchedCountryData = [] } = useSqlData<CountryData[], CountryData[]>(
    sqlQuery,
    params,
    (data) => data || []
  );

  // Use provided data or fetched data
  const data = externalCountryData && externalCountryData.length > 0
    ? externalCountryData
    : fetchedCountryData;

  // Define columns for sortable table
  const columns: SortableColumn<CountryData>[] = [
    {
      key: 'country_code',
      label: '🌎 Country',
      render: (country) => (
        <div className="flex items-center">
          <span className="font-semibold">{getCountryName(country.country_code)}</span>
        </div>
      )
    },
    {
      key: 'request_count',
      label: 'Requests',
      align: 'right',
      render: (country) => (
        <span className="font-mono font-medium">
          {Number(country.request_count).toLocaleString()}
        </span>
      )
    },
    {
      key: 'unique_ips',
      label: 'Unique IPs',
      align: 'right',
      render: (country) => (
        <span className="font-mono font-medium">
          {Number(country.unique_ips).toLocaleString()}
        </span>
      )
    },
    {
      key: 'percentage',
      label: '% of Total',
      align: 'right',
      render: (country) => (
        <div className="flex items-center justify-end">
          <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mr-2">
            <div 
              className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full" 
              style={{ width: `${Math.min(100, country.percentage)}%` }}
            />
          </div>
          <span className="font-mono font-medium">{country.percentage.toFixed(2)}%</span>
        </div>
      )
    },
    {
      key: 'top_bots',
      label: 'Bot Breakdown',
      render: (country) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {country.top_bots || 'No data available'}
        </span>
      )
    }
  ];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Top Countries by Request Volume
          {!logFileId && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">- All Log Files</span>}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Geographic distribution of LLM crawler requests</p>
      </div>
      <div className="max-h-[600px] overflow-auto">
        <SortableTable 
          data={data} 
          columns={columns} 
          initialSortColumn="request_count" 
          initialSortDirection="desc"
          emptyMessage="No country data available"
        />
      </div>
    </div>
  );
};

// Exported component with Suspense/ErrorBoundary
export const TopCountriesTable: React.FC<TopCountriesTableProps> = (props) => {
  return (
    <DataComponentWrapper>
      <TopCountriesTableComponent {...props} />
    </DataComponentWrapper>
  );
};

export default TopCountriesTable; 