'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
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
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#F8F8F8]">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden"
        style={{ background: 'linear-gradient(165deg, #000820 0%, #001020 50%, #000820 100%)' }}
      >
        <div
          className="absolute -right-20 top-[20%] w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(136,200,255,0.18) 0%, transparent 68%)' }}
        />
        <div
          className="absolute -left-16 bottom-0 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(185,235,50,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative z-10">
          <Image
            src="/brand/logo-white.png"
            alt="Loyalty Plus"
            width={220}
            height={56}
            className="h-11 w-auto object-contain object-left"
            priority
          />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-10">
          <Image
            src="/brand/logo-white.png"
            alt="Loyalty Plus"
            width={480}
            height={120}
            className="w-full max-w-[420px] h-auto object-contain drop-shadow-lg"
            priority
          />
          <div className="mt-10 text-center max-w-md">
            <div className="w-10 h-1 bg-[#B9EB32] rounded-full mx-auto mb-5" />
            <h1 className="text-[28px] font-black text-[#F8F8F8] leading-tight tracking-tight mb-3">
              One loyalty experience.{' '}
              <span className="text-[#B9EB32]">Online and in store.</span>
            </h1>
            <p className="text-[#88C8FF]/85 text-[15px] leading-relaxed">
              Unified loyalty for e‑commerce and POS — manage tiers, points, and retention in one place.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-[#487898] text-xs font-medium tracking-wide">
          © {new Date().getFullYear()} Loyalty Plus
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative bg-white">
        <div className="absolute left-0 top-[8%] bottom-[8%] w-px bg-[#E8EEF3] hidden lg:block" />

        <div className="w-full max-w-[400px]">
          <div className="mb-10">
            <Image
              src="/brand/logo-navy.png"
              alt="Loyalty Plus"
              width={200}
              height={48}
              className="h-10 w-auto object-contain object-left"
              priority
            />
          </div>

          <h2 className="text-[28px] font-black text-[#000820] mb-1.5 tracking-tight">
            Welcome back
          </h2>
          <p className="text-[#487898] text-sm mb-8">
            Sign in to manage your loyalty program.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#487898] mb-2 uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full h-12 px-4 rounded-xl border border-[#D0DCE6] bg-[#F5F7FA] text-[#000820] placeholder-[#A0AEC0] text-sm font-medium focus:outline-none focus:border-[#B9EB32] focus:ring-2 focus:ring-[#B9EB32]/25 focus:bg-white transition-all"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#487898] mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-12 pl-4 pr-12 rounded-xl border border-[#D0DCE6] bg-[#F5F7FA] text-[#000820] placeholder-[#A0AEC0] text-sm font-medium focus:outline-none focus:border-[#B9EB32] focus:ring-2 focus:ring-[#B9EB32]/25 focus:bg-white transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#487898] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-12 mt-2 bg-[#B9EB32] hover:bg-[#A6D42A] active:bg-[#95C220] disabled:opacity-40 disabled:cursor-not-allowed text-[#000820] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(0,8,32,0.08)]"
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

          <p className="text-center text-[#A0AEC0] text-xs mt-8">
            © {new Date().getFullYear()} Loyalty Plus · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
