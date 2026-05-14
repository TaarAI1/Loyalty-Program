'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gift, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#00071a]">
      {/* Left hero panel */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden">
        {/* Background geometry — Nayax diagonal style */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00112c] via-[#001a3e] to-[#00071a]" />
          {/* Diagonal blue stripe */}
          <div
            className="absolute -left-20 top-0 bottom-0 w-[60%]"
            style={{
              background: 'linear-gradient(160deg, #0052ff18 0%, #0052ff08 50%, transparent 100%)',
            }}
          />
          {/* Glowing orbs */}
          <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full bg-[#0052ff] opacity-10 blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-[#3d7eff] opacity-8 blur-[60px]" />
          {/* Grid lines */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#0052ff] flex items-center justify-center shadow-xl shadow-blue-900/50">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none tracking-tight">LoyaltyPro</p>
            <p className="text-[#4d7aaa] text-xs font-medium mt-0.5">Management System</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          {/* Diagonal accent bar */}
          <div className="w-12 h-1 bg-[#0052ff] rounded-full mb-6" />
          <h1 className="text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
            Grow loyalty,<br />
            <span className="text-[#0052ff]">grow revenue.</span>
          </h1>
          <p className="text-[#4d7aaa] text-base leading-relaxed max-w-sm font-medium">
            A unified platform to manage customer tiers, track points, and drive retention through smart loyalty programs.
          </p>

          {/* Stats grid — Nayax style cards */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: 'Active Members', value: '10K+', icon: '👥' },
              { label: 'Points Issued', value: '2.4M', icon: '⭐' },
              { label: 'Retention Rate', value: '68%', icon: '📈' },
            ].map((s) => (
              <div
                key={s.label}
                className="relative overflow-hidden rounded-2xl p-4 border border-white/5"
                style={{ background: 'rgba(0,82,255,0.07)' }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: 'linear-gradient(90deg, #0052ff, transparent)' }}
                />
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[#4d7aaa] text-[11px] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[#2a4a6e] text-xs font-medium">
          © {new Date().getFullYear()} LoyaltyPro · Powered by precision loyalty
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 relative">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0052ff] via-[#3d7eff] to-[#0052ff]" />

        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#0052ff] flex items-center justify-center">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-[#00112c] text-lg tracking-tight">LoyaltyPro</p>
          </div>

          <h2 className="text-2xl font-extrabold text-[#00112c] mb-1 tracking-tight">
            Sign in
          </h2>
          <p className="text-slate-400 text-sm mb-8 font-medium">
            Enter your credentials to access the portal
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#00112c] mb-2 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full h-11 px-4 rounded-xl border-2 border-slate-100 bg-[#f8faff] text-[#00112c] placeholder-slate-300 text-sm font-medium focus:outline-none focus:border-[#0052ff] focus:bg-white transition-all"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#00112c] mb-2 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 px-4 pr-11 rounded-xl border-2 border-slate-100 bg-[#f8faff] text-[#00112c] placeholder-slate-300 text-sm font-medium focus:outline-none focus:border-[#0052ff] focus:bg-white transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 bg-[#0052ff] hover:bg-[#003ecc] disabled:bg-[#99b8ff] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-3.5 rounded-xl bg-[#f0f4ff] border border-[#dce8ff]">
            <p className="text-[11px] font-bold text-[#0052ff] uppercase tracking-wide mb-1">
              Default credentials
            </p>
            <p className="text-xs text-slate-600 font-medium">
              Username: <span className="font-mono text-[#00112c] font-bold">admin</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono text-[#00112c] font-bold">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
