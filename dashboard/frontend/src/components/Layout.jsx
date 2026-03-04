import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/deploy', label: 'Deploy' },
  { to: '/history', label: 'History' },
  { to: '/inventory', label: 'Inventory' },
];

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent/15 text-accent'
            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-300'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-surface-300 bg-surface/80 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold tracking-tight text-accent">
              KikkoUI
            </span>
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <NavItem key={l.to} {...l} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              {user?.display_name}{' '}
              <span className="inline-block px-1.5 py-0.5 rounded bg-surface-300 text-[10px] uppercase tracking-wider">
                {user?.role}
              </span>
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 py-2 border-b border-surface-300 bg-surface-50 overflow-x-auto">
        {links.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6">
        {children}
      </main>
    </div>
  );
}
