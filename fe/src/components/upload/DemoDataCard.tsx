import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from 'flowbite-react';
import { pythonApiFetch } from '../../utils/pythonApiClient';

interface Task {
  status: string;
  error?: string;
}

/** Imports a generated 30-day log for a fictional site so the app can be explored without real logs */
export const DemoDataCard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const task = useQuery<Task>({
    queryKey: ['demoTask', taskId],
    queryFn: () => pythonApiFetch<Task>(`/task/${taskId}`),
    enabled: !!taskId,
    retry: true,
    refetchInterval: (q) => (q.state.data?.status === 'complete' || q.state.data?.status === 'error' ? false : 1000),
  });

  useEffect(() => {
    if (!taskId || !task.data) return;
    if (task.data.status === 'complete') {
      document.cookie = `selected_log_file=${taskId}; max-age=${7 * 24 * 60 * 60}; path=/`;
      // Wait for the log file list to refresh first; otherwise the "no log files" guard
      // still sees the old, empty list and sends the user back to this page.
      queryClient.invalidateQueries().then(() => navigate('/dashboard'));
    } else if (task.data.status === 'error') {
      setError(task.data.error || 'Demo import failed');
      setTaskId(null);
    }
  }, [task.data, taskId, navigate, queryClient]);

  const start = async () => {
    setError(null);
    try {
      const result = await pythonApiFetch<{ log_file_id: string }>('/demo', { method: 'POST' });
      setTaskId(result.log_file_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the demo import');
    }
  };

  return (
    <Card className="mt-6 dark:bg-gray-800">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">No logs at hand?</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Load 30 days of generated traffic for a fictional site: AI crawlers from OpenAI, Anthropic, Google, Perplexity and
        others, a few bots faking their user agents, and visitors arriving from AI assistants.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={!!taskId}
          className="px-4 py-2 rounded-md text-sm font-medium border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-60"
        >
          {taskId ? 'Loading demo data…' : 'Load demo data'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </Card>
  );
};

export default DemoDataCard;
