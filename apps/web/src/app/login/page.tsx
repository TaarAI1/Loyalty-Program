'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gift, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

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

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: '#ffffff' }}>

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-[#FFD000] flex items-center justify-center shadow-md">
            <Gift className="w-5 h-5 text-[#111]" />
          </div>
          <div>
            <p className="text-[#111] font-black text-lg leading-none tracking-tight">Rewardly</p>
            <p className="text-[#aaa] text-[11px] font-medium mt-0.5">Management System</p>
          </div>
        </div>

        {/* ── Illustration image ── */}
        <div className="relative z-10 flex items-center justify-center flex-1 py-4">
          <Image
            src="/login-illustration.png"
            alt="Loyalty rewards illustration"
            width={460}
            height={360}
            className="w-full max-w-[460px] object-contain drop-shadow-xl"
            priority
          />
        </div>

        {/* Text below illustration */}
        <div className="relative z-10 text-center pb-2">
          <div className="w-8 h-1 bg-[#FFD000] rounded-full mx-auto mb-4" />
          <h1 className="text-2xl font-black text-[#111] leading-tight tracking-tight mb-2">
            Loyalty that <span className="text-[#FFD000]">pays off.</span>
          </h1>
          <p className="text-[#888] text-sm leading-relaxed max-w-xs mx-auto">
            Manage tiers, track points, and drive customer retention with a unified loyalty management platform.
          </p>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 relative">
        {/* Subtle border separator */}
        <div className="absolute left-0 top-[10%] bottom-[10%] w-px bg-[#f0f0f0]" />

        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#FFD000] flex items-center justify-center">
              <Gift className="w-4 h-4 text-[#111]" />
            </div>
            <p className="font-black text-[#111] text-lg tracking-tight">Rewardly</p>
          </div>

          <h2 className="text-3xl font-black text-[#111] mb-1.5 tracking-tight">
            Welcome back 👋
          </h2>
          <p className="text-[#aaa] text-sm mb-8">Sign in to continue and manage your loyalty program.</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-[11px] font-bold text-[#999] mb-2 uppercase tracking-widest">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ccc]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/></svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] text-[#111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:ring-2 focus:ring-[#FFD000]/20 focus:bg-white transition-all"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-[#999] mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ccc]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-12 pl-10 pr-12 rounded-xl border border-[#e8e8e8] bg-[#fafafa] text-[#111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:ring-2 focus:ring-[#FFD000]/20 focus:bg-white transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#ccc] hover:text-[#999] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-12 bg-[#FFD000] hover:bg-[#e6bb00] disabled:opacity-40 text-[#111] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-1 shadow-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Default credentials */}
          <div className="mt-6 p-4 rounded-xl bg-[#fafafa] border border-[#e8e8e8]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-[#FFD000]" />
              <p className="text-[11px] font-black text-[#111] uppercase tracking-widest">Default credentials</p>
            </div>
            <p className="text-xs text-[#888]">
              Username: <span className="font-mono font-black text-[#111]">admin</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono font-black text-[#111]">admin123</span>
            </p>
          </div>

          <p className="text-center text-[#ccc] text-xs mt-6">
            © {new Date().getFullYear()} Rewardly · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
