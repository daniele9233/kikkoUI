import { useEffect, useState } from 'react';
import api from '../utils/api';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LogViewer from '../components/LogViewer';

export default function History() {
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState('');

  useEffect(() => {
    api.get('/history/runs').then((r) => setRuns(r.data));
  }, []);

  async function selectRun(run) {
    setSelected(run);
    try {
      const res = await api.get(`/ansible/log/${run.run_id}`);
      setLog(res.data);
    } catch {
      setLog('Log not available.');
    }
  }

  async function downloadLog(runId) {
    const res = await api.get(`/ansible/log/${runId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${runId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100">Execution History</h2>

      <Card title={`${runs.length} execution${runs.length !== 1 ? 's' : ''}`}>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500">No executions recorded yet.</p>
        ) : (
          <div className="divide-y divide-surface-300">
            {runs.map((r) => (
              <div
                key={r.run_id}
                onClick={() => selectRun(r)}
                className={`flex items-center justify-between py-3 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
                  selected?.run_id === r.run_id
                    ? 'bg-surface-300'
                    : 'hover:bg-surface-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 w-24 shrink-0">
                    {r.run_id}
                  </span>
                  <Badge status={r.status} />
                  <span className="text-[11px] text-gray-500">
                    {r.execution_mode}
                  </span>
                  {r.components && (
                    <span className="hidden sm:inline text-[11px] text-gray-600">
                      {r.components.cni} / {r.components.ingress}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {r.rc !== null && r.rc !== undefined && (
                    <span className="text-[11px] text-gray-600">
                      exit {r.rc}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-600">
                    {r.started_at
                      ? new Date(r.started_at).toLocaleString()
                      : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <Card
          title={`Log: ${selected.run_id}`}
          actions={
            <button
              onClick={() => downloadLog(selected.run_id)}
              className="text-[11px] text-accent hover:underline"
            >
              Download
            </button>
          }
        >
          <LogViewer log={log} />
        </Card>
      )}
    </div>
  );
}
