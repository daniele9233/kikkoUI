import { useEffect, useRef } from 'react';

export default function LogViewer({ log, loading }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [log]);

  return (
    <div className="relative">
      <pre
        ref={ref}
        className="bg-surface rounded-lg border border-surface-300 p-4 text-xs font-mono text-gray-300 overflow-auto max-h-[500px] whitespace-pre-wrap"
      >
        {log || (loading ? 'Waiting for output...' : 'No log output yet.')}
      </pre>
    </div>
  );
}
