import React, { useState, useCallback } from 'react';
import BaseTableUI, { BaseTableUIProps } from './BaseTableUI';
import useTableUtils from './useTableUtils';
import { DataComponentWrapper } from '../../shared/analytics-utils';

// Define props for the data table component
export interface DataTableUIProps<T extends object = any> 
    extends Omit<BaseTableUIProps<T>, 'onSorting' | 'onSorted'> {
  initialSortColumn?: keyof T;
  initialSortDirection?: 'asc' | 'desc';
  enableClientSideSorting?: boolean;
  withErrorBoundary?: boolean;
}

// Memoized component for better performance
export const DataTableUI = React.memo(function DataTableUI<T extends object>({
  data,
  columns,
  initialSortColumn,
  initialSortDirection = 'asc',
  enableClientSideSorting = true,
  withErrorBoundary = false,
  testId = 'data-table',
  ...restProps
}: DataTableUIProps<T>): React.ReactElement {
  const { hasTableData, createDefaultSort } = useTableUtils();
  
  // State for client-side sorting
  const [sortedData, setSortedData] = useState<T[]>(data || []);
  const [currentSort, setCurrentSort] = useState<any>(
    initialSortColumn 
      ? createDefaultSort(initialSortColumn, initialSortDirection)
      : null
  );

  // Apply initial sort if needed
  React.useEffect(() => {
    if (!enableClientSideSorting) {
      setSortedData(data || []);
      return;
    }
    
    // Apply sorting if data changes
    if (currentSort && hasTableData(data)) {
      handleSort({ detail: currentSort } as CustomEvent<any>);
    } else {
      setSortedData(data || []);
    }
  }, [data, currentSort, enableClientSideSorting]);

  // Handle sorting
  const handleSort = useCallback((e: CustomEvent<any>) => {
    if (!enableClientSideSorting || !hasTableData(data)) {
      return;
    }

    const { column, direction } = e.detail;
    setCurrentSort({ column, direction });
    
    // Simple client-side sorting
    const sortedItems = [...data].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      
      // Handle nulls
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;
      
      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Number comparison
      return direction === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (bValue > aValue ? 1 : -1);
    });
    
    setSortedData(sortedItems);
  }, [data, enableClientSideSorting, hasTableData]);
  
  const tableComponent = (
    <BaseTableUI
      data={enableClientSideSorting ? sortedData : data}
      columns={columns}
      testId={testId}
      onSorting={handleSort}
      onSorted={handleSort}
      {...restProps}
    />
  );
  
  // Use DataComponentWrapper if requested
  if (withErrorBoundary) {
    return <DataComponentWrapper>{tableComponent}</DataComponentWrapper>;
  }
  
  return tableComponent;
});

// Set display name for debugging
DataTableUI.displayName = 'DataTableUI';

export default DataTableUI; 