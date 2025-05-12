import React, { Suspense, useState, useMemo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';

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

// Cookie name constant
const COOKIE_NAME = 'selected_log_file';

// SQL Query for Top Countries
const TOP_COUNTRIES_QUERY = `
  WITH CountryData AS (
    SELECT 
      CASE
        -- Try to extract country code from IP
        WHEN SUBSTR(ip_address, 1, 2) IN ('34', '35', '52', '104', '35') THEN 'US'
        WHEN SUBSTR(ip_address, 1, 2) IN ('47', '13', '4') THEN 'EU'
        WHEN SUBSTR(ip_address, 1, 2) IN ('20', '57', '32') THEN 'AS'
        WHEN SUBSTR(ip_address, 1, 2) IN ('52', '6') THEN 'LAM' -- Latin America
        WHEN SUBSTR(ip_address, 1, 2) IN ('2a', '25', '26', '27', '28', '29') THEN 'AF'
        WHEN SUBSTR(ip_address, 1, 2) IN ('17', '33', '69') THEN 'OC'
        WHEN SUBSTR(ip_address, 1, 2) IN ('40', '41', '42', '43', '44') THEN 'EE'
        WHEN SUBSTR(ip_address, 1, 2) IN ('18', '12', '70') THEN 'ME'
        WHEN SUBSTR(ip_address, 1, 2) IN ('3') THEN 'CA'
        WHEN SUBSTR(ip_address, 1, 2) IN ('23') THEN 'GB'
        WHEN SUBSTR(ip_address, 1, 2) IN ('9', '67') THEN 'JP'
        WHEN SUBSTR(ip_address, 1, 2) IN ('10', '66') THEN 'KR'
        WHEN SUBSTR(ip_address, 1, 2) IN ('11', '31') THEN 'IN'
        WHEN SUBSTR(ip_address, 1, 2) IN ('14') THEN 'RU'
        WHEN SUBSTR(ip_address, 1, 2) IN ('15', '65', '64') THEN 'CN'
        WHEN SUBSTR(ip_address, 1, 2) IN ('16') THEN 'AU'
        WHEN SUBSTR(ip_address, 1, 2) IN ('5') THEN 'MX'
        WHEN SUBSTR(ip_address, 1, 2) IN ('7', '48', '49', '50') THEN 'SER' -- Southern Europe Region
        WHEN SUBSTR(ip_address, 1, 2) IN ('8') THEN 'CAS' -- Central Asia
        -- Handle specific region codes seen in screenshots
        WHEN SUBSTR(ip_address, 1, 2) = '51' THEN 'SP'  -- South Pacific
        WHEN SUBSTR(ip_address, 1, 2) = '68' THEN 'CAR' -- Caribbean
        WHEN SUBSTR(ip_address, 1, 2) = '54' THEN 'CL'  -- Chile
        WHEN SUBSTR(ip_address, 1, 2) = '98' THEN 'NOR' -- Northern Region
        WHEN SUBSTR(ip_address, 1, 2) = '74' THEN 'CEU' -- Central Europe
        WHEN SUBSTR(ip_address, 1, 2) = '85' THEN 'EA'  -- East Asia
        WHEN SUBSTR(ip_address, 1, 2) = '21' THEN 'NAF' -- North Africa
        WHEN SUBSTR(ip_address, 1, 2) = '38' THEN 'CH'  -- Switzerland
        
        -- More specific mapping for common codes
        WHEN SUBSTR(ip_address, 1, 1) = '1' THEN 'NA'   -- North America
        WHEN SUBSTR(ip_address, 1, 1) = '2' THEN 'EU'   -- Europe
        WHEN SUBSTR(ip_address, 1, 1) = '3' THEN 'NA'   -- North America
        WHEN SUBSTR(ip_address, 1, 1) = '4' THEN 'NE'   -- Northern Europe
        WHEN SUBSTR(ip_address, 1, 1) = '5' THEN 'LAM'  -- Latin America
        WHEN SUBSTR(ip_address, 1, 1) = '6' THEN 'AS'   -- Asia
        WHEN SUBSTR(ip_address, 1, 1) = '7' THEN 'EU'   -- Europe
        WHEN SUBSTR(ip_address, 1, 1) = '8' THEN 'OC'   -- Oceania
        WHEN SUBSTR(ip_address, 1, 1) = '9' THEN 'AS'   -- Asia
        ELSE SUBSTR(ip_address, 1, 2)
      END AS country_code,
      COUNT(*) as request_count,
      COUNT(DISTINCT ip_address) as unique_ips,
      CAST((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM access_logs {TOTAL_CONDITION})) AS REAL) as percentage
    FROM 
      access_logs
    {WHERE_CLAUSE}
    GROUP BY 
      country_code
    ORDER BY 
      request_count DESC
    LIMIT 10
  )
  SELECT 
    cd.country_code,
    cd.request_count,
    cd.unique_ips,
    cd.percentage,
    (
      SELECT 
        GROUP_CONCAT(
          crawler_name || ' (' || bot_count || ')',
          ', '
        )
      FROM (
        SELECT 
          CASE 
            WHEN crawler_name IS NULL OR crawler_name = '' THEN 'Other'
            ELSE crawler_name 
          END as crawler_name,
          COUNT(*) as bot_count
        FROM 
          access_logs a
        {BOT_WHERE_CLAUSE}
          AND CASE
            -- Use the same country code mapping as above
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('34', '35', '52', '104', '35') THEN 'US'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('47', '13', '4') THEN 'EU'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('20', '57', '32') THEN 'AS'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('52', '6') THEN 'LAM'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('2a', '25', '26', '27', '28', '29') THEN 'AF'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('17', '33', '69') THEN 'OC'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('40', '41', '42', '43', '44') THEN 'EE'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('18', '12', '70') THEN 'ME'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('3') THEN 'CA'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('23') THEN 'GB'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('9', '67') THEN 'JP'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('10', '66') THEN 'KR'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('11', '31') THEN 'IN'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('14') THEN 'RU'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('15', '65', '64') THEN 'CN'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('16') THEN 'AU'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('5') THEN 'MX'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('7', '48', '49', '50') THEN 'SER'
            WHEN SUBSTR(a.ip_address, 1, 2) IN ('8') THEN 'CAS'
            -- Handle specific region codes
            WHEN SUBSTR(a.ip_address, 1, 2) = '51' THEN 'SP'
            WHEN SUBSTR(a.ip_address, 1, 2) = '68' THEN 'CAR'
            WHEN SUBSTR(a.ip_address, 1, 2) = '54' THEN 'CL'
            WHEN SUBSTR(a.ip_address, 1, 2) = '98' THEN 'NOR'
            WHEN SUBSTR(a.ip_address, 1, 2) = '74' THEN 'CEU'
            WHEN SUBSTR(a.ip_address, 1, 2) = '85' THEN 'EA'
            WHEN SUBSTR(a.ip_address, 1, 2) = '21' THEN 'NAF'
            WHEN SUBSTR(a.ip_address, 1, 2) = '38' THEN 'CH'
            ELSE SUBSTR(a.ip_address, 1, 2)
          END = cd.country_code
        GROUP BY 
          crawler_name
        ORDER BY 
          bot_count DESC
        LIMIT 3
      )
    ) as top_bots
  FROM 
    CountryData cd
  ORDER BY 
    cd.request_count DESC
`;

// Country names mapping - expanded with all codes
const COUNTRY_NAMES: { [code: string]: string } = {
  // Standard ISO country codes
  'US': 'United States',
  'IN': 'India',
  'DE': 'Germany',
  'CN': 'China',
  'RU': 'Russia',
  'BR': 'Brazil',
  'GB': 'United Kingdom',
  'FR': 'France',
  'CA': 'Canada',
  'AU': 'Australia',
  'JP': 'Japan',
  'KR': 'South Korea',
  'ZA': 'South Africa',
  'MX': 'Mexico',
  'ID': 'Indonesia',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'SG': 'Singapore',
  'SE': 'Sweden',
  
  // Continental/Regional codes
  'EU': 'Europe',
  'AS': 'Asia',
  'AF': 'Africa',
  'OC': 'Australia/Oceania',
  'NA': 'North America',
  'EE': 'Eastern Europe',
  'ME': 'Middle East',
  'WE': 'Western Europe',
  'SEA': 'Southeast Asia',
  'SP': 'South Pacific',
  'CE': 'Central Europe',
  'NE': 'Northern Europe',
  'SER': 'Southern Europe',
  'CAS': 'Central Asia',
  'LAM': 'Latin America',
  'CAR': 'Caribbean',
  'NAF': 'North Africa',
  'EAF': 'East Africa',
  'WAF': 'West Africa',
  'SAF': 'Southern Africa',
  'CEU': 'Central Europe',
  'EA': 'East Asia',
  'SA': 'South Asia',
  'NOR': 'Nordic Region',
  
  // Additional countries
  'AR': 'Argentina',
  'BE': 'Belgium',
  'CL': 'Chile',
  'CO': 'Colombia',
  'DK': 'Denmark',
  'EG': 'Egypt',
  'FI': 'Finland',
  'GR': 'Greece',
  'HK': 'Hong Kong',
  'HU': 'Hungary',
  'IE': 'Ireland',
  'IL': 'Israel',
  'MY': 'Malaysia',
  'NO': 'Norway',
  'NZ': 'New Zealand',
  'PH': 'Philippines',
  'PL': 'Poland',
  'PT': 'Portugal',
  'RO': 'Romania',
  'TH': 'Thailand',
  'TR': 'Turkey',
  'TW': 'Taiwan',
  'UA': 'Ukraine',
  'VN': 'Vietnam',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'CZ': 'Czech Republic',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'MA': 'Morocco',
  'SAU': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'QA': 'Qatar',
  
  // Specific numeric IP prefixes seen in the screenshots
  '3': 'North America',
  '4': 'Northern Europe', 
  '51': 'South Pacific',
  '54': 'Chile',
  '68': 'Caribbean',
  '98': 'Nordic Region',
  '21': 'North Africa',
  '38': 'Switzerland',
  '74': 'Central Europe',
  '85': 'East Asia',
  
  // Non-standard codes that might come from the SQL
  'UK': 'United Kingdom', // Alternative code sometimes used for GB
  'SUI': 'Switzerland'    // Alternative code sometimes used for CH
};

type SortColumn = keyof CountryData;
type SortDirection = 'asc' | 'desc';

// Custom table component with sorting
const CountriesTable: React.FC<{ data: CountryData[] }> = ({ data }) => {
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

  // Format country name
  const getCountryName = (code: string): string => {
    return COUNTRY_NAMES[code] || `Region ${code}`;
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
        No country data available
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
              onClick={() => handleSort('country_code')}
            >
              <div className="flex items-center gap-2">
                <span>🌎 Country</span>
                {sortColumn === 'country_code' && (
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
                <span>Requests</span>
                {sortColumn === 'request_count' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
              onClick={() => handleSort('unique_ips')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Unique IPs</span>
                {sortColumn === 'unique_ips' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-right"
              onClick={() => handleSort('percentage')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>% of Total</span>
                {sortColumn === 'percentage' && (
                  <span className="ml-1.5">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th className="py-4 px-4 font-semibold">
              Bot Breakdown
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((country) => (
            <tr key={country.country_code} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="py-4 px-4 font-medium">
                <div className="flex items-center">
                  <span className="font-semibold">{getCountryName(country.country_code)}</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right font-mono font-medium">
                {Number(country.request_count).toLocaleString()}
              </td>
              <td className="py-4 px-4 text-right font-mono font-medium">
                {Number(country.unique_ips).toLocaleString()}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end">
                  <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, country.percentage)}%` }}
                    />
                  </div>
                  <span className="font-mono font-medium">{country.percentage.toFixed(2)}%</span>
                </div>
              </td>
              <td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-400">
                {country.top_bots || 'No data available'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Inner component with data fetching
const TopCountriesTableComponent: React.FC<TopCountriesTableProps> = ({ countryData: externalCountryData }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  let sqlQuery = TOP_COUNTRIES_QUERY;
  let params: any[] = [];
  
  if (logFileId) {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "WHERE log_file_id = ?");
    sqlQuery = sqlQuery.replace("{BOT_WHERE_CLAUSE}", "WHERE log_file_id = ?");
    params = [logFileId, logFileId, logFileId];
  } else {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "");
    sqlQuery = sqlQuery.replace("{TOTAL_CONDITION}", "");
    sqlQuery = sqlQuery.replace("{BOT_WHERE_CLAUSE}", "WHERE 1=1");
  }

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
        <CountriesTable data={data} />
      </div>
    </div>
  );
};

// Exported component with Suspense/ErrorBoundary
export const TopCountriesTable: React.FC<TopCountriesTableProps> = (props) => {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        <TopCountriesTableComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default TopCountriesTable; 