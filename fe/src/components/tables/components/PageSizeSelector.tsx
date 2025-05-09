import React from 'react';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
}

const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({ pageSize, onPageSizeChange, options = [25, 50, 100] }) => {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size-select" className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</label>
      <select
        id="page-size-select"
        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
        value={pageSize}
        onChange={e => onPageSizeChange(Number(e.target.value))}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
};

export default PageSizeSelector; 