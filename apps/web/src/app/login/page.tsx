'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gift, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left — black hero */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 bg-[#111111] relative overflow-hidden">
        {/* Yellow top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFD000]" />

        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, #FFD000 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Yellow glow */}
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#FFD000] opacity-5 blur-[100px]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#FFD000] flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <p className="text-white font-black text-lg leading-none tracking-tight">LoyalArc</p>
            <p className="text-[#555] text-xs font-medium mt-0.5">Management System</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <div className="w-10 h-1 bg-[#FFD000] rounded-full mb-6" />
          <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-5">
            Loyalty that<br />
            <span className="text-[#FFD000]">pays off.</span>
          </h1>
          <p className="text-[#666] text-base leading-relaxed max-w-sm">
            Manage tiers, track points, and drive customer retention with a unified loyalty management platform.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: 'Active Members', value: '10K+' },
              { label: 'Points Issued',  value: '2.4M' },
              { label: 'Retention Rate', value: '68%'  },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-4 bg-white/5 border border-white/5">
                <div className="w-5 h-0.5 bg-[#FFD000] rounded mb-2" />
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[#555] text-[11px] font-medium mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[#444] text-xs font-medium">
          © {new Date().getFullYear()} LoyalArc · All rights reserved
        </p>
      </div>

      {/* Right — white form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#FFD000] flex items-center justify-center">
              <Gift className="w-4 h-4 text-[#111111]" />
            </div>
            <p className="font-black text-[#111111] text-lg tracking-tight">LoyalArc</p>
          </div>

          {/* Yellow accent */}
          <div className="w-8 h-1 bg-[#FFD000] rounded-full mb-6" />

          <h2 className="text-2xl font-black text-[#111111] mb-1 tracking-tight">Welcome back</h2>
          <p className="text-[#999] text-sm mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-[#111111] mb-2 uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full h-11 px-4 rounded-xl border-2 border-[#e8e8e8] bg-[#f9f9f9] text-[#111111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:bg-white transition-all"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#111111] mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 px-4 pr-11 rounded-xl border-2 border-[#e8e8e8] bg-[#f9f9f9] text-[#111111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:bg-white transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#888] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 bg-[#FFD000] hover:bg-[#e6bb00] disabled:bg-[#ffe47a] text-[#111111] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-8 p-3.5 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#FFD000]" />
              <p className="text-[11px] font-black text-[#111111] uppercase tracking-widest">Default credentials</p>
            </div>
            <p className="text-xs text-[#666] font-medium">
              Username: <span className="font-mono font-black text-[#111111]">admin</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono font-black text-[#111111]">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
