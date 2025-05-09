import React, { useRef } from 'react';
import { HTTP_METHODS, STATUS_CODES, type LogFilters } from '../../../hooks/tables/useLogsFilters';
import AdvancedSearchTips from './AdvancedSearchTips';
import MultiSelectDropdown from './MultiSelectDropdown';
import AutocompleteInput from './AutocompleteInput';
import DateRangePicker from './DateRangePicker';

interface FilterControlsProps {
  advancedSearch: string;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  handleAdvancedSearch: (q: string) => void;
  filterChips: { label: string; key: string }[];
  removeFilterChip: (key: string) => void;
  filters: LogFilters;
  handleFilterChange: (key: keyof LogFilters, value: any) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  resetFilters: () => void;
  crawlerSuggestions: string[];
  pathSuggestions: string[];
  extraHeaderButton?: React.ReactNode;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  advancedSearch,
  showAdvanced,
  setShowAdvanced,
  handleAdvancedSearch,
  filterChips,
  removeFilterChip,
  filters,
  handleFilterChange,
  dateRange,
  setDateRange,
  resetFilters,
  crawlerSuggestions,
  pathSuggestions,
  extraHeaderButton,
}) => {
  return (
    <>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Filter header - always visible */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Viewing log entries for selected file</p>
            </div>
            <div className="flex gap-2">
              {!showAdvanced && (
                <button
                  className="px-4 py-2 rounded-xl shadow-sm bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-300"
                  onClick={() => setShowAdvanced(true)}
                  aria-label="Open advanced search"
                >
                  Advanced Search
                </button>
              )}
              {extraHeaderButton}
            </div>
          </div>
        </div>

        {/* Advanced search interface */}
        {showAdvanced && (
          <div className="w-full flex flex-col gap-2 mt-3">
            <div className="flex flex-col md:flex-row md:items-center md:gap-2 w-full">
              <input
                type="text"
                className="w-full md:flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
                placeholder="e.g. status=404 OR 500 AND path contains /api AND method=POST"
                value={advancedSearch}
                onChange={e => handleAdvancedSearch(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 mt-2 md:mt-0">
                {advancedSearch && (
                  <button
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                    onClick={() => handleAdvancedSearch('')}
                  >
                    Clear
                  </button>
                )}
                <button
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  onClick={() => setShowAdvanced(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <AdvancedSearchTips />
          </div>
        )}
      </div>

      {/* Filter chips */}
      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
          {filterChips.map((chip) => (
            <span key={chip.key} className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-xs font-medium">
              {chip.label}
              <button className="ml-2 text-blue-500 hover:text-red-500" onClick={() => removeFilterChip(chip.key)} aria-label="Remove filter">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filters area */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Crawler</label>
            <AutocompleteInput
              value={filters.crawler || ''}
              onChange={v => handleFilterChange('crawler', v)}
              suggestions={crawlerSuggestions}
              placeholder="Filter by crawler"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Path Contains</label>
            <AutocompleteInput
              value={filters.path || ''}
              onChange={v => handleFilterChange('path', v)}
              suggestions={pathSuggestions}
              placeholder="Filter by path"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">HTTP Method</label>
            <MultiSelectDropdown<string>
              options={HTTP_METHODS}
              selected={filters.method || []}
              onChange={v => handleFilterChange('method', v)}
              label="Methods"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Status Code</label>
            <MultiSelectDropdown<number>
              options={STATUS_CODES}
              selected={filters.status || []}
              onChange={v => handleFilterChange('status', v)}
              label="Status Codes"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 uppercase tracking-wide">Date Range</label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors mr-2 text-sm font-medium"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterControls; 