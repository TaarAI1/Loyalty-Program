'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/configuration': 'Configuration',
  '/users': 'User Management',
};

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const title = Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'LoyaltyPro';

  return (
    <header className="h-14 border-b border-slate-200/70 bg-white flex items-center justify-between px-6 shrink-0 shadow-[0_1px_3px_rgba(0,18,44,0.04)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-400 font-medium">LoyaltyPro</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-[#00112c]">{title}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl hover:bg-[#f0f2f8] transition-colors"
        >
          <Bell className="w-4.5 h-4.5 text-slate-500" />
        </Link>

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0052ff] to-[#3d7eff] flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-blue-200">
              {user.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-semibold text-[#00112c] leading-none">{user.username}</p>
              <p className="text-[11px] text-slate-400 capitalize mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
