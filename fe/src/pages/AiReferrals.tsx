import React, { memo, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { Card } from 'flowbite-react';
import { useLogFileData, DataComponentWrapper, getLogFileSuffix, SELECTED_LOG_FILE_COOKIE } from '../shared/analytics-utils';
import { getCookie } from '../utils/cookies';
import { SortableTable, SortableColumn } from '../components/geoinsight/shared/SortableTable';
import { CHART_COLOR_PALETTE } from '../theme/chartTheme';
import { formatPercent } from '../utils/format';

interface Totals {
  referrals: number;
  parsed_lines: number | null;
  crawler_requests: number;
}

interface AssistantRow {
  assistant: string;
  operator: string;
  visits: number;
  crawls: number;
  ratio?: number;
}

interface DailyRow {
  day: string;
  assistant: string;
  visits: number;
}

interface PageRow {
  page: string;
  visits: number;
  assistants: string;
}

const TOTALS_QUERY = `
  SELECT
    (SELECT COUNT(*) FROM ai_referrals WHERE 1=1 {LOG_FILE_CONDITION}) AS referrals,
    (SELECT SUM(parsed_lines) FROM log_files {TOTAL_CONDITION}) AS parsed_lines,
    (SELECT COUNT(*) FROM access_logs {CRAWLER_CONDITION}) AS crawler_requests
`;

const ASSISTANTS_QUERY = `
  WITH refs AS (
    SELECT assistant, operator, COUNT(*) AS visits
    FROM ai_referrals WHERE 1=1 {LOG_FILE_CONDITION}
    GROUP BY assistant, operator
  ),
  crawls AS (
    SELECT ci.operator, COUNT(*) AS crawls
    FROM (SELECT crawler_name FROM access_logs {TOTAL_CONDITION}) a
    JOIN crawler_info ci ON ci.crawler_name = a.crawler_name
    WHERE ci.category IN ('training', 'ai_search', 'user_action')
    GROUP BY ci.operator
  )
  SELECT refs.assistant, refs.operator, refs.visits, COALESCE(crawls.crawls, 0) AS crawls
  FROM refs LEFT JOIN crawls ON crawls.operator = refs.operator
  ORDER BY refs.visits DESC
`;

const DAILY_QUERY = `
  SELECT substr(time, 1, 10) AS day, assistant, COUNT(*) AS visits
  FROM ai_referrals WHERE 1=1 {LOG_FILE_CONDITION}
  GROUP BY day, assistant
  ORDER BY day
`;

const PAGES_QUERY = `
  SELECT
    CASE WHEN instr(path, '?') > 0 THEN substr(path, 1, instr(path, '?') - 1) ELSE path END AS page,
    COUNT(*) AS visits,
    GROUP_CONCAT(DISTINCT assistant) AS assistants
  FROM ai_referrals WHERE 1=1 {LOG_FILE_CONDITION}
  GROUP BY page
  ORDER BY visits DESC
  LIMIT 15
`;

const StatCard: React.FC<{ title: string; value: string; note: string }> = ({ title, value, note }) => (
  <Card className="min-h-32 dark:bg-gray-800 border-l-4 border-emerald-500">
    <p className="text-gray-600 dark:text-gray-300 font-medium text-sm uppercase tracking-wider">{title}</p>
    <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    <p className="text-gray-500 dark:text-gray-400 text-sm">{note}</p>
  </Card>
);

const Summary: React.FC = () => {
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  // useLogFileData fills two placeholders; the crawler subquery's parameter is passed explicitly.
  // All three parameters are the same log file id, so their order doesn't matter.
  const query = TOTALS_QUERY.replace('{CRAWLER_CONDITION}', logFileId ? 'WHERE log_file_id = ?' : '');
  const { data } = useLogFileData<Totals[], Totals | undefined>(
    query,
    logFileId ? [logFileId] : [],
    (rows) => rows?.[0],
  );
  const { data: assistants } = useLogFileData<AssistantRow[]>(ASSISTANTS_QUERY, []);

  const referrals = data?.referrals ?? 0;
  const humans = data?.parsed_lines != null ? data.parsed_lines - (data.crawler_requests ?? 0) : null;
  const top = Array.isArray(assistants) && assistants.length ? assistants[0] : null;
  const aiCrawls = (Array.isArray(assistants) ? assistants : []).reduce((sum, row) => sum + row.crawls, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <StatCard
        title="💬 Visits from AI assistants"
        value={referrals.toLocaleString()}
        note="People who clicked a link in ChatGPT, Perplexity, Gemini and others"
      />
      <StatCard
        title="📈 Share of human visits"
        value={humans !== null ? formatPercent(referrals, humans) : '—'}
        note={humans !== null ? `of ${humans.toLocaleString()} non-crawler requests` : 'Re-import logs to measure this'}
      />
      <StatCard
        title="🏆 Top assistant"
        value={top ? top.assistant : '—'}
        note={top ? `${top.visits.toLocaleString()} visits · ${aiCrawls.toLocaleString()} AI crawler requests overall` : 'No AI referrals yet'}
      />
    </div>
  );
};

const DailyChart: React.FC = () => {
  const { data, logFileId } = useLogFileData<DailyRow[]>(DAILY_QUERY, []);
  const rows = Array.isArray(data) ? data : [];

  const { series, options } = useMemo(() => {
    const days = Array.from(new Set(rows.map((r) => r.day))).sort();
    const assistants = Array.from(new Set(rows.map((r) => r.assistant)));
    const lookup = new Map(rows.map((r) => [`${r.day}|${r.assistant}`, r.visits]));
    const series = assistants.map((a) => ({
      name: a,
      data: days.map((d) => ({ x: new Date(d).getTime(), y: lookup.get(`${d}|${a}`) ?? 0 })),
    }));
    const options: ApexOptions = {
      chart: { type: 'bar', stacked: true, height: 320, toolbar: { show: false }, foreColor: '#9ca3af' },
      colors: CHART_COLOR_PALETTE,
      xaxis: { type: 'datetime' },
      yaxis: { title: { text: 'Visits' } },
      dataLabels: { enabled: false },
      legend: { position: 'top' },
      plotOptions: { bar: { columnWidth: '70%' } },
      tooltip: { x: { format: 'dd MMM yyyy' } },
    };
    return { series, options };
  }, [rows]);

  return (
    <Card className="mb-6 dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        Daily visits by assistant <span className="text-sm font-normal text-gray-500">{getLogFileSuffix(logFileId)}</span>
      </h2>
      {rows.length ? (
        <ReactApexChart type="bar" height={320} series={series} options={options} />
      ) : (
        <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No AI referral visits found in this log.</p>
      )}
    </Card>
  );
};

const AssistantsTable: React.FC = () => {
  const { data } = useLogFileData<AssistantRow[]>(ASSISTANTS_QUERY, []);
  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    ...r,
    ratio: r.visits > 0 && r.crawls > 0 ? r.crawls / r.visits : 0,
  }));
  const columns: SortableColumn<AssistantRow>[] = [
    { key: 'assistant', label: 'Assistant', render: (r) => <span className="font-medium">{r.assistant}</span> },
    { key: 'operator', label: 'Operator' },
    { key: 'visits', label: 'Visits', align: 'right', render: (r) => r.visits.toLocaleString() },
    { key: 'crawls', label: 'AI crawler requests', align: 'right', render: (r) => r.crawls.toLocaleString() },
    {
      key: 'ratio',
      label: 'Crawls per visit',
      align: 'right',
      render: (r) => (r.ratio ? r.ratio.toFixed(1) : '—'),
    },
  ];
  return (
    <Card className="dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Crawling vs. visits sent back</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
        How many requests each company's AI crawlers made for every visitor its assistant sent you.
      </p>
      <SortableTable data={rows} columns={columns} initialSortColumn="visits" emptyMessage="No AI referrals yet" />
    </Card>
  );
};

