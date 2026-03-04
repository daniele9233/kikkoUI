export default function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-400 mb-1 block">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-surface-400 bg-surface-200 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 disabled:opacity-50"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
