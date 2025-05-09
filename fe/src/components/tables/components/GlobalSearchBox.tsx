import React from 'react';

interface GlobalSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const GlobalSearchBox: React.FC<GlobalSearchBoxProps> = ({ value, onChange, placeholder }) => {
  return (
    <div className="w-full max-w-xs">
      <input
        type="text"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        placeholder={placeholder || 'Search all columns...'}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Global search"
      />
    </div>
  );
};

export default GlobalSearchBox; 