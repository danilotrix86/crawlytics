import React, { useState, useMemo } from 'react';
import { useSqlQuery } from '../../../hooks/queries/sqlQueries';
import { useLogFileSelection } from '../../../hooks/useLogFiles/useLogFileSelection';

const GROUP_FIELDS = [
  { label: 'Crawler', value: 'crawler_name' },
  { label: 'Path', value: 'path' },
  { label: 'Status', value: 'status' },
  { label: 'Method', value: 'method' },
];

const FILTER_FIELDS = GROUP_FIELDS;

const GroupByAnalytics: React.FC = () => {
  const { selectedLogId: logFileId } = useLogFileSelection();
  const [groupBy, setGroupBy] = useState('crawler_name');
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [runQuery, setRunQuery] = useState(false);

  // Build SQL query for group by analytics
  const { query, params } = useMemo(() => {
    if (!logFileId || !groupBy) return { query: '', params: [] };
    let q = `SELECT ${groupBy}, COUNT(*) as hits FROM access_logs WHERE log_file_id = ?`;
    const p: any[] = [logFileId];
    if (filterField && filterValue) {
      q += ` AND ${filterField} = ?`;
      p.push(filterValue);
    }
    q += ` GROUP BY ${groupBy} ORDER BY hits DESC LIMIT 100`;
    return { query: q, params: p };
  }, [logFileId, groupBy, filterField, filterValue, runQuery]);

  // Fetch grouped data
  const { data, isLoading, isError } = useSqlQuery<any[]>(query, params, 100);

  // Get unique filter values for the selected filter field
  const filterOptions = useMemo(() => {
    if (!filterField || !logFileId) return [];
    // Simple query to get unique values for the filter field
    return [];
  }, [filterField, logFileId]);

  return (
    <div className="rounded-lg border border-dashed border-green-400 bg-green-50 dark:bg-green-900 p-6">
      <div className="mb-4 flex flex-col md:flex-row md:items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Group By</label>
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
          >
            {GROUP_FIELDS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Optional Filter</label>
          <select
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
            value={filterField}
            onChange={e => { setFilterField(e.target.value); setFilterValue(''); }}
          >
            <option value="">None</option>
            {FILTER_FIELDS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        {filterField && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Filter Value</label>
            <input
              type="text"
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white text-sm"
              value={filterValue}
              onChange={e => setFilterValue(e.target.value)}
              placeholder={`Enter ${filterField}`}
            />
          </div>
        )}
        <button
          className="px-4 py-2 rounded-xl shadow-sm bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600 dark:focus:ring-green-300"
          onClick={() => setRunQuery(q => !q)}
        >
          Run
        </button>
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Error loading analytics data.</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No results found for this grouping.</div>
        ) : (
          <table className="w-full text-sm text-left text-gray-700 dark:text-gray-200">
            <thead>
              <tr>
                <th className="py-2 px-4 bg-green-100 dark:bg-green-800">{GROUP_FIELDS.find(f => f.value === groupBy)?.label}</th>
                <th className="py-2 px-4 bg-green-100 dark:bg-green-800">Hits</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-green-200 dark:border-green-800">
                  <td className="py-2 px-4 font-mono truncate max-w-xs" title={row[groupBy] || '(empty)'}>{row[groupBy] || <span className="text-gray-400">(empty)</span>}</td>
                  <td className="py-2 px-4 font-semibold">{row.hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GroupByAnalytics; 