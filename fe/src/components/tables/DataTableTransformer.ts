import { ColumnConfiguration } from './apex-grid-factory';
import BaseTableTransformer, { BaseTableConfig, TransformedTableData } from './BaseTableTransformer';

// Configuration for data table
export interface DataTableConfig extends BaseTableConfig {
  enableClientSideSorting?: boolean;
  initialSortColumn?: string;
  initialSortDirection?: 'asc' | 'desc';
  // Additional optional configurations
  columnWidths?: Record<string, string | number>;
  columnOrder?: string[];
  visibleColumns?: string[];
}

/**
 * Transform raw data into a format suitable for a data table
 * @param data Raw data array
 * @param config Table configuration
 * @returns Transformed table data
 */
export function transformDataTable<T extends Record<string, any>>(
  data: T[],
  config: DataTableConfig
): TransformedTableData<T> {
  // Handle empty data
  if (!Array.isArray(data) || data.length === 0) {
    return {
      columns: [],
      data: []
    };
  }

  // Get all data keys from first item or config
  const allKeys = config.columnOrder || Object.keys(data[0]);
  
  // Filter visible columns if specified
  const columnKeys = config.visibleColumns 
    ? allKeys.filter(key => config.visibleColumns?.includes(key))
    : allKeys;
  
  // Create columns automatically from data
  const columns = columnKeys.map(key => {
    // Use unknown -> any to satisfy TypeScript with dynamic column creation
    const column: any = {
      key,
      header: key
        .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
        .replace(/_/g, ' ')         // Replace underscores with spaces
        .replace(/^\w/, c => c.toUpperCase()), // Capitalize first letter
      sortable: true,
      filterable: true
    };
    
    // Apply column width if specified
    if (config.columnWidths && config.columnWidths[key]) {
      column.width = config.columnWidths[key];
    }
    
    // Set cell template based on data type of first non-null value
    const sampleValue = data.find(item => item[key] != null)?.[key];
    
    if (sampleValue instanceof Date) {
      column.cellTemplate = BaseTableTransformer.cellTemplates.date();
    } else if (typeof sampleValue === 'number') {
      column.cellTemplate = BaseTableTransformer.cellTemplates.number();
    }
    
    return column;
  });
  
  // Apply sorting if needed
  let transformedData = [...data];
  if (config.initialSortColumn) {
    transformedData = BaseTableTransformer.sortData(
      transformedData,
      config.initialSortColumn as keyof T,
      config.initialSortDirection
    );
  }
  
  return {
    columns,
    data: transformedData
  };
}

export default { transformDataTable }; 