import React, { useMemo, useState } from 'react';
import { usePaginatedSqlQuery } from '../../hooks/queries/paginatedQueries';
import { useLogFileSelection } from '../../hooks/useLogFiles/useLogFileSelection';
import { useLogsFilters, LogEntry } from '../../hooks/tables/useLogsFilters';
import { useSqlQuery } from '../../hooks/queries/sqlQueries';
import { getLogFileSuffix, createTitle, DataComponentWrapper } from '../../shared/analytics-utils';

// Import components
import FilterControls from './components/FilterControls';
import LogsTable from './components/LogsTable';
import PaginationControls from './components/PaginationControls';
import ColumnVisibilityToggle from './components/ColumnVisibilityToggle';
import GlobalSearchBox from './components/GlobalSearchBox';
import GroupByAnalytics from './components/GroupByAnalytics';
import PageSizeSelector from './components/PageSizeSelector';

// Constants
const PAGE_SIZE = 25;

const SimpleLogsTableComponent: React.FC = () => {
  // Get log file ID from the hook
  const { selectedLogId: logFileId } = useLogFileSelection();

  // Use the filters hook for all filtering, sorting, and advanced search functionality
  const {
    filters,
    sort,
    page, 
    setPage,
    dateRange,
    setDateRange,
    visibleColumns,
    advancedSearch,
    showAdvanced,
    setShowAdvanced,
    handleFilterChange,
    resetFilters,
    handleSort,
    handleColToggle,
    buildQuery,
    filterChips,
    removeFilterChip,
    handleAdvancedSearch,
  } = useLogsFilters(logFileId);

  // Create query and params
  const { query, params } = useMemo(() => buildQuery(), [buildQuery]);

  // State for page size
  const [pageSize, setPageSize] = React.useState(25);

  // Fetch data
  const { data = [], isLoading, isError } = usePaginatedSqlQuery<LogEntry[]>(
    logFileId ? query : null, // Only run query if we have a logFileId
    params,
    page,
    pageSize
  );

  // Build count query for total results
  const { query: countQuery, params: countParams } = useMemo(() => {
    const { query, params } = buildQuery();
    // Replace SELECT * ... ORDER BY ... with SELECT COUNT(*) ...
    let countQ = query.replace(/SELECT\s+\*\s+FROM/i, 'SELECT COUNT(*) as count FROM');
    // Remove ORDER BY and LIMIT/OFFSET if present
    countQ = countQ.replace(/ORDER BY[\s\S]*?(LIMIT|$)/i, '');
    countQ = countQ.replace(/LIMIT[\s\S]*/i, '');
    return { query: countQ.trim(), params };
  }, [buildQuery]);

  // Fetch total count
  const { data: countData } = useSqlQuery<{ count: number }[]>(countQuery, countParams);
  const totalResults = countData && Array.isArray(countData) && countData[0]?.count ? countData[0].count : 0;
  const totalPages = Math.ceil(totalResults / pageSize);

  // Format timestamp
  const formatDate = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Autocomplete suggestions from data
  const getUniqueValues = (data: LogEntry[], key: keyof LogEntry): string[] => {
    return Array.from(new Set(data.map(item => String(item[key])).filter(Boolean)));
  };
  
  const crawlerSuggestions = useMemo(() => getUniqueValues(data, 'crawler_name'), [data]);
  const pathSuggestions = useMemo(() => getUniqueValues(data, 'path'), [data]);

  // State for global search
  const [globalSearch, setGlobalSearch] = React.useState('');

  // Filter data by global search (case-insensitive, matches any visible column)
  const filteredData = useMemo(() => {
    if (!globalSearch.trim()) return data;
    const search = globalSearch.toLowerCase();
    return data.filter(row =>
      visibleColumns.some(colKey => {
        const value = row[colKey];
        return value && String(value).toLowerCase().includes(search);
      })
    );
  }, [data, globalSearch, visibleColumns]);

  // Reset page to 0 if pageSize or totalResults changes and page is out of range
  React.useEffect(() => {
    if (page > 0 && page * pageSize >= totalResults) {
      setPage(0);
    }
  }, [page, pageSize, totalResults, setPage]);

  // State to show/hide group by analytics
  const [showGroupBy, setShowGroupBy] = useState(false);

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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Access Logs
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
            {getLogFileSuffix(logFileId)}
          </span>
        </h2>
        <ColumnVisibilityToggle 
          visibleColumns={visibleColumns} 
          onColumnToggle={handleColToggle} 
        />
      </div>

      <FilterControls
        advancedSearch={advancedSearch}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        handleAdvancedSearch={handleAdvancedSearch}
        filterChips={filterChips}
        removeFilterChip={removeFilterChip}
        filters={filters}
        handleFilterChange={handleFilterChange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        resetFilters={resetFilters}
        crawlerSuggestions={crawlerSuggestions}
        pathSuggestions={pathSuggestions}
        extraHeaderButton={
          <button
            className="px-4 py-2 rounded-xl shadow-sm bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-300"
            onClick={() => setShowGroupBy((prev) => !prev)}
          >
            {showGroupBy ? 'Hide Group By Analytics' : 'Show Group By Analytics'}
          </button>
        }
      />

      {/* Group By Analytics Panel */}
      {showGroupBy && (
        <div className="px-4 pb-4">
          <GroupByAnalytics />
        </div>
      )}

      {/* Global Search Box */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end">
        <GlobalSearchBox
          value={globalSearch}
          onChange={setGlobalSearch}
          placeholder="Search all columns..."
        />
      </div>

      <div className="overflow-x-auto">
        {isError ? (
          <div className="p-4 text-center text-red-500">
            Error loading data. Please try again.
          </div>
        ) : (
          data.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="text-lg font-semibold mb-2">No results found</div>
              <div className="mb-2">Try removing some filters or broadening your search.</div>
              <ul className="list-disc list-inside text-sm text-gray-400 dark:text-gray-500 mx-auto inline-block text-left">
                <li>Clear or adjust filters above</li>
                <li>Check your search terms</li>
                <li>Expand the date range</li>
              </ul>
            </div>
          ) : (
            <LogsTable
              data={data}
              visibleColumns={visibleColumns}
              handleSort={handleSort}
              sort={sort}
              formatDate={formatDate}
              isLoading={isLoading}
            />
          )
        )}
      </div>

      <PaginationControls
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        dataLength={data.length}
        totalResults={totalResults}
        totalPages={totalPages}
      >
        <PageSizeSelector pageSize={pageSize} onPageSizeChange={setPageSize} options={[25, 50, 100]} />
      </PaginationControls>
    </div>
  );
};

// Use the shared DataComponentWrapper
export const SimpleLogsTable: React.FC = () => {
  return (
    <DataComponentWrapper>
      <SimpleLogsTableComponent />
    </DataComponentWrapper>
  );
};

export default SimpleLogsTable; 