import React, { memo, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from 'flowbite-react';
import { pythonApiFetch } from '../utils/pythonApiClient';
import { getCookie } from '../utils/cookies';
import { SELECTED_LOG_FILE_COOKIE, useLogFileData, DataComponentWrapper } from '../shared/analytics-utils';
import { SortableTable, SortableColumn } from '../components/geoinsight/shared/SortableTable';
import { CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, categoryLabel } from '../utils/crawlerCategories';

interface SavedRobots {
  content: string | null;
  source_url: string | null;
  updated_at: string | null;
}

interface AuditCrawler {
  crawler_name: string;
  operator: string | null;
  category: string | null;
  bound_by_robots: boolean;
  robots_group: string | null;
  requests: number;
  blocked_requests: number;
  blocked_verified: number;
  blocked_suspicious: number;
  blocked_unknown: number;
  robots_txt_requests: number;
  violation: boolean;
  top_blocked_paths: { path: string; requests: number }[];
}

interface AuditResult {
  crawlers: AuditCrawler[];
  summary: {
    crawlers: number;
    requests: number;
    blocked_requests: number;
    violating_crawlers: number;
    verified_violations: number;
    spoofed_blocked: number;
  };
}

const button =
  'px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60';
const secondaryButton =
  'px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60';

/** Load, fetch or paste robots.txt */
const RobotsSource: React.FC = () => {
  const queryClient = useQueryClient();
  const saved = useQuery<SavedRobots>({ queryKey: ['robots'], queryFn: () => pythonApiFetch<SavedRobots>('/robots') });
  const [site, setSite] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (saved.data?.content != null) setText(saved.data.content);
  }, [saved.data?.content]);

  const onSaved = (data: SavedRobots, note: string) => {
    queryClient.setQueryData(['robots'], data);
    queryClient.invalidateQueries({ queryKey: ['robotsAudit'] });
    setMessage({ ok: true, text: note });
  };
  const onError = (e: Error) => setMessage({ ok: false, text: e.message });

  const fetchMutation = useMutation({
    mutationFn: () => pythonApiFetch<SavedRobots>('/robots/fetch', { method: 'POST', body: JSON.stringify({ site }) }),
    onSuccess: (data) => onSaved(data, `Downloaded ${data.source_url}`),
    onError,
  });
  const saveMutation = useMutation({
    mutationFn: () => pythonApiFetch<SavedRobots>('/robots', { method: 'PUT', body: JSON.stringify({ content: text }) }),
    onSuccess: (data) => onSaved(data, 'Saved'),
    onError,
  });

  return (
    <Card className="mb-6 dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Your robots.txt</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
        Download it from your site or paste it below. Requests are checked against this version, so if it changed
        recently, older requests may have followed the rules that applied at the time.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          fetchMutation.mutate();
        }}
      >
        <input
          type="text"
          value={site}
          onChange={(e) => setSite(e.target.value)}
          placeholder="example.com"
          aria-label="Website address"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm"
        />
        <button type="submit" className={button} disabled={!site.trim() || fetchMutation.isPending}>
          {fetchMutation.isPending ? 'Downloading…' : 'Download robots.txt'}
        </button>
      </form>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        spellCheck={false}
        aria-label="robots.txt contents"
        placeholder={'User-agent: GPTBot\nDisallow: /'}
        className="w-full font-mono text-xs rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-900 p-3"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={secondaryButton} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          Save and check
        </button>
        {saved.data?.updated_at && (
          <span className="text-xs text-gray-500">
            Last updated {new Date(saved.data.updated_at).toLocaleString()}
            {saved.data.source_url ? ` from ${saved.data.source_url}` : ''}
          </span>
        )}
        {message && (
          <span className={`text-sm ${message.ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {message.text}
          </span>
        )}
      </div>
    </Card>
  );
};

const Verdict: React.FC<{ row: AuditCrawler }> = ({ row }) => {
  let label = 'Follows robots.txt';
  let style = 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300';
  let title = 'No requests to pages your robots.txt blocks for this crawler.';
  if (row.blocked_requests > 0 && !row.bound_by_robots) {
    label = 'User-triggered';
    style = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    title = 'Fetched blocked pages because a person asked an assistant to. Several operators say robots.txt does not apply to these fetchers.';
  } else if (row.violation) {
    label = 'Ignored robots.txt';
    style = 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300';
    title = "Verified requests from the operator's own IPs fetched pages your robots.txt blocks.";
  } else if (row.blocked_requests > 0 && row.blocked_verified === 0 && row.blocked_suspicious > 0) {
    label = 'Only fake bots';
    style = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300';
    title = 'Blocked pages were only fetched by bots faking this user agent.';
  } else if (row.blocked_requests > 0) {
    label = 'Unverified';
    style = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300';
    title = "Blocked pages were fetched, but these requests couldn't be verified as coming from the operator.";
  }
  return (
    <span title={title} className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${style}`}>
      {label}
    </span>
  );
};

const AuditResults: React.FC = () => {
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  const audit = useQuery<AuditResult>({
    queryKey: ['robotsAudit', logFileId],
    queryFn: () =>
      pythonApiFetch<AuditResult>(`/robots/audit${logFileId ? `?log_file_id=${encodeURIComponent(logFileId)}` : ''}`),
    retry: false,
  });

  if (audit.isLoading) return <Card className="mb-6 dark:bg-gray-800">Checking requests…</Card>;
  if (audit.isError || !audit.data) {
    return (
      <Card className="mb-6 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">Add your robots.txt above to see which crawlers follow it.</p>
      </Card>
    );
  }

  const { summary, crawlers } = audit.data;
  const columns: SortableColumn<AuditCrawler>[] = [
    {
      key: 'crawler_name',
      label: 'Crawler',
      render: (r) => (
        <div>
          <div className="font-medium">{r.crawler_name}</div>
          <div className="text-xs text-gray-500">{[r.operator, categoryLabel(r.category)].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    {
      key: 'robots_group',
      label: 'Rules used',
      render: (r) => (
        <span className="font-mono text-xs">
          {r.robots_group === '*' ? 'User-agent: *' : r.robots_group ? `User-agent: ${r.crawler_name}` : 'none'}
        </span>
      ),
    },
    { key: 'requests', label: 'Requests', align: 'right', render: (r) => r.requests.toLocaleString() },
    {
      key: 'blocked_requests',
      label: 'To blocked pages',
      align: 'right',
      render: (r) => (
        <span className={r.blocked_requests ? 'font-semibold' : 'text-gray-400'}>{r.blocked_requests.toLocaleString()}</span>
      ),
    },
    { key: 'violation', label: 'Verdict', render: (r) => <Verdict row={r} /> },
    {
      key: 'top_blocked_paths',
      label: 'Blocked pages fetched',
      render: (r) =>
        r.top_blocked_paths.length ? (
          <ul className="font-mono text-xs space-y-0.5">
            {r.top_blocked_paths.slice(0, 3).map((p) => (
              <li key={p.path}>
                {p.path} <span className="text-gray-500">×{p.requests}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="dark:bg-gray-800 border-l-4 border-red-500">
          <p className="text-sm uppercase tracking-wider text-gray-600 dark:text-gray-300 font-medium">🚫 Crawlers ignoring robots.txt</p>
          <p className="text-2xl font-bold">{summary.violating_crawlers}</p>
          <p className="text-sm text-gray-500">{summary.verified_violations.toLocaleString()} verified requests to blocked pages</p>
        </Card>
        <Card className="dark:bg-gray-800 border-l-4 border-yellow-500">
          <p className="text-sm uppercase tracking-wider text-gray-600 dark:text-gray-300 font-medium">🎭 Blocked pages hit by fake bots</p>
          <p className="text-2xl font-bold">{summary.spoofed_blocked.toLocaleString()}</p>
          <p className="text-sm text-gray-500">robots.txt can't stop these; block them at the server</p>
        </Card>
        <Card className="dark:bg-gray-800 border-l-4 border-blue-500">
          <p className="text-sm uppercase tracking-wider text-gray-600 dark:text-gray-300 font-medium">📋 Requests checked</p>
          <p className="text-2xl font-bold">{summary.requests.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{summary.blocked_requests.toLocaleString()} went to pages robots.txt blocks</p>
        </Card>
      </div>
      <Card className="mb-6 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Compliance by crawler</h2>
        <div className="max-h-[600px] overflow-auto">
          <SortableTable data={crawlers} columns={columns} initialSortColumn="blocked_requests" emptyMessage="No crawler requests" />
        </div>
      </Card>
    </>
  );
};

interface ReaderRow {
  crawler_name: string;
  robots_txt: number;
  llms_txt: number;
  last_seen: string;
}

const READERS_QUERY = `
  SELECT
    crawler_name,
    SUM(CASE WHEN path = '/robots.txt' OR path LIKE '/robots.txt?%' THEN 1 ELSE 0 END) AS robots_txt,
    SUM(CASE WHEN path LIKE '/llms%.txt' OR path LIKE '/llms%.txt?%' THEN 1 ELSE 0 END) AS llms_txt,
    MAX(time) AS last_seen
  FROM access_logs
  WHERE (path LIKE '/robots.txt%' OR path LIKE '/llms%.txt%') {LOG_FILE_CONDITION}
  GROUP BY crawler_name
  ORDER BY llms_txt DESC, robots_txt DESC
`;

const Readers: React.FC = () => {
  const { data } = useLogFileData<ReaderRow[]>(READERS_QUERY, []);
  const rows = Array.isArray(data) ? data : [];
  const columns: SortableColumn<ReaderRow>[] = [
    { key: 'crawler_name', label: 'Crawler', render: (r) => <span className="font-medium">{r.crawler_name}</span> },
    { key: 'robots_txt', label: 'robots.txt', align: 'right', render: (r) => r.robots_txt.toLocaleString() },
    { key: 'llms_txt', label: 'llms.txt', align: 'right', render: (r) => r.llms_txt.toLocaleString() },
    { key: 'last_seen', label: 'Last read', render: (r) => <span className="text-sm">{new Date(r.last_seen).toLocaleDateString()}</span> },
  ];
  return (
    <Card className="dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Who reads robots.txt and llms.txt</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">
        llms.txt is a proposed file that points AI tools to your most useful content. This shows whether any crawler actually fetches it.
      </p>
      <SortableTable data={rows} columns={columns} initialSortColumn="llms_txt" emptyMessage="No crawler has requested robots.txt or llms.txt" />
    </Card>
  );
};

const Generator: React.FC = () => {
  const [block, setBlock] = useState<string[]>(['training']);
  const [copied, setCopied] = useState<string | null>(null);
  const generate = useMutation({
    mutationFn: () =>
      pythonApiFetch<{ robots_txt: string; nginx: string }>('/robots/generate', {
        method: 'POST',
        body: JSON.stringify({ block }),
      }),
  });

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <Card className="dark:bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Generate rules</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2">Choose which kinds of crawlers to block.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(CATEGORY_LABELS)
          .filter(([key]) => key !== 'uncategorized')
          .map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={block.includes(key)}
                onChange={(e) => setBlock((b) => (e.target.checked ? [...b, key] : b.filter((k) => k !== key)))}
              />
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-gray-500">{CATEGORY_DESCRIPTIONS[key]}</span>
              </span>
            </label>
          ))}
      </div>
      <div>
        <button type="button" className={button} onClick={() => generate.mutate()} disabled={!block.length || generate.isPending}>
          Generate
        </button>
      </div>
      {generate.data && (
        <div className="space-y-3">
          {(['robots_txt', 'nginx'] as const).map((key) =>
            generate.data[key] ? (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{key === 'robots_txt' ? 'Add to robots.txt' : 'nginx rule (also stops crawlers that ignore robots.txt)'}</span>
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => copy(key, generate.data![key])}>
                    {copied === key ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 overflow-auto max-h-64">
                  {generate.data[key]}
                </pre>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Card>
  );
};

const RobotsAudit: React.FC = memo(() => (
  <div>
    <title>Crawlytics Robots.txt Audit</title>
    <h1 className="text-3xl font-bold mb-2">Robots.txt Audit</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-6">
      See which crawlers fetch pages your robots.txt blocks, which of them are genuine, and generate rules by crawler purpose.
    </p>
    <RobotsSource />
    <AuditResults />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
      <DataComponentWrapper>
        <Readers />
      </DataComponentWrapper>
      <Generator />
    </div>
  </div>
));

RobotsAudit.displayName = 'RobotsAudit';

export default RobotsAudit;
