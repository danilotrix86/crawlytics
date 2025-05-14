import React, { useState, useEffect } from 'react';
import { useLogFileSelection } from '../../../hooks/useLogFiles/useLogFileSelection';
import AutocompleteInput from './AutocompleteInput';
import { pythonApiFetch } from '../../../utils/pythonApiClient';

// Simplified constant field definitions
const GROUP_FIELDS = [
  { label: 'Crawler', value: 'crawler_name' },
  { label: 'Path', value: 'path' },
  { label: 'Status', value: 'status' },
  { label: 'Method', value: 'method' },
];

// Component that uses direct fetch instead of hooks for better debugging
const GroupByAnalytics: React.FC = () => {
  const { selectedLogId: logFileId } = useLogFileSelection();
  const [groupBy, setGroupBy] = useState('crawler_name');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  
  // State for data and UI
  const [data, setData] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRunQuery, setHasRunQuery] = useState(false);

  // Fetch suggestions manually when filter field changes
  useEffect(() => {
    if (!filterField || !logFileId) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        // Very simple query with minimal complexity
        let query = `SELECT DISTINCT ${filterField} FROM access_logs WHERE log_file_id = ? LIMIT 50`;
        console.log('Suggestions Query:', query);
        console.log('Suggestions Params:', [logFileId]);

        const response = await pythonApiFetch('/query_sql', {
          method: 'POST',
          body: JSON.stringify({
            query,
            params: [logFileId],
            limit: 50
          })
        });

        console.log('Suggestions Response:', response);

        // Process response safely
        if (Array.isArray(response)) {
          const values = response
            .map(item => {
              if (item && item[filterField] != null) {
                let value = String(item[filterField]);
                
                // Decode URL-encoded characters for path field
                if (filterField === 'path') {
                  try {
                    value = decodeURIComponent(value);
                    
                    // More aggressive cleanup - remove ALL double quotes
                    value = value.replace(/"/g, '');
                    
                    // Clean up URL format
                    if (value.startsWith('/') && value.endsWith('/')) {
                      value = value.substring(1, value.length - 1);
                    }
                    
                    // Further cleanup for any remaining formatting issues
                    value = value.trim();
                  } catch (e) {
                    // If decoding fails, use the original value
                    console.warn('Failed to decode path:', value);
                  }
                }
                
                return value;
              }
              return null;
            })
            .filter(Boolean) as string[];

          console.log('Processed Suggestions:', values);
          setSuggestions(values);
        } else {
          console.error('Unexpected response format:', response);
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [filterField, logFileId]);

  // Run analytics query automatically when group-by changes (if a query has been run before)
  useEffect(() => {
    if (hasRunQuery) {
      runAnalytics();
    }
  }, [groupBy]); // Only trigger when group-by changes

  // Run the analytics query - triggered manually by button or automatically
  const runAnalytics = async () => {
    if (!logFileId || !groupBy) {
      setError('No log file selected');
      return;
    }

    setIsLoading(true);
    setError(null);
    setData([]);
    setHasRunQuery(true); // Mark that a query has been run

    try {
      // Build a very simple query with minimal complexity
      let query = `SELECT ${groupBy}, COUNT(*) as hits FROM access_logs WHERE log_file_id = ?`;
      const params: any[] = [logFileId];

      // Only add filter if provided and not empty
      if (filterField && filterValue && filterValue.trim()) {
        if (filterField === 'status') {
          // For status, only use if it's a valid number
          const numValue = parseInt(filterValue, 10);
          if (!isNaN(numValue)) {
            query += ` AND ${filterField} = ?`;
            params.push(numValue);
          }
        } else {
          // For text fields, use simple LIKE
          query += ` AND ${filterField} LIKE ?`;
          params.push(`%${filterValue}%`);
        }
      }

      // Add GROUP BY and ORDER BY
      query += ` GROUP BY ${groupBy} ORDER BY hits DESC LIMIT 50`;

      console.log('Analytics Query:', query);
      console.log('Analytics Params:', params);

      const response = await pythonApiFetch('/query_sql', {
        method: 'POST',
        body: JSON.stringify({
          query,
          params,
          limit: 50
        })
      });

      console.log('Analytics Response:', response);

      if (Array.isArray(response)) {
        // Filter out rows where the groupBy value is null or empty string
        // and mark if we're showing filtered results
        const filteredData = response.filter(row => 
          row[groupBy] !== null && row[groupBy] !== undefined && row[groupBy] !== ''
        );
        
        const removedEmptyValues = filteredData.length < response.length;
        
        setData(filteredData);
        
        // Set a message if we filtered out empty values
        if (removedEmptyValues && filteredData.length === 0) {
          setError(`No non-empty ${GROUP_FIELDS.find(f => f.value === groupBy)?.label} values found with the current filter.`);
        }
      } else {
        setError('Invalid response format');
        console.error('Unexpected response format:', response);
      }
    } catch (err) {
      console.error('Error running analytics query:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle filter field change
  const handleFilterFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterField(e.target.value);
    setFilterValue('');
  };

  // Handle filter value change
  const handleFilterValueChange = (value: string) => {
    if (filterField === 'status') {
      // Only allow numeric values for status
      const numericValue = value.replace(/\D/g, '');
      setFilterValue(numericValue);
    } else {
      setFilterValue(value);
    }
  };

  // Handle group by change
  const handleGroupByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupBy(e.target.value);
    // No need to manually run query here - the useEffect will do it if hasRunQuery is true
  };

  return (
    <div className="mt-6 rounded-lg border border-dashed border-green-400 bg-green-50 dark:bg-green-800 dark:border-green-600 p-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Group By</label>
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
            value={groupBy}
            onChange={handleGroupByChange}
          >
            {GROUP_FIELDS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Optional Filter</label>
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
            value={filterField}
            onChange={handleFilterFieldChange}
          >
            <option value="">None</option>
            {GROUP_FIELDS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        {filterField && (
          <div className="min-w-[500px]">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Filter Value</label>
            <AutocompleteInput
              value={filterValue}
              onChange={handleFilterValueChange}
              suggestions={suggestions}
              placeholder={`Enter ${GROUP_FIELDS.find(f => f.value === filterField)?.label}`}
            />
          </div>
        )}
        <button
          className="px-4 py-2 rounded-xl shadow-sm bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-300"
          onClick={runAnalytics}
        >
          Run
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 border border-red-300 rounded dark:bg-red-900 dark:text-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {error ? 'Error loading data.' : hasRunQuery 
              ? `No ${GROUP_FIELDS.find(f => f.value === groupBy)?.label} data found with the current filter.` 
              : 'Click Run to analyze data.'}
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-green-100 dark:bg-green-800">{GROUP_FIELDS.find(f => f.value === groupBy)?.label}</th>
                <th className="py-2 px-4 bg-green-100 dark:bg-green-800">Hits</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                // Prepare the display value with potential URL decoding for paths
                let displayValue = String(row[groupBy]);
                let titleValue = displayValue;
                
                // Decode URL-encoded characters for path field
                if (groupBy === 'path') {
                  try {
                    displayValue = decodeURIComponent(displayValue);
                    titleValue = displayValue;
                    
                    // More aggressive cleanup - remove ALL double quotes
                    displayValue = displayValue.replace(/"/g, '');
                    
                    // Clean up URL format
                    if (displayValue.startsWith('/') && displayValue.endsWith('/')) {
                      displayValue = displayValue.substring(1, displayValue.length - 1);
                    }
                    
                    // Further cleanup for any remaining formatting issues
                    displayValue = displayValue.trim();
                  } catch (e) {
                    // If decoding fails, use the original value
                    console.warn('Failed to decode path:', displayValue);
                  }
                }
                
                return (
                  <tr key={i} className="border-b border-green-200 dark:border-green-800">
                    <td className="py-2 px-4 font-mono truncate max-w-xs" title={titleValue}>
                      {displayValue}
                    </td>
                    <td className="py-2 px-4 font-semibold">{row.hits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GroupByAnalytics; 