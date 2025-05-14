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
  
  // Filter and sort suggestions
  const allFiltered = suggestions
    .filter(s => s && s.toLowerCase().includes(input.toLowerCase()))
    .sort((a, b) => {
      // First priority: exact matches
      const aExact = a.toLowerCase() === input.toLowerCase();
      const bExact = b.toLowerCase() === input.toLowerCase();
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Second priority: starts with input
      const aStartsWith = a.toLowerCase().startsWith(input.toLowerCase());
      const bStartsWith = b.toLowerCase().startsWith(input.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Default: alphabetical order
      return a.localeCompare(b);
    });
    
  const displayItems = allFiltered.slice(0, 12);
  const hasMoreItems = allFiltered.length > 12;
  
  // Highlight the matched text
  const highlightMatch = (text: string) => {
    if (!input) return text;
    
    const index = text.toLowerCase().indexOf(input.toLowerCase());
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + input.length);
    const after = text.substring(index + input.length);
    
    return (
      <>
        {before}
        <span className="font-semibold bg-yellow-100 dark:bg-yellow-800">{match}</span>
        {after}
      </>
    );
  };
    
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
      {show && displayItems.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-auto">
          {displayItems.map(s => (
            <div 
              key={s} 
              className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" 
              onClick={() => { onChange(s); setInput(s); setShow(false); }}
            >
              {highlightMatch(s)}
            </div>
          ))}
          {hasMoreItems && (
            <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              Showing 12 of {allFiltered.length} matches
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput; 