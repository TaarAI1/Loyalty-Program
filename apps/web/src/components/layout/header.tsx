'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const titles: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/customers':     'Customers',
  '/reports':       'Reports',
  '/notifications': 'Notifications',
  '/configuration': 'Configuration',
  '/users':         'User Management',
};

export function Header() {
  const pathname = usePathname();
  const { user }  = useAuth();
  const title     = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'LoyaltyPro';

  return (
    <header className="h-14 border-b border-[#e8e8e8] bg-white flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-[#999] font-medium">LoyaltyPro</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#ccc]" />
        <span className="font-black text-[#111111]">{title}</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="p-2 rounded-xl hover:bg-[#f5f5f5] transition-colors">
          <Bell className="w-4.5 h-4.5 text-[#888]" />
        </Link>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#eee]">
            <div className="w-7 h-7 rounded-full bg-[#FFD000] flex items-center justify-center text-xs font-black text-[#111111]">
              {user.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-bold text-[#111111] leading-none">{user.username}</p>
              <p className="text-[11px] text-[#999] capitalize mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
