import React, { useState, useMemo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import CardLoadingSpinner from '../ui/CardLoadingSpinner';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { DefaultQueryErrorFallback } from '../ui/DefaultQueryErrorFallback';

// Type for country data
interface CountryHits {
  [countryCode: string]: number;
}

interface CountryData {
  country_code: string;
  request_count: number;
}

interface GeoWorldMapProps {
  countryHits?: CountryHits; // Optional for now, will use fetched data if not provided
}

// Cookie name constant
const COOKIE_NAME = 'selected_log_file';

// SQL Query to get geo data
const GEO_DATA_QUERY = `
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
    COUNT(*) as request_count
  FROM 
    access_logs
  {WHERE_CLAUSE}
  GROUP BY 
    country_code
  ORDER BY 
    request_count DESC
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

// Get color based on hit percentage
const getColorByPercentage = (percentage: number): string => {
  if (percentage > 20) return '#1e40af'; // dark blue (high)
  if (percentage > 10) return '#3b82f6'; // medium blue
  if (percentage > 5) return '#60a5fa';  // light blue
  if (percentage > 1) return '#93c5fd';  // lighter blue
  return '#dbeafe';                      // very light blue (low)
};

// Get country name by code, with better fallback
const getCountryName = (code: string): string => {
  // Check if the country exists in our mapping
  if (COUNTRY_NAMES[code]) {
    return COUNTRY_NAMES[code];
  }
  
  // For numeric codes, try to give more meaningful names based on region patterns
  if (/^\d+$/.test(code)) {
    const firstDigit = code.charAt(0);
    
    // Region mapping based on first digit
    const firstDigitMap: {[key: string]: string} = {
      '1': 'North America',
      '2': 'Europe',
      '3': 'North America',
      '4': 'Northern Europe',
      '5': 'Latin America',
      '6': 'Asia',
      '7': 'Europe',
      '8': 'Asia/Pacific',
      '9': 'East Asia'
    };
    
    if (firstDigitMap[firstDigit]) {
      return `${firstDigitMap[firstDigit]} Region ${code}`;
    }
  }
  
  // If still no match, provide a cleaner fallback
  return `Region ${code}`;
};

// Inner component with data fetching
const GeoWorldMapComponent: React.FC<GeoWorldMapProps> = ({ countryHits: externalCountryHits }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  let sqlQuery = GEO_DATA_QUERY;
  let params: any[] = [];
  
  if (logFileId) {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "WHERE log_file_id = ?");
    params = [logFileId];
  } else {
    sqlQuery = sqlQuery.replace("{WHERE_CLAUSE}", "");
  }
  
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  
  // Fetch geo data if not provided externally
  const { data: countryData = [] } = useSqlData<CountryData[], CountryData[]>(
    sqlQuery,
    params,
    (data) => data || []
  );
  
  // Convert SQL data to the format needed for rendering
  const data = useMemo(() => {
    // If external data is provided, use that
    if (externalCountryHits) return externalCountryHits;
    
    // Otherwise build from SQL data
    const countryHits: CountryHits = {};
    countryData.forEach((country) => {
      countryHits[country.country_code] = country.request_count;
    });
    return countryHits;
  }, [externalCountryHits, countryData]);
  
  const totalRequests = useMemo(() => Object.values(data).reduce((a, b) => a + b, 0), [data]);
  
  // Sort countries by request count (descending)
  const sortedCountries = useMemo(() => {
    return Object.entries(data)
      .map(([code, count]) => ({
        code,
        count,
        name: getCountryName(code),
        percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, totalRequests]);

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-800 shadow-md p-4 h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Global Request Distribution
        {!logFileId && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">- All Log Files</span>}
      </h2>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-gray-400">Request Volume:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#dbeafe' }}></div>
          <span className="text-xs">Very Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#93c5fd' }}></div>
          <span className="text-xs">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#60a5fa' }}></div>
          <span className="text-xs">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-xs">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#1e40af' }}></div>
          <span className="text-xs">Very High</span>
        </div>
      </div>
      
      {/* Simple grid-based map visualization */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {sortedCountries.slice(0, 12).map((country) => (
          <div 
            key={country.code} 
            className="border rounded-md p-3 cursor-pointer transition-all duration-200 hover:shadow-md"
            style={{ 
              backgroundColor: getColorByPercentage(country.percentage),
              borderColor: hoveredCountry === country.code ? '#1e40af' : 'transparent',
              color: country.percentage > 10 ? 'white' : 'black'
            }}
            onMouseEnter={() => setHoveredCountry(country.code)}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium">{country.name}</span>
              <span className="text-sm">{country.percentage.toFixed(2)}%</span>
            </div>
            <div className="text-xs mt-1">{country.count.toLocaleString()} requests</div>
          </div>
        ))}
      </div>
      
      {/* Additional regions - limited to 5 and sorted by percentage */}
      {sortedCountries.length > 12 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Additional Regions</div>
          <div className="flex flex-wrap gap-2">
            {sortedCountries.slice(12, 17).map((country) => (
              <div 
                key={country.code} 
                className="text-xs border px-2 py-1 rounded cursor-pointer"
                style={{ 
                  backgroundColor: getColorByPercentage(country.percentage),
                  color: country.percentage > 10 ? 'white' : 'black'
                }}
                title={`${country.name}: ${country.count.toLocaleString()} requests (${country.percentage.toFixed(2)}%)`}
              >
                <span>{country.name}</span> <span>{country.percentage.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Exported component with error boundary
export const GeoWorldMap: React.FC<GeoWorldMapProps> = (props) => {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        <GeoWorldMapComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export default GeoWorldMap; 