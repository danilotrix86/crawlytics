import { useCallback } from 'react';
import { ColumnConfiguration } from './apex-grid-factory';

/**
 * Custom hook providing utility functions for table components
 */
export function useTableUtils() {
  /**
   * Creates a column configuration for a simple text column
   */
  const createTextColumn = useCallback(<T extends object>(
    key: keyof T,
    header: string,
    options: Partial<ColumnConfiguration<T>> = {}
  ): ColumnConfiguration<T> => {
    return {
      key,
      header,
      sortable: true,
      filterable: true,
      ...options
    } as unknown as ColumnConfiguration<T>;
  }, []);

  /**
   * Creates a column configuration with a custom cell renderer
   */
  const createCustomColumn = useCallback(<T extends object>(
    key: keyof T, 
    header: string,
    cellTemplate: (params: any) => any,
    options: Partial<ColumnConfiguration<T>> = {}
  ): ColumnConfiguration<T> => {
    return {
      key,
      header,
      sortable: true,
      filterable: true,
      cellTemplate,
      ...options
    } as unknown as ColumnConfiguration<T>;
  }, []);

  /**
   * Validates table data, checking if it has valid content
   */
  const hasTableData = useCallback((data: any[]): boolean => {
    return Array.isArray(data) && data.length > 0;
  }, []);

  /**
   * Creates a default sort expression for initial table loading
   */
  const createDefaultSort = useCallback(<T extends object>(
    key: keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ): any => {
    return {
      column: key,
      direction
    };
  }, []);

  return {
    createTextColumn,
    createCustomColumn,
    hasTableData,
    createDefaultSort
  };
}

export default useTableUtils; 