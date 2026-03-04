import { useEffect, useState } from 'react';
import api from '../utils/api';
import Card from '../components/Card';
import Badge from '../components/Badge';

export default function Dashboard() {
  const [matrix, setMatrix] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    api.get('/compatibility/matrix').then((r) => setMatrix(r.data));
    api.get('/inventory/parse').then((r) => setInventory(r.data));
    api.get('/history/runs').then((r) => setRuns(r.data));
  }, []);

  const totalHosts = inventory.reduce(
    (acc, g) => acc + (g.hosts?.length || 0),
    0,
  );

  const recentRuns = (runs || []).slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100">Cluster Overview</h2>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Hosts"
          value={totalHosts}
          accent="text-cyan-400"
        />
        <StatCard
          label="Host Groups"
          value={inventory.length}
          accent="text-violet-400"
        />
        <StatCard
          label="Rancher Versions"
          value={matrix?.rancher_versions?.length ?? '-'}
          accent="text-emerald-400"
        />
        <StatCard
          label="Executions"
          value={runs.length}
          accent="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory summary */}
        <Card title="Inventory">
          {inventory.length === 0 ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-3">
              {inventory.map((g) => (
                <div key={g.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-accent">
                      [{g.name}]
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {g.hosts.length} host{g.hosts.length !== 1 && 's'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {g.hosts.map((h) => (
                      <div
                        key={h.name}
                        className="flex items-center gap-2 text-xs text-gray-400 pl-3"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                        <span className="font-mono">{h.name}</span>
                        <span className="text-gray-600">{h.ansible_host}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent runs */}
        <Card title="Recent Executions">
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-500">No executions yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((r) => (
                <div
                  key={r.run_id}
                  className="flex items-center justify-between py-2 border-b border-surface-300 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-400">
                      {r.run_id}
                    </span>
                    <Badge status={r.status} />
                  </div>
                  <span className="text-[11px] text-gray-600">
                    {r.started_at
                      ? new Date(r.started_at).toLocaleString()
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Compatibility quick info */}
      {matrix && (
        <Card title="Supported Components">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Ingress Controllers</p>
              <div className="flex flex-wrap gap-1.5">
                {matrix.ingress_controllers.map((i) => (
                  <Badge key={i.name} status="info" label={i.label} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">CNI Plugins</p>
              <div className="flex flex-wrap gap-1.5">
                {matrix.cni_plugins.map((c) => (
                  <Badge key={c.name} status="info" label={c.label} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Rancher Versions ({matrix.rancher_versions.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matrix.rancher_versions.slice(0, 6).map((v) => (
                  <Badge
                    key={v.version}
                    status={v.eol ? 'warning' : 'success'}
                    label={v.version}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-surface-300 bg-surface-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
