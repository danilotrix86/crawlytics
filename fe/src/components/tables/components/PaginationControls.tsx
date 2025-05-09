import React from 'react';

interface PaginationControlsProps {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  dataLength: number;
  totalResults: number;
  totalPages: number;
  children?: React.ReactNode;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  setPage,
  pageSize,
  dataLength,
  totalResults,
  totalPages,
  children,
}) => {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
      <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>
          Showing {totalResults === 0 ? 0 : page * pageSize + 1} to {page * pageSize + dataLength} of {totalResults} entries
        </span>
        <span className="hidden md:inline">|</span>
        <span>
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {children}
        <div className="flex gap-2">
          <button
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50"
            onClick={() => setPage(page + 1)}
            disabled={dataLength < pageSize}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls; 