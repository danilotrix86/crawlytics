import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePaginatedSqlQuery } from '../../hooks/queries/paginatedQueries';
import { BaseTableUI } from './BaseTableUI';
import { getCookie } from '../../utils/cookies';
import useTableUtils from './useTableUtils';
import { 
  SELECTED_LOG_FILE_COOKIE, 
  prepareSqlQuery, 
  DataComponentWrapper 
} from '../../shared/analytics-utils';
import {
  EMPTY_ARRAY,
  TABLE_CONSTANTS,
  formatTableDate,
  createTableTitle
} from '../../shared/table-utils';

// Define log entry interface based on database schema
interface LogEntry {
  id: number;
  time: string;
  ip_address: string;
  method: string;
  path: string;
  status: number;
  user_agent: string;
  crawler_name: string;
  referer: string;
  request_id: string;
  log_file_id: string;
}

// Filter interface
interface LogFilters {
  crawler?: string;
  startDate?: string;
  endDate?: string;
  method?: string;
  status?: number;
  path?: string;
}

// Default empty data fallback
const EMPTY_DATA: LogEntry[] = EMPTY_ARRAY;

const LogsTableComponent: React.FC = () => {
  // State for pagination
  const [page, setPage] = useState(0);
  
  // State for filters
  const [filters, setFilters] = useState<LogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // State for table rendering
  const [tableReady, setTableReady] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Get log file ID from cookie
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);

  // Table utilities
  const { createTextColumn, createCustomColumn } = useTableUtils();

  // Build SQL query based on filters
  const buildQuery = () => {
    let query = `
      SELECT *
      FROM access_logs
      WHERE 1=1
      {LOG_FILE_CONDITION}
    `;
    
    const queryParams: any[] = [];
    
    // Add filter conditions
    if (filters.crawler) {
      query += " AND crawler_name LIKE ?";
      queryParams.push(`%${filters.crawler}%`);
    }
    
    if (filters.startDate) {
      query += " AND time >= ?";
      queryParams.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += " AND time <= ?";
      queryParams.push(filters.endDate);
    }
    
    if (filters.method) {
      query += " AND method = ?";
      queryParams.push(filters.method);
    }
    
    if (filters.status) {
      query += " AND status = ?";
      queryParams.push(filters.status);
    }
    
    if (filters.path) {
      query += " AND path LIKE ?";
      queryParams.push(`%${filters.path}%`);
    }
    
    query += " ORDER BY time DESC";
    
    // Prepare query with log file condition
    return prepareSqlQuery({ sqlQuery: query, params: queryParams });
  };

  // Create query and params
  const { query, params } = useMemo(() => buildQuery(), [logFileId, filters]);

  // Fetch data
  const { data = EMPTY_DATA, isLoading, isError } = usePaginatedSqlQuery<LogEntry[]>(
    logFileId ? query : null, // Only run query if we have a logFileId
    params,
    page,
    TABLE_CONSTANTS.DEFAULT_PAGE_SIZE
  );

  // Delayed table rendering to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Define columns for the table with formatters
  const columns = useMemo(() => [
    createCustomColumn<LogEntry>(
      'time', 
      'Timestamp',
      (item) => item && item.time ? formatTableDate(item.time) : 'Invalid Date'
    ),
    createTextColumn<LogEntry>('ip_address', 'IP Address'),
    createTextColumn<LogEntry>('method', 'Method'),
    createCustomColumn<LogEntry>(
      'path',
      'Path',
      (item) => (
        <div className="truncate max-w-xs" title={item?.path || ''}>
          {item?.path || ''}
        </div>
      )
    ),
    createCustomColumn<LogEntry>(
      'status',
      'Status',
      (item) => (
        <span className={item?.status >= 400 ? 'text-red-500 font-semibold' : 'text-green-600'}>
          {item?.status || ''}
        </span>
      )
    ),
    createCustomColumn<LogEntry>(
      'crawler_name',
      'Crawler',
      (item) => item?.crawler_name ? item.crawler_name : <span className="text-gray-400">Unknown</span>
    )
  ], [createTextColumn, createCustomColumn]);

  // Handle filter changes
  const handleFilterChange = (key: keyof LogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page on filter change
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({});
    setPage(0);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // If no log file is selected, show a message
  if (!logFileId) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please select a log file to view logs.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        {createTableTitle('Access Logs', 'Viewing log entries for selected file')}
        <button
          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter</span>
        </button>
      </div>

      {/* Filters area */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Crawler
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                placeholder="Filter by crawler"
                value={filters.crawler || ''}
                onChange={(e) => handleFilterChange('crawler', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Path Contains
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                placeholder="Filter by path"
                value={filters.path || ''}
                onChange={(e) => handleFilterChange('path', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                HTTP Method
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                value={filters.method || ''}
                onChange={(e) => handleFilterChange('method', e.target.value || undefined)}
              >
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Code
              </label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">All Status Codes</option>
                <option value="200">200 - OK</option>
                <option value="301">301 - Moved Permanently</option>
                <option value="302">302 - Found</option>
                <option value="304">304 - Not Modified</option>
                <option value="400">400 - Bad Request</option>
                <option value="403">403 - Forbidden</option>
                <option value="404">404 - Not Found</option>
                <option value="500">500 - Server Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors mr-2"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto" ref={tableContainerRef}>
        {tableReady ? (
          <BaseTableUI
            data={data || EMPTY_DATA}
            columns={columns}
            loading={isLoading}
            height={500}
            showCard={false}
            tableClassName="w-full"
          />
        ) : (
          <div className="p-4 text-center">
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              Preparing table...
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {data.length ? page * TABLE_CONSTANTS.DEFAULT_PAGE_SIZE + 1 : 0} to {page * TABLE_CONSTANTS.DEFAULT_PAGE_SIZE + data.length} entries
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
            onClick={() => handlePageChange(page + 1)}
            disabled={data.length < TABLE_CONSTANTS.DEFAULT_PAGE_SIZE}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// Use the shared DataComponentWrapper
export const LogsTable: React.FC = () => {
  return (
    <DataComponentWrapper>
      <LogsTableComponent />
    </DataComponentWrapper>
  );
};

export default LogsTable; 