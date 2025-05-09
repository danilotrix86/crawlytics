import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  value, 
  onChange, 
  suggestions, 
  placeholder 
}) => {
  const [show, setShow] = useState(false);
  const [input, setInput] = useState(value || '');
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  useEffect(() => { 
    setInput(value || ''); 
  }, [value]);
  
  const filtered = suggestions
    .filter(s => s && s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 8);
    
  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        placeholder={placeholder}
        value={input}
        onChange={e => { setInput(e.target.value); onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        autoComplete="off"
      />
      {show && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-auto">
          {filtered.map(s => (
            <div 
              key={s} 
              className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" 
              onClick={() => { onChange(s); setInput(s); setShow(false); }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput; 