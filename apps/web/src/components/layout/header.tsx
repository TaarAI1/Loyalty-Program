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
  const title =
    Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'LoyaltyPro';

  return (
    <header className="h-14 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-400">LoyaltyPro</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="font-semibold text-slate-800">{title}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5 text-slate-500" />
        </Link>

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
              {user.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700 leading-none">{user.username}</p>
              <p className="text-[11px] text-slate-400 capitalize mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