const PagesTable: React.FC = () => {
  const { data } = useLogFileData<PageRow[]>(PAGES_QUERY, []);
  const rows = Array.isArray(data) ? data : [];
  const columns: SortableColumn<PageRow>[] = [
    { key: 'page', label: 'Landing page', render: (r) => <span className="font-mono text-sm">{r.page}</span> },
    { key: 'assistants', label: 'From', render: (r) => <span className="text-sm">{r.assistants?.split(',').join(', ')}</span> },
    { key: 'visits', label: 'Visits', align: 'right', render: (r) => r.visits.toLocaleString() },
  ];
  return (
    <Card className="dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Pages AI assistants send people to</h2>
      <SortableTable data={rows} columns={columns} initialSortColumn="visits" emptyMessage="No AI referrals yet" />
    </Card>
  );
};

const AiReferrals: React.FC = memo(() => (
  <div>
    <title>Crawlytics AI Referrals</title>
    <h1 className="text-3xl font-bold mb-2">AI Referrals</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-6">
      Human visitors who arrived from AI assistants, detected from the Referer header and ChatGPT's
      utm_source tag. Only the time, page and assistant are stored, never the visitor's IP address.
    </p>
    <DataComponentWrapper><Summary /></DataComponentWrapper>
    <DataComponentWrapper><DailyChart /></DataComponentWrapper>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
      <DataComponentWrapper><AssistantsTable /></DataComponentWrapper>
      <DataComponentWrapper><PagesTable /></DataComponentWrapper>
    </div>
  </div>
));

AiReferrals.displayName = 'AiReferrals';

export default AiReferrals;
