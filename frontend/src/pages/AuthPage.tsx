import React, { useState } from 'react';
import { UserCheck, Shield, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onBack: () => void;
  onLoginSuccess: (user: { username: string; role: string; token: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isLogin) {
        // Login API Call
        const res = await fetch('http://127.0.0.1:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Login failed');
        }

        onLoginSuccess({
          username: data.username,
          role: data.role,
          token: data.access_token
        });
      } else {
        // Register API Call
        const res = await fetch('http://127.0.0.1:8000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Registration failed');
        }

        setMessage('Registration successful! Please login.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark cyber-grid flex flex-col justify-center items-center p-6 text-zinc-100 relative">
      <div className="absolute inset-0 radial-glow pointer-events-none"></div>

      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-zinc-950/40 hover:bg-zinc-950/80 text-sm text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="w-full max-w-md p-8 rounded-2xl border border-white/15 bg-zinc-950/50 glass-card relative overflow-hidden">
        {/* Glow header border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-purple-600"></div>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Login to StreamFlow' : 'Create Data Account'}
          </h2>
          <p className="text-sm text-zinc-500 mt-1.5">
            {isLogin ? 'Enter your details to access the system' : 'Sign up to manage real-time workflows'}
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. engineer"
              className="w-full px-4 py-2.5 text-sm bg-zinc-900/60 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-white placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm bg-zinc-900/60 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-white placeholder-zinc-600"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">Assigned Role</label>
              <div className="grid grid-cols-3 gap-2">
                {['Admin', 'Data Engineer', 'Analyst'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      role === r
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow shadow-cyan-500/15'
                        : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 italic">
                {role === 'Admin' && 'Full permissions to pause/resume pipeline & schedule DAGs.'}
                {role === 'Data Engineer' && 'Modify simulator configuration, launch Airflow DAGs.'}
                {role === 'Analyst' && 'Read metrics, execute SQL queries in read-only mode.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-sm font-semibold text-white hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            {isLogin ? 'Authenticate Access' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setMessage('');
            }}
            className="text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            {isLogin ? "Need a workspace account? Sign up" : 'Already registered? Login'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-zinc-900/40 border border-white/5 rounded-lg text-[10px] font-mono text-zinc-500 text-left">
          <div className="font-bold text-zinc-400 mb-1 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-cyan-500" /> DEFAULT PORTFOLIO CREDENTIALS
          </div>
          <div>• Admin: admin / admin123</div>
          <div>• Engineer: engineer / engineer123</div>
          <div>• Analyst: analyst / analyst123</div>
        </div>
      </div>
    </div>
  );
};
