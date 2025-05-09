import React, { useState, useRef, useEffect } from 'react';
import { ALL_COLUMNS, ColumnKey } from '../../../hooks/tables/useLogsFilters';

interface ColumnVisibilityToggleProps {
  visibleColumns: ColumnKey[];
  onColumnToggle: (key: ColumnKey) => void;
}

const ColumnVisibilityToggle: React.FC<ColumnVisibilityToggleProps> = ({ 
  visibleColumns, 
  onColumnToggle 
}) => {
  const [showColPopover, setShowColPopover] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (colRef.current && !colRef.current.contains(e.target as Node)) {
        setShowColPopover(false);
      }
    };
    
    if (showColPopover) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showColPopover]);
  
  return (
    <div className="relative" ref={colRef}>
      <button
        type="button"
        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
        onClick={() => setShowColPopover(s => !s)}
        aria-label="Toggle column visibility"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        Columns
      </button>
      {showColPopover && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-3 z-20">
          <div className="font-semibold text-xs text-gray-500 dark:text-gray-300 mb-2">Show Columns</div>
          {ALL_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.key as ColumnKey)}
                onChange={() => onColumnToggle(col.key as ColumnKey)}
                disabled={visibleColumns.length === 1 && visibleColumns.includes(col.key as ColumnKey)}
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default ColumnVisibilityToggle; 