import React from 'react';
import { useLogFileData, DataComponentWrapper, getLogFileSuffix } from '../../shared/analytics-utils';
import { SortableTable, SortableColumn } from '../geoinsight/shared/SortableTable';
import { CATEGORY_DESCRIPTIONS, categoryLabel } from '../../utils/crawlerCategories';

interface CrawlerRow {
  crawler_name: string;
  operator: string | null;
  category: string | null;
  docs_url: string | null;
  description: string | null;
  requests: number;
  verified: number;
  suspicious: number;
  unverifiable: number;
  unchecked: number;
}

const QUERY = `
  SELECT
    a.crawler_name,
    ci.operator,
    ci.category,
    ci.docs_url,
    ci.description,
    COUNT(*) AS requests,
    SUM(a.verification = 'verified') AS verified,
    SUM(a.verification = 'suspicious') AS suspicious,
    SUM(a.verification = 'unknown') AS unverifiable,
    SUM(a.verification IS NULL) AS unchecked
  FROM access_logs a
  LEFT JOIN crawler_info ci ON ci.crawler_name = a.crawler_name
  WHERE a.crawler_name IS NOT NULL {LOG_FILE_CONDITION}
  GROUP BY a.crawler_name
  ORDER BY requests DESC
`;

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Stacked bar showing how much of a crawler's traffic is verified, suspicious, etc. */
const VerificationBar: React.FC<{ row: CrawlerRow }> = ({ row }) => {
  const segments = [
    { value: row.verified, className: 'bg-green-500', label: 'verified' },
    { value: row.suspicious, className: 'bg-red-500', label: 'suspicious' },
    { value: row.unverifiable, className: 'bg-gray-400', label: 'unverifiable' },
    { value: row.unchecked, className: 'bg-yellow-400', label: 'not checked' },
  ];
  const title = segments
    .filter((s) => s.value > 0)
    .map((s) => `${s.value.toLocaleString()} ${s.label}`)
    .join(', ');
  return (
    <div className="flex flex-col gap-1 min-w-[112px]" title={title}>
      <div className="flex h-2.5 w-28 overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
        {segments.map((s) =>
          s.value > 0 ? <div key={s.label} className={s.className} style={{ width: `${pct(s.value, row.requests)}%` }} /> : null
        )}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {row.suspicious > 0 ? (
          <span className="text-red-600 dark:text-red-400 font-medium">{row.suspicious.toLocaleString()} suspicious</span>
        ) : row.verified > 0 ? (
          `${pct(row.verified, row.requests)}% verified`
        ) : row.unchecked === row.requests ? (
          'not checked'
        ) : (
          'unverifiable'
        )}
      </span>
    </div>
  );
};

const CrawlerVerificationTableComponent: React.FC = () => {
  const { data, logFileId } = useLogFileData<CrawlerRow[]>(QUERY, []);
  const rows = Array.isArray(data) ? data : [];

  const columns: SortableColumn<CrawlerRow>[] = [
    {
      key: 'crawler_name',
      label: 'Crawler',
      render: (row) => (
        <div>
          <div className="font-medium">
            {row.docs_url ? (
              <a href={row.docs_url} target="_blank" rel="noreferrer" className="hover:underline">
                {row.crawler_name}
              </a>
            ) : (
              row.crawler_name
            )}
          </div>
          {row.description && <div className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">{row.description}</div>}
        </div>
      ),
    },
    { key: 'operator', label: 'Operator', render: (row) => row.operator || '—' },
    {
      key: 'category',
      label: 'Purpose',
      render: (row) => (
        <span
          className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 whitespace-nowrap"
          title={CATEGORY_DESCRIPTIONS[row.category || 'uncategorized']}
        >
          {categoryLabel(row.category)}
        </span>
      ),
    },
    {
      key: 'requests',
      label: 'Requests',
      align: 'right',
      render: (row) => <span className="font-mono">{Number(row.requests).toLocaleString()}</span>,
    },
    { key: 'suspicious', label: 'Verification', render: (row) => <VerificationBar row={row} /> },
  ];

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          Crawler Directory & Verification
          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">{getLogFileSuffix(logFileId)}</span>
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Who runs each crawler, why it visits, and whether its requests came from the operator's own IP addresses.
          Suspicious requests usually mean someone is faking the user agent.
        </p>
      </div>
      <div className="max-h-[600px] overflow-auto">
        <SortableTable
          data={rows}
          columns={columns}
          initialSortColumn="requests"
          initialSortDirection="desc"
          emptyMessage="No crawler data available"
        />
      </div>
    </div>
  );
};

export const CrawlerVerificationTable: React.FC = () => (
  <DataComponentWrapper>
    <CrawlerVerificationTableComponent />
  </DataComponentWrapper>
);

export default CrawlerVerificationTable;
