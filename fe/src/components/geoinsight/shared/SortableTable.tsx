import React, { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortableColumn<T> {
  key: keyof T;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: SortableColumn<T>[];
  initialSortColumn?: keyof T;
  initialSortDirection?: SortDirection;
  emptyMessage?: string;
  className?: string;
}

export function SortableTable<T>({
  data,
  columns,
  initialSortColumn,
  initialSortDirection = 'desc',
  emptyMessage = 'No data available',
  className = ''
}: SortableTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | undefined>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  // Handle column sorting
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!data || data.length === 0 || !sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle case for strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle case for numbers
      return sortDirection === 'asc'
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  }, [data, sortColumn, sortDirection]);

  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto relative ${className}`}>
      <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
        <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key.toString()}
                className={`py-4 px-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                  column.align === 'right' ? 'text-right' : 
                  column.align === 'center' ? 'text-center' : 'text-left'
                }`}
                onClick={() => handleSort(column.key)}
              >
                <div className={`flex items-center ${
                  column.align === 'right' ? 'justify-end' : 
                  column.align === 'center' ? 'justify-center' : ''
                } gap-2`}>
                  <span>{column.label}</span>
                  {sortColumn === column.key && (
                    <span className="ml-1.5">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((item, index) => (
            <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              {columns.map((column) => (
                <td 
                  key={`${index}-${column.key.toString()}`} 
                  className={`py-4 px-4 ${
                    column.align === 'right' ? 'text-right' : 
                    column.align === 'center' ? 'text-center' : ''
                  }`}
                >
                  {column.render ? column.render(item) : String(item[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 