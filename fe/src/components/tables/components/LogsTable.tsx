import React from 'react';
import { ALL_COLUMNS, ColumnKey, LogEntry } from '../../../hooks/tables/useLogsFilters';

interface LogsTableProps {
  data: LogEntry[];
  visibleColumns: ColumnKey[];
  handleSort: (column: keyof LogEntry) => void;
  sort: { column: keyof LogEntry | null; direction: 'asc' | 'desc' };
  formatDate: (timestamp: string) => string;
  isLoading: boolean;
}

const LogsTable: React.FC<LogsTableProps> = ({
  data,
  visibleColumns,
  handleSort,
  sort,
  formatDate,
  isLoading,
}) => {
  // Helper for rendering sort arrows
  const renderSortArrow = (colKey: keyof LogEntry) => {
    const isActive = sort.column === colKey;
    const direction = isActive ? sort.direction : 'desc';
    return (
      <span
        className={
          'ml-1 inline-block transition-opacity ' +
          (isActive ? 'opacity-100 font-bold' : 'opacity-40')
        }
        aria-label={isActive ? (direction === 'asc' ? 'Sorted ascending' : 'Sorted descending') : 'Sortable'}
      >
        {direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Loading data...
        </div>
      </div>
    );
  }

  return (
    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
      <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
        <tr>
          {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key as ColumnKey)).map(col => (
            <th
              key={col.key}
              className="py-3 px-4 cursor-pointer select-none"
              onClick={() => handleSort(col.key as keyof LogEntry)}
            >
              {col.label}{renderSortArrow(col.key as keyof LogEntry)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {data.length > 0 ? (
          data.map((item, index) => (
            <tr
              key={item.id || index}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {ALL_COLUMNS.filter(col => visibleColumns.includes(col.key as ColumnKey)).map(col => {
                switch (col.key) {
                  case 'time':
                    return <td key={col.key} className="py-3 px-4">{formatDate(item.time)}</td>;
                  case 'ip_address':
                    return <td key={col.key} className="py-3 px-4">{item.ip_address}</td>;
                  case 'method':
                    return <td key={col.key} className="py-3 px-4">{item.method}</td>;
                  case 'path':
                    return <td key={col.key} className="py-3 px-4">
                      <div className="truncate max-w-xs" title={item.path}>{item.path}</div>
                    </td>;
                  case 'status':
                    return <td key={col.key} className="py-3 px-4">
                      <span className={item.status >= 400 ? 'text-red-500 font-semibold' : 'text-green-600'}>
                        {item.status}
                      </span>
                    </td>;
                  case 'crawler_name':
                    return <td key={col.key} className="py-3 px-4">
                      {item.crawler_name || <span className="text-gray-400">Unknown</span>}
                    </td>;
                  default:
                    return null;
                }
              })}
            </tr>
          ))
        ) : (
          <tr className="bg-white dark:bg-gray-800">
            <td colSpan={visibleColumns.length} className="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
              No log entries found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export default LogsTable; 