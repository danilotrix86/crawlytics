import React, { useState, useEffect } from 'react';
import { BaseTableUI, BaseTableUIProps } from './BaseTableUI';
import { EMPTY_ARRAY, TABLE_CONSTANTS } from '../../shared/table-utils';

/**
 * This wrapper component ensures the BaseTableUI receives
 * properly initialized props to avoid "Cannot convert undefined 
 * or null to object" errors that can occur when the component 
 * is rendered with incomplete data.
 */
export function StableTableWrapper<T extends object = any>(
  props: BaseTableUIProps<T>
): React.ReactElement {
  // Initial render flag to prevent immediate rendering of the grid
  const [hasRendered, setHasRendered] = useState(false);
  
  // Safely initialize data - this ensures no null/undefined is passed
  const safeData = Array.isArray(props.data) ? props.data : EMPTY_ARRAY;
  
  // Safely initialize columns - this ensures no null/undefined is passed
  const safeColumns = Array.isArray(props.columns) ? props.columns : EMPTY_ARRAY;
  
  // Mark component as mounted and ready to render after a slight delay
  useEffect(() => {
    // Set short delay before showing table to ensure DOM is ready
    const timer = setTimeout(() => {
      setHasRendered(true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []);

  // If not ready to render, show loading state
  if (!hasRendered) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Preparing table...
        </div>
      </div>
    );
  }

  // Ensure we're rendering with clean, valid props
  const cleanProps = {
    ...props,
    data: safeData,
    columns: safeColumns,
    // Set minimum valid values for any required properties
    height: props.height || TABLE_CONSTANTS.DEFAULT_HEIGHT,
    className: props.className || '',
    tableClassName: props.tableClassName || ''
  };

  // Pass safe props to the actual table component
  return <BaseTableUI {...cleanProps} />;
}

export default StableTableWrapper; 