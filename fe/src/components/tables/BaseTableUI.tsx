import React from 'react';
import { Card } from 'flowbite-react';
import { createApexGridWrapper, ColumnConfiguration } from './apex-grid-factory';

// Create a non-generic grid for the base component
const BaseApexGrid = createApexGridWrapper<any>();

// Define props for all table UI components
export interface BaseTableUIProps<T extends object = any> {
  // Core data props
  data: T[];
  columns: any[]; // Using any[] to avoid complex typings
  // Styling props
  className?: string;
  cardClassName?: string;
  tableClassName?: string;
  showCard?: boolean;
  cardProps?: Record<string, any>;
  // Testing props
  testId?: string;
  // State props
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  noDataComponent?: React.ReactNode;
  noDataMessage?: string;
  // Table configuration
  height?: number | string;
  minHeight?: number | string;
  // Events
  onSorting?: (e: CustomEvent<any>) => void;
  onSorted?: (e: CustomEvent<any>) => void;
  onFiltering?: (e: CustomEvent<any>) => void;
  onFiltered?: (e: CustomEvent<any>) => void;
}

const DEFAULT_HEIGHT = 400;

// Base table UI component
export const BaseTableUI = React.memo(function BaseTableUI<T extends object>({
  data,
  columns,
  className = '',
  cardClassName = '',
  tableClassName = '',
  showCard = true,
  cardProps = {},
  testId = 'base-table',
  loading = false,
  loadingComponent,
  noDataComponent,
  noDataMessage = 'No data available',
  height: propHeight,
  minHeight = 200,
  onSorting,
  onSorted,
  onFiltering,
  onFiltered,
}: BaseTableUIProps<T>): React.ReactElement {
  // Configure height with defaults
  const tableHeight = propHeight || DEFAULT_HEIGHT;
  
  // Get numeric height for container sizing
  const numericHeight = typeof tableHeight === 'string' ?
    parseInt(tableHeight, 10) : tableHeight;
  const validHeight = isNaN(numericHeight) || numericHeight <= 0 ?
    DEFAULT_HEIGHT : numericHeight;

  // Determine if there's data to show
  const hasData = !loading && Array.isArray(data) && data.length > 0;

  // Content rendering based on state
  const renderContent = () => {
    if (loading) {
      return (
        <div
          className="flex items-center justify-center"
          style={{ minHeight: `${minHeight}px`, height: `${validHeight}px` }}
          data-testid={`${testId}-loading`}
        >
          {loadingComponent || (
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              Loading table data...
            </div>
          )}
        </div>
      );
    }

    if (hasData) {
      return (
        <div className={`w-full ${tableClassName}`} data-testid={`${testId}-content`}>
          <BaseApexGrid
            data={data}
            columns={columns}
            style={{ height: `${validHeight}px` }}
            onSorting={onSorting}
            onSorted={onSorted}
            onFiltering={onFiltering}
            onFiltered={onFiltered}
          />
        </div>
      );
    }

    return (
      <div
        className="flex items-center justify-center text-center p-4"
        style={{ minHeight: `${minHeight}px`, height: `${validHeight}px` }}
        data-testid={`${testId}-no-data`}
      >
        {noDataComponent || (
          <p className="text-gray-500 dark:text-gray-400">{noDataMessage}</p>
        )}
      </div>
    );
  };

  // Container classes
  const containerClasses = `transition-standard dark:bg-gray-800 w-full ${className}`;

  if (showCard) {
    return (
      <Card
        className={`${containerClasses} hover:shadow-lg ${cardClassName}`}
        data-testid={testId}
        {...cardProps}
      >
        {renderContent()}
      </Card>
    );
  }

  return (
    <div className={containerClasses} data-testid={testId}>
      {renderContent()}
    </div>
  );
});

// Set display name for debugging
BaseTableUI.displayName = 'BaseTableUI';

export default BaseTableUI; 