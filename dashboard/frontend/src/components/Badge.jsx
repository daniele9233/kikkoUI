const colors = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  running: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  queued: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  cancelled: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

export default function Badge({ status, label }) {
  const display = label || status;
  const cls = colors[status] || colors.info;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cls}`}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
      )}
      {display}
    </span>
  );
}
