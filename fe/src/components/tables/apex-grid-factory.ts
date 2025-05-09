import * as React from 'react';
import { createComponent } from '@lit-labs/react';
import type { EventName } from '@lit-labs/react';
import {
  ApexFilteringEvent,
  ApexFilteredEvent,
  ApexGrid,
  ColumnConfiguration,
  FilterExpression,
  SortExpression,
} from 'apex-grid';

// Register the web component
ApexGrid.register();

/**
 * Creates a typed React wrapper component for Apex Grid
 * @returns React component that wraps the Apex Grid web component
 */
export function createApexGridWrapper<T extends object>() {
  return createComponent({
    tagName: 'apex-grid',
    elementClass: ApexGrid<T>,
    react: React,
    events: {
      onSorting: 'sorting' as EventName<CustomEvent<SortExpression<T>>>,
      onSorted: 'sorted' as EventName<CustomEvent<SortExpression<T>>>,
      onFiltering: 'filtering' as EventName<CustomEvent<ApexFilteringEvent<T>>>,
      onFiltered: 'filtered' as EventName<CustomEvent<ApexFilteredEvent<T>>>,
    },
  });
}

// Export common types from apex-grid for convenience
export type {
  ColumnConfiguration,
  FilterExpression,
  SortExpression,
  ApexFilteringEvent,
  ApexFilteredEvent
}; 