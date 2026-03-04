import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Select from '../components/Select';
import LogViewer from '../components/LogViewer';

const MODES = [
  { value: 'run', label: 'Normal Run' },
  { value: 'check', label: '--check (dry run)' },
  { value: 'diff', label: '--diff' },
  { value: 'check_diff', label: '--check --diff' },
];

export default function Deploy() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [matrix, setMatrix] = useState(null);
  const [inventoryFiles, setInventoryFiles] = useState([]);
  const [editableVars, setEditableVars] = useState({});

  // Selection state
  const [ingress, setIngress] = useState('');
  const [cni, setCni] = useState('');
  const [rancherVer, setRancherVer] = useState('');
  const [rke2Ver, setRke2Ver] = useState('');
  const [mode, setMode] = useState('run');
  const [invFile, setInvFile] = useState('inventory.ini');
  const [extraVars, setExtraVars] = useState({});

  // Validation
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  // Execution
  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [log, setLog] = useState('');
  const pollRef = useRef(null);

  // Load matrix + inventory on mount
  useEffect(() => {
    api.get('/compatibility/matrix').then((r) => setMatrix(r.data));
    api.get('/inventory/files').then((r) => setInventoryFiles(r.data));
    api.get('/inventory/vars').then((r) => {
      setEditableVars(r.data);
      setExtraVars(r.data);
    });
  }, []);

  // Available RKE2 versions filtered by selected Rancher version
  const rke2Options = (() => {
    if (!matrix || !rancherVer) return [];
    const entry = matrix.rancher_versions.find((v) => v.version === rancherVer);
    if (!entry) return [];
    return entry.compatible_rke2.map((v) => ({ value: v, label: v }));
  })();

  // Validate on selection change
  useEffect(() => {
    if (!ingress || !cni || !rancherVer || !rke2Ver) {
      setValidation(null);
      return;
    }
    setValidating(true);
    const t = setTimeout(() => {
      api
        .post('/compatibility/validate', {
          ingress,
          cni,
          rancher_version: rancherVer,
          rke2_version: rke2Ver,
        })
        .then((r) => setValidation(r.data))
        .catch(() => setValidation({ valid: false, errors: ['Validation request failed'], warnings: [] }))
        .finally(() => setValidating(false));
    }, 300);
    return () => clearTimeout(t);
  }, [ingress, cni, rancherVer, rke2Ver]);

  // Poll run status
  const startPolling = useCallback(
    (id) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const [statusRes, logRes] = await Promise.all([
            api.get(`/ansible/status/${id}`),
            api.get(`/ansible/log/${id}`).catch(() => ({ data: '' })),
          ]);
          setRunStatus(statusRes.data);
          setLog(logRes.data);
          if (['completed', 'failed', 'cancelled'].includes(statusRes.data.status)) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch {
          /* ignore transient errors */
        }
      }, 2000);
    },
    [],
  );

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function handleRun() {
    try {
      const { data } = await api.post('/ansible/run', {
        components: {
          ingress,
          cni,
          rancher_version: rancherVer,
          rke2_version: rke2Ver,
        },
        execution_mode: mode,
        inventory_file: invFile,
        extra_vars: extraVars,
      });
      setRunId(data.run_id);
      setRunStatus(data);
      setLog('');
      startPolling(data.run_id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.errors) {
        setValidation({ valid: false, errors: detail.errors, warnings: [] });
      }
    }
  }

  async function handleCancel() {
    if (runId) {
      await api.post(`/ansible/cancel/${runId}`);
    }
  }

  async function handleDownload() {
    if (!runId) return;
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

  const canRun =
    isAdmin &&
    ingress &&
    cni &&
    rancherVer &&
    rke2Ver &&
    validation?.valid &&
    (!runStatus || ['completed', 'failed', 'cancelled'].includes(runStatus.status));

  const isRunning = runStatus?.status === 'running' || runStatus?.status === 'queued';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100">Deploy Cluster</h2>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
          Read-only mode. Only admins can execute playbooks.
        </div>
      )}

      {/* Component Selection */}
      <Card title="Component Selection">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Ingress Controller"
            value={ingress}
            onChange={setIngress}
            options={
              matrix?.ingress_controllers?.map((i) => ({
                value: i.name,
                label: i.label,
              })) || []
            }
          />
          <Select
            label="CNI Plugin"
            value={cni}
            onChange={setCni}
            options={
              matrix?.cni_plugins?.map((c) => ({
                value: c.name,
                label: c.label,
              })) || []
            }
          />
          <Select
            label="Rancher Version"
            value={rancherVer}
            onChange={(v) => {
              setRancherVer(v);
              setRke2Ver('');
            }}
            options={
              matrix?.rancher_versions?.map((v) => ({
                value: v.version,
                label: `${v.version}${v.eol ? ' (EOL)' : ''}`,
              })) || []
            }
          />
          <Select
            label="RKE2 Version"
            value={rke2Ver}
            onChange={setRke2Ver}
            options={rke2Options}
            disabled={!rancherVer}
          />
        </div>
      </Card>

      {/* Validation result */}
      {validation && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            validation.valid
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {validation.valid ? (
            <p>All components are compatible.</p>
          ) : (
            <div className="space-y-1">
              {validation.errors.map((e, i) => (
                <p key={i}>Error: {e}</p>
              ))}
            </div>
          )}
          {validation.warnings?.length > 0 && (
            <div className="mt-2 space-y-1 text-amber-400">
              {validation.warnings.map((w, i) => (
                <p key={i}>Warning: {w}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {validating && (
        <p className="text-xs text-gray-500">Validating...</p>
      )}

      {/* Execution options */}
      <Card title="Execution Options">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Execution Mode"
            value={mode}
            onChange={setMode}
            options={MODES}
          />
          <Select
            label="Inventory File"
            value={invFile}
            onChange={setInvFile}
            options={
              inventoryFiles.map((f) => ({ value: f, label: f }))
            }
          />
          <div>
            <span className="text-xs font-medium text-gray-400 mb-1 block">
              Editable Variables
            </span>
            <button
              onClick={() => {
                const newVal = prompt(
                  'Edit extra variables (JSON):',
                  JSON.stringify(extraVars, null, 2),
                );
                if (newVal) {
                  try {
                    setExtraVars(JSON.parse(newVal));
                  } catch {
                    /* ignore bad json */
                  }
                }
              }}
              className="w-full rounded-lg border border-surface-400 bg-surface-200 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 text-left truncate"
            >
              {Object.keys(extraVars).length} variables configured
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-300">
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="rounded-lg bg-accent/90 hover:bg-accent text-black font-semibold px-6 py-2.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Run Playbook
          </button>
          {isRunning && (
            <button
              onClick={handleCancel}
              className="rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium px-4 py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </Card>

      {/* Run output */}
      {runStatus && (
        <Card
          title={`Execution: ${runId}`}
          actions={
            <div className="flex items-center gap-2">
              <Badge status={runStatus.status} />
              {runStatus.rc !== null && runStatus.rc !== undefined && (
                <span className="text-[11px] text-gray-500">
                  exit {runStatus.rc}
                </span>
              )}
              {log && (
                <button
                  onClick={handleDownload}
                  className="text-[11px] text-accent hover:underline"
                >
                  Download log
                </button>
              )}
            </div>
          }
        >
          <LogViewer log={log} loading={isRunning} />
        </Card>
      )}
    </div>
  );
}
