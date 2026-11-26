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
  '/segments':      'Segments',
  '/forms':         'Forms',
  '/feedback':      'Feedback',
};

export function Header() {
  const pathname = usePathname();
  const { user }  = useAuth();
  const title     = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Loyalty Plus';

  return (
    <header className="h-14 border-b border-[#D0DCE6] bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-[#487898] font-medium">Loyalty Plus</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#A0AEC0]" />
        <span className="font-black text-[#000820]">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="p-2 rounded-xl hover:bg-[#F5F7FA] transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-[#487898]" />
        </Link>
        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-[#E2EAF0]">
            <div className="w-7 h-7 rounded-full bg-[#B9EB32] flex items-center justify-center text-xs font-black text-[#000820]">
              {user.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-[13px] font-bold text-[#000820] leading-none">{user.username}</p>
              <p className="text-[11px] text-[#487898] capitalize mt-0.5">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
