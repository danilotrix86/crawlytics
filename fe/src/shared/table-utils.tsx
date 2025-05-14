import React from 'react';
import { DataComponentWrapper } from './analytics-utils';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { DefaultQueryErrorFallback } from '../components/ui/DefaultQueryErrorFallback';

/**
 * Common table constants
 */
export const TABLE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 25,
  DEFAULT_HEIGHT: 400,
  MIN_HEIGHT: 200
};

/**
 * Empty data array to use as a fallback
 */
export const EMPTY_ARRAY: any[] = [];

/**
 * Formats a date value for display in tables
 * @param timestamp Date string to format
 * @param format Optional format style
 * @returns Formatted date string
 */
export function formatTableDate(
  timestamp: string | number | Date,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  try {
    const date = new Date(timestamp);
    
    switch (format) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleString();
      case 'medium':
      default:
        return date.toLocaleString(undefined, { 
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
    }
  } catch (e) {
    return 'Invalid Date';
  }
}

/**
 * Extracts unique values from an array of objects for a specific key
 * Useful for generating filter options from table data
 */
export function getUniqueValues<T extends Record<string, any>>(
  data: T[], 
  key: keyof T
): string[] {
  if (!Array.isArray(data)) return [];
  return Array.from(new Set(
    data.map(item => String(item[key])).filter(Boolean)
  ));
}

/**
 * Higher-order component that wraps a table component with error boundary and suspense
 */
export function withTableErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => (
    <DataComponentWrapper>
      <Component {...props} />
    </DataComponentWrapper>
  );
}

/**
 * Creates a standard table title with filtering indication
 */
export function createTableTitle(
  baseTitle: string,
  subtitle?: string,
  filterText?: string
): React.ReactNode {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        {baseTitle}
      </h2>
      {(subtitle || filterText) && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
          {filterText && <span className="ml-1">{filterText}</span>}
        </p>
      )}
    </div>
  );
}

/**
 * Custom error boundary specifically for table components
 */
export function TableErrorBoundary({ children }: React.PropsWithChildren) {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary
      onReset={reset}
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-md">
          <div className="text-red-500 mb-3">
            <p className="font-semibold">Error loading table data:</p>
            <p className="text-sm">{error.message}</p>
          </div>
          <button
            onClick={resetErrorBoundary}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default {
  TABLE_CONSTANTS,
  EMPTY_ARRAY,
  formatTableDate,
  getUniqueValues,
  withTableErrorBoundary,
  createTableTitle,
  TableErrorBoundary
}; 