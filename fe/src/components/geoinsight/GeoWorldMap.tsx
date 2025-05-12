import React, { useState, useMemo } from 'react';
import { useSqlData } from '../../hooks/useSqlData';
import { getCookie } from '../../utils/cookies';
import { getCountryName, getColorByPercentage } from '../../utils/countryMappings';
import { COOKIE_NAME, getGeoDataQuery, prepareQuery } from '../../utils/geoQueries';
import DataComponentWrapper from './shared/DataComponentWrapper';

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

// Inner component with data fetching
const GeoWorldMapComponent: React.FC<GeoWorldMapProps> = ({ countryHits: externalCountryHits }) => {
  const logFileId = getCookie(COOKIE_NAME);
  
  // Prepare SQL query based on log file selection
  const { sqlQuery, params } = prepareQuery(getGeoDataQuery(), logFileId);
  
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
  return (
    <DataComponentWrapper>
      <GeoWorldMapComponent {...props} />
    </DataComponentWrapper>
  );
};

export default GeoWorldMap; 