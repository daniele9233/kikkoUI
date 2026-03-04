import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-accent">
            KikkoUI
          </h1>
          <p className="text-sm text-gray-500 mt-1">DevOps Dashboard</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-surface-300 bg-surface-100 p-6 space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-surface-400 bg-surface-200 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-400 bg-surface-200 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent/90 hover:bg-accent text-black font-semibold py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-[11px] text-gray-600 text-center">
            Default: admin / admin &mdash; viewer / viewer
          </p>
        </form>
      </div>
    </div>
  );
}
