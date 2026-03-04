import { useEffect, useState } from 'react';
import api from '../utils/api';
import Card from '../components/Card';
import Badge from '../components/Badge';

export default function Inventory() {
  const [groups, setGroups] = useState([]);
  const [vars, setVars] = useState({});
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState('inventory.ini');

  useEffect(() => {
    api.get('/inventory/files').then((r) => setFiles(r.data));
    api.get('/inventory/vars').then((r) => setVars(r.data));
  }, []);

  useEffect(() => {
    api
      .get('/inventory/parse', { params: { file: activeFile } })
      .then((r) => setGroups(r.data));
  }, [activeFile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-100">Inventory</h2>
        <div className="flex items-center gap-2">
          {files.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFile(f)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                f === activeFile
                  ? 'bg-accent/15 text-accent'
                  : 'text-gray-500 hover:text-gray-300 bg-surface-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Hosts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((g) => (
          <Card key={g.name} title={`[${g.name}]`}>
            <div className="space-y-2">
              {g.hosts.map((h) => (
                <div
                  key={h.name}
                  className="flex items-center justify-between py-2 border-b border-surface-300 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-mono text-gray-200">
                      {h.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-500">
                      {h.ansible_host}
                    </span>
                    <Badge status="info" label={h.ansible_user} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Editable variables */}
      <Card title="Editable Variables (group_vars/all.yml)">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(vars).map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg bg-surface-200 border border-surface-300 px-3 py-2"
            >
              <p className="text-[11px] text-gray-500 font-mono mb-0.5">
                {key}
              </p>
              <p className="text-sm text-gray-300 font-mono truncate">
                {String(value)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
