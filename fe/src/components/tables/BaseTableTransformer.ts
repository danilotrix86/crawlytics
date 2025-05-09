import { ColumnConfiguration } from './apex-grid-factory';

// Common interface for transformer configuration
export interface BaseTableConfig {
  title: string;
  emptyMessage?: string;
  loadingMessage?: string;
  height?: number;
}

// Transformed data structure for tables
export interface TransformedTableData<T> {
  columns: any[]; // Column definitions
  data: T[];      // Row data
}

/**
 * Base table transformer with common utility methods
 */
export class BaseTableTransformer {
  /**
   * Sort data by a specific field
   * @param data Array of data to sort
   * @param field Field to sort by
   * @param direction Sort direction
   * @returns Sorted data array
   */
  static sortData<T extends Record<string, any>>(
    data: T[],
    field: keyof T,
    direction: 'asc' | 'desc' = 'asc'
  ): T[] {
    return [...data].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      // Handle nulls/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === 'asc' ? -1 : 1;
      if (bValue == null) return direction === 'asc' ? 1 : -1;
      
      // Compare strings case-insensitive
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Compare numbers or fallback to default comparison
      return direction === 'asc' 
        ? (aValue > bValue ? 1 : -1) 
        : (bValue > aValue ? 1 : -1);
    });
  }

  /**
   * Filter data by a search term across all fields
   * @param data Array of data to filter
   * @param searchTerm Term to search for
   * @returns Filtered data array
   */
  static filterData<T extends Record<string, any>>(
    data: T[],
    searchTerm: string
  ): T[] {
    if (!searchTerm || !searchTerm.trim()) {
      return data;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    return data.filter(item => {
      return Object.keys(item).some(key => {
        const value = item[key];
        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }

  /**
   * Format a date value for display
   * @param value Date value
   * @param format Display format
   * @returns Formatted date string
   */
  static formatDate(
    value: string | number | Date,
    format: 'short' | 'medium' | 'long' = 'medium'
  ): string {
    try {
      const date = new Date(value);
      
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
            day: 'numeric'
          });
      }
    } catch (e) {
      return String(value);
    }
  }

  /**
   * Create common cell templates for different data types
   */
  static cellTemplates = {
    /**
     * Create a date cell template
     */
    date: (format: 'short' | 'medium' | 'long' = 'medium') => {
      return (params: any) => {
        const value = params.value;
        if (value == null) return '';
        return BaseTableTransformer.formatDate(value, format);
      };
    },
    
    /**
     * Create a number cell template with formatting
     */
    number: (options: Intl.NumberFormatOptions = {}) => {
      return (params: any) => {
        const value = params.value;
        if (value == null) return '';
        return new Intl.NumberFormat(undefined, options).format(Number(value));
      };
    }
  };
}

export default BaseTableTransformer; 