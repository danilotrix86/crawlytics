import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pythonApiFetch } from '../../utils/pythonApiClient';
import { getCookie } from '../../utils/cookies';
import { SELECTED_LOG_FILE_COOKIE } from '../../shared/analytics-utils';

interface EnrichmentStatus {
  pending_rows: number;
  geoip: { country: boolean; asn: boolean };
  ip_range_sources: Record<string, boolean>;
}

interface EnrichTask {
  status: 'processing' | 'complete' | 'error';
  pairs_total?: number;
  pairs_done?: number;
  error?: string;
}

/**
 * Offers to verify and geolocate rows imported before enrichment existed,
 * and shows progress while it runs.
 */
export const EnrichmentBanner: React.FC = () => {
  const logFileId = getCookie(SELECTED_LOG_FILE_COOKIE);
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const statusQuery = useQuery<EnrichmentStatus>({
    queryKey: ['enrichmentStatus', logFileId],
    queryFn: () =>
      pythonApiFetch<EnrichmentStatus>(
        `/enrichment/status${logFileId ? `?log_file_id=${encodeURIComponent(logFileId)}` : ''}`
      ),
    staleTime: 30_000,
  });

  const taskQuery = useQuery<EnrichTask>({
    queryKey: ['enrichTask', taskId],
    queryFn: () => pythonApiFetch<EnrichTask>(`/task/${taskId}`),
    enabled: !!taskId,
    refetchInterval: (query) => (query.state.data?.status === 'processing' || !query.state.data ? 1000 : false),
  });

  const task = taskQuery.data;

  useEffect(() => {
    if (task?.status === 'complete') {
      setTaskId(null);
      queryClient.invalidateQueries({ queryKey: ['sql'] });
      queryClient.invalidateQueries({ queryKey: ['enrichmentStatus'] });
    }
  }, [task?.status, queryClient]);

  const start = async () => {
    setStartError(null);
    try {
      const result = await pythonApiFetch<{ task_id: string }>('/enrichment/run', {
        method: 'POST',
        body: JSON.stringify({ log_file_id: logFileId || null }),
      });
      setTaskId(result.task_id);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Could not start the check');
    }
  };

  const pending = statusQuery.data?.pending_rows ?? 0;
  const running = !!taskId && task?.status !== 'error';
  if (!running && pending === 0 && !startError && task?.status !== 'error') return null;

  const progress =
    task?.pairs_total ? Math.round(((task.pairs_done ?? 0) / task.pairs_total) * 100) : null;

  return (
    <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 text-sm text-yellow-900 dark:text-yellow-200">
        {running ? (
          <>
            <span className="font-semibold">Checking requests…</span>{' '}
            Looking up countries and networks and verifying each crawler's IP addresses
            {progress !== null && <> ({progress}%)</>}.
          </>
        ) : (
          <>
            <span className="font-semibold">{pending.toLocaleString()} requests haven't been checked yet.</span>{' '}
            They were imported before Crawlytics could verify crawlers and locate their IPs.
          </>
        )}
        {(startError || task?.status === 'error') && (
          <div className="mt-1 text-red-700 dark:text-red-300">{startError || task?.error}</div>
        )}
      </div>
      <button
        type="button"
        onClick={start}
        disabled={running}
        className="px-4 py-2 rounded-md text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-60 disabled:cursor-wait"
      >
        {running ? 'Checking…' : 'Check now'}
      </button>
    </div>
  );
};

export default EnrichmentBanner;
