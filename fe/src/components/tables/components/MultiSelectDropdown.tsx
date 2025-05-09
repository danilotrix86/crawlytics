import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps<T extends string | number> {
  options: T[];
  selected: T[];
  onChange: (v: T[]) => void;
  label: string;
}

const MultiSelectDropdown = <T extends string | number>({ 
  options, 
  selected, 
  onChange, 
  label 
}: MultiSelectDropdownProps<T>) => {
  const [open, setOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState<T[]>(selected);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLocalSelected(selected);
  }, [selected, open]);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  const handleApply = () => {
    onChange(localSelected);
    setTimeout(() => setOpen(false), 0);
  };
  
  const handleClear = () => {
    setLocalSelected([]);
  };
  
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm flex justify-between items-center"
        onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
      >
        {selected.length ? selected.join(', ') : `All ${label}`}
        <span className="ml-2">▼</span>
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-auto p-2"
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="mb-2 max-h-40 overflow-auto">
            {options.map(opt => (
              <label key={String(opt)} className="flex items-center px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={localSelected.includes(opt)}
                  onChange={e => {
                    if (e.target.checked) setLocalSelected([...localSelected, opt]);
                    else setLocalSelected(localSelected.filter((v) => v !== opt));
                  }}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-2 mt-2">
            <button type="button" className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={handleClear}>Clear</button>
            <button type="button" className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" onClick={handleApply}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown; 