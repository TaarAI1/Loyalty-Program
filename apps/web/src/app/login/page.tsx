'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Gift, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

function RewardIllustration() {
  return (
    <svg viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[360px] drop-shadow-2xl">

      {/* ── Floating stars / dots ── */}
      <circle cx="30" cy="60" r="4" fill="#FFD000" opacity="0.6" />
      <circle cx="390" cy="40" r="3" fill="#FFD000" opacity="0.4" />
      <circle cx="370" cy="200" r="5" fill="#FFD000" opacity="0.3" />
      <circle cx="15" cy="220" r="3" fill="#FFD000" opacity="0.5" />
      <polygon points="60,20 63,30 73,30 65,36 68,46 60,40 52,46 55,36 47,30 57,30" fill="#FFD000" opacity="0.7" />
      <polygon points="380,130 382,137 389,137 383,141 385,148 380,144 375,148 377,141 371,137 378,137" fill="#FFD000" opacity="0.5" />

      {/* ── Laptop base ── */}
      <rect x="95" y="175" width="220" height="130" rx="12" fill="#1a1a1a" stroke="#FFD000" strokeWidth="1.5" opacity="0.9"/>
      {/* laptop screen bezel */}
      <rect x="103" y="183" width="204" height="112" rx="8" fill="#0d0d0d" />
      {/* screen content — points overview */}
      <rect x="110" y="190" width="190" height="98" rx="6" fill="#161616" />
      <text x="122" y="207" fontFamily="sans-serif" fontWeight="700" fontSize="9" fill="#888">Points Overview</text>
      <text x="122" y="222" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#FFD000">12,540</text>
      <text x="178" y="222" fontFamily="sans-serif" fontWeight="700" fontSize="8" fill="#22c55e">+12.5%</text>
      {/* mini line chart */}
      <polyline points="118,270 138,258 158,264 178,245 198,252 218,238 238,244 258,232 278,240 288,235" stroke="#FFD000" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* chart area fill */}
      <polygon points="118,270 138,258 158,264 178,245 198,252 218,238 238,244 258,232 278,240 288,235 288,278 118,278" fill="#FFD000" opacity="0.07" />
      {/* x labels */}
      <text x="118" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">Jan</text>
      <text x="148" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">Feb</text>
      <text x="178" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">Mar</text>
      <text x="208" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">Apr</text>
      <text x="238" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">May</text>
      <text x="268" y="287" fontFamily="sans-serif" fontSize="6.5" fill="#444">Jun</text>

      {/* laptop hinge + base */}
      <rect x="85" y="302" width="240" height="10" rx="5" fill="#222" />
      <rect x="130" y="308" width="150" height="6" rx="3" fill="#1a1a1a" />

      {/* ── Gift bag — left ── */}
      <rect x="28" y="120" width="80" height="100" rx="10" fill="#FFD000" opacity="0.92" />
      <rect x="28" y="120" width="80" height="28" rx="10" fill="#e6bb00" />
      {/* bag handle */}
      <path d="M52 120 Q52 100 68 100 Q84 100 84 120" stroke="#c9a000" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* ribbon */}
      <rect x="64" y="120" width="8" height="100" rx="4" fill="#c9a000" opacity="0.6" />
      <rect x="28" y="156" width="80" height="8" rx="4" fill="#c9a000" opacity="0.6" />
      {/* gift icon on bag */}
      <rect x="50" y="175" width="36" height="28" rx="5" fill="#c9a000" opacity="0.5" />
      <text x="68" y="194" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#fff" textAnchor="middle">🎁</text>

      {/* ── Shopping bag — back right ── */}
      <rect x="295" y="100" width="90" height="115" rx="10" fill="#2a2a2a" stroke="#FFD000" strokeWidth="1" opacity="0.8" />
      <rect x="295" y="100" width="90" height="28" rx="10" fill="#222" />
      <path d="M318 100 Q318 80 340 80 Q362 80 362 100" stroke="#FFD000" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7"/>
      <rect x="336" y="100" width="6" height="115" rx="3" fill="#FFD000" opacity="0.15" />
      <rect x="295" y="150" width="90" height="6" rx="3" fill="#FFD000" opacity="0.15" />

      {/* ── Redeem Rewards card ── */}
      <rect x="170" y="60" width="140" height="68" rx="14" fill="#111" stroke="#FFD000" strokeWidth="1.5" />
      <rect x="178" y="72" width="28" height="28" rx="8" fill="#FFD000" />
      <text x="192" y="91" fontFamily="sans-serif" fontWeight="900" fontSize="14" fill="#111" textAnchor="middle">🎁</text>
      <text x="215" y="82" fontFamily="sans-serif" fontWeight="800" fontSize="11" fill="#fff">Redeem</text>
      <text x="215" y="96" fontFamily="sans-serif" fontWeight="800" fontSize="11" fill="#fff">Rewards</text>
      <rect x="178" y="103" width="118" height="16" rx="8" fill="#FFD000" />
      <text x="237" y="115" fontFamily="sans-serif" fontWeight="800" fontSize="9" fill="#111" textAnchor="middle">Explore Rewards</text>

      {/* ── Discount badge ── */}
      <rect x="300" y="58" width="76" height="56" rx="10" fill="#FFD000" transform="rotate(5 300 58)" />
      <text x="340" y="86" fontFamily="sans-serif" fontWeight="900" fontSize="20" fill="#111" textAnchor="middle" transform="rotate(5 340 80)">15%</text>
      <text x="340" y="102" fontFamily="sans-serif" fontWeight="700" fontSize="11" fill="#111" textAnchor="middle" transform="rotate(5 340 80)">OFF</text>

      {/* ── Points coin ── */}
      <circle cx="68" cy="290" r="28" fill="#FFD000" />
      <circle cx="68" cy="290" r="22" fill="#e6bb00" />
      <text x="68" y="285" fontFamily="sans-serif" fontWeight="900" fontSize="16" fill="#111" textAnchor="middle">⭐</text>
      <text x="68" y="302" fontFamily="sans-serif" fontWeight="800" fontSize="7" fill="#111" textAnchor="middle">POINTS</text>

    </svg>
  );
}

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
    <div className="min-h-screen flex bg-white relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[#FFD000] opacity-[0.12] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[30%] w-[350px] h-[350px] rounded-full bg-[#FFD000] opacity-[0.08] blur-[120px] pointer-events-none" />

      {/* ── Left — illustration + text ── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center gap-8 px-12 py-10 relative z-10">

        {/* Logo top-left */}
        <div className="absolute top-8 left-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFD000] flex items-center justify-center shadow-lg">
            <Gift className="w-4 h-4 text-[#111]" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-none tracking-tight">Rewardly</p>
            <p className="text-[#aaa] text-[10px] font-medium mt-0.5">Management System</p>
          </div>
        </div>

        {/* Illustration */}
        <RewardIllustration />

        {/* Text below illustration */}
        <div className="text-center max-w-sm">
          <div className="w-8 h-1 bg-[#FFD000] rounded-full mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white leading-tight tracking-tight mb-3">
            Loyalty that <span className="text-[#FFD000]">pays off.</span>
          </h1>
          <p className="text-[#888] text-sm leading-relaxed">
            Manage tiers, track points, and drive customer retention with a unified loyalty management platform.
          </p>
        </div>
      </div>

      {/* ── Right — login form ── */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#FFD000] flex items-center justify-center">
              <Gift className="w-4 h-4 text-[#111]" />
            </div>
            <p className="font-black text-[#111] text-lg tracking-tight">Rewardly</p>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-black text-[#111] mb-1 tracking-tight">
            Welcome back 👋
          </h2>
          <p className="text-[#999] text-sm mb-8">Sign in to continue and manage your loyalty program.</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-[#999] mb-2 uppercase tracking-widest">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbb]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,7 12,13 21,7"/></svg>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8] text-[#111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:ring-2 focus:ring-[#FFD000]/20 transition-all"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#999] mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbb]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-12 pl-10 pr-12 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8] text-[#111] placeholder-[#ccc] text-sm font-medium focus:outline-none focus:border-[#FFD000] focus:ring-2 focus:ring-[#FFD000]/20 transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-12 bg-[#FFD000] hover:bg-[#e6bb00] disabled:opacity-40 text-[#111111] font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-[#FFD000]/10 hover:shadow-[#FFD000]/20"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Default credentials */}
          <div className="mt-7 p-4 rounded-xl bg-[#f9f9f9] border border-[#e8e8e8]">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-[#FFD000]" />
              <p className="text-[11px] font-black text-[#111] uppercase tracking-widest">Default credentials</p>
            </div>
            <p className="text-xs text-[#666] font-medium">
              Username: <span className="font-mono font-black text-[#111]">admin</span>
              &nbsp;·&nbsp;
              Password: <span className="font-mono font-black text-[#111]">admin123</span>
            </p>
          </div>

          <p className="text-center text-[#bbb] text-xs mt-8">
            © {new Date().getFullYear()} Rewardly · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
