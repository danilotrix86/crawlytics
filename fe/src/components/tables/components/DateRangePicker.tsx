import React, { useState, useRef, useEffect } from 'react';

interface DateRangePickerProps {
  value: { start: string; end: string };
  onChange: (v: { start: string; end: string }) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [show, setShow] = useState(false);
  const [local, setLocal] = useState<{ start: string; end: string }>(value);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLocal(value);
  }, [value, show]);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  const handleApply = () => {
    onChange(local);
    setTimeout(() => setShow(false), 0);
  };
  
  const handleClear = () => {
    setLocal({ start: '', end: '' });
    onChange({ start: '', end: '' });
    setShow(false);
  };
  
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm flex items-center gap-2"
        onClick={() => setShow(s => !s)}
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <span>
          {value.start ? new Date(value.start).toLocaleString() : 'Start'}
          {' '}–{' '}
          {value.end ? new Date(value.end).toLocaleString() : 'End'}
        </span>
      </button>
      {show && (
        <div className="absolute z-10 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg p-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Start</label>
            <input
              type="datetime-local"
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
              value={local.start}
              onChange={e => setLocal(l => ({ ...l, start: e.target.value }))}
            />
            <label className="text-xs text-gray-500 dark:text-gray-400">End</label>
            <input
              type="datetime-local"
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
              value={local.end}
              onChange={e => setLocal(l => ({ ...l, end: e.target.value }))}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" 
                onClick={handleClear}
              >
                Clear
              </button>
              <button 
                type="button" 
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" 
                onClick={handleApply}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 