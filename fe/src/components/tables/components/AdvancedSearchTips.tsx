import React from 'react';

const AdvancedSearchTips: React.FC = () => {
  return (
    <div className="mt-2 p-3 rounded bg-blue-50 dark:bg-blue-900 text-xs text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800">
      <div className="font-semibold mb-1">Advanced Search Syntax:</div>
      <ul className="list-disc pl-5 space-y-1">
        <li><b>AND</b>, <b>OR</b> for combining conditions</li>
        <li><b>status=404 OR 500</b> (multiple status codes)</li>
        <li><b>method=GET OR POST</b> (multiple HTTP methods)</li>
        <li><b>path contains /api OR path=/home OR path contains /blog</b> (multiple paths)</li>
        <li><b>crawler=Googlebot OR crawler contains bot</b> (multiple crawlers)</li>
        <li><b>date=YYYY-MM-DD</b> or <b>date=YYYY-MM-DD:YYYY-MM-DD</b> (range)</li>
        <li>Example: <span className="font-mono">status=404 OR 500 AND path contains /api OR path=/home AND method=POST</span></li>
      </ul>
    </div>
  );
};

export default AdvancedSearchTips; 