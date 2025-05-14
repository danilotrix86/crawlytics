import React, { Suspense } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { useSqlData } from '../hooks/useSqlData';
import { getCookie } from '../utils/cookies';
import CardLoadingSpinner from '../components/ui/CardLoadingSpinner';
import { DefaultQueryErrorFallback } from '../components/ui/DefaultQueryErrorFallback';

// Constants
export const SELECTED_LOG_FILE_COOKIE = 'selected_log_file';

// SQL query utilities
export interface QueryOptions {
  sqlQuery: string;
  params?: any[];
  logFileId?: string | null;
  logFileConditionPlaceholder?: string;
  totalConditionPlaceholder?: string;
}

/**
 * Prepares a SQL query with log file conditions
 */
export function prepareSqlQuery({
  sqlQuery,
  params = [],
  logFileId = getCookie(SELECTED_LOG_FILE_COOKIE),
  logFileConditionPlaceholder = "{LOG_FILE_CONDITION}",
  totalConditionPlaceholder = "{TOTAL_CONDITION}"
}: QueryOptions) {
  let updatedQuery = sqlQuery;
  let updatedParams = [...params];
  
  // Replace log file condition placeholder
  if (logFileId) {
    updatedQuery = updatedQuery.replace(logFileConditionPlaceholder, "AND log_file_id = ?");
    updatedParams.push(logFileId);
    
    // Replace total condition placeholder if it exists
    if (updatedQuery.includes(totalConditionPlaceholder)) {
      updatedQuery = updatedQuery.replace(totalConditionPlaceholder, "WHERE log_file_id = ?");
      updatedParams.push(logFileId);
    }
  } else {
    updatedQuery = updatedQuery.replace(logFileConditionPlaceholder, "");
    
    // Replace total condition placeholder if it exists
    if (updatedQuery.includes(totalConditionPlaceholder)) {
      updatedQuery = updatedQuery.replace(totalConditionPlaceholder, "");
    }
  }
  
  return {
    query: updatedQuery,
    params: updatedParams
  };
}

/**
 * Custom hook for fetching log data with automatic log file filtering
 */
export function useLogFileData<TData = any, TResult = TData>(
  sqlQuery: string,
  customParams: any[] = [],
  transformer?: (data: TData) => TResult,
  options: { 
    logFileConditionPlaceholder?: string;
    totalConditionPlaceholder?: string;
  } = {}
) {
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  
  const { query, params } = prepareSqlQuery({
    sqlQuery,
    params: customParams,
    logFileId,
    logFileConditionPlaceholder: options.logFileConditionPlaceholder || "{LOG_FILE_CONDITION}",
    totalConditionPlaceholder: options.totalConditionPlaceholder || "{TOTAL_CONDITION}"
  });
  
  return {
    ...useSqlData<TData, TResult>(query, params, transformer),
    logFileId,
    isFiltered: !!logFileId
  };
}

/**
 * Helper function to generate suffix text based on log file selection
 */
export function getLogFileSuffix(logFileId: string | null = getCookie(SELECTED_LOG_FILE_COOKIE)) {
  return logFileId ? "" : " - All Log Files";
}

/**
 * HOC to wrap analytics components with error boundary and suspense
 */
export function withDataComponentWrapper<P extends object>(
  Component: React.ComponentType<P>,
  LoadingComponent: React.ComponentType = CardLoadingSpinner,
  ErrorComponent: React.ComponentType<any> = DefaultQueryErrorFallback
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => {
    const { reset } = useQueryErrorResetBoundary();
    
    return (
      <ErrorBoundary onReset={reset} FallbackComponent={ErrorComponent}>
        <Suspense fallback={<LoadingComponent />}>
          <Component {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
  
  return WrappedComponent;
}

/**
 * Helper function to create dynamic chart/card titles with log file suffix
 */
export function createTitle(
  baseTitle: string, 
  logFileId: string | null = getCookie(SELECTED_LOG_FILE_COOKIE)
) {
  return `${baseTitle}${getLogFileSuffix(logFileId)}`;
}

/**
 * Ready-to-use DataComponentWrapper
 */
export const DataComponentWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary onReset={reset} FallbackComponent={DefaultQueryErrorFallback}>
      <Suspense fallback={<CardLoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}; 