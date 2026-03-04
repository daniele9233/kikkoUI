export default function Card({ title, children, className = '', actions }) {
  return (
    <div
      className={`rounded-xl border border-surface-300 bg-surface-100 overflow-hidden ${className}`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-300">
          {title && (
            <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
