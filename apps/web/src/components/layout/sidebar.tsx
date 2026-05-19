'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Settings, BarChart3, Bell,
  Gift, UserCog, LogOut, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const baseNavItems = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers',  label: 'Customers', icon: Users },
  { href: '/reports',    label: 'Reports',   icon: BarChart3 },
];
const adminNavItems = [
  { href: '/notifications',  label: 'Notifications',   icon: Bell },
  { href: '/configuration',  label: 'Configuration',   icon: Settings },
  { href: '/users',          label: 'User Management', icon: UserCog },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [...baseNavItems, ...(user?.role === 'admin' ? adminNavItems : [])];

  function handleLogout() { logout(); router.push('/login'); }

  return (
    <aside className={cn(
      'relative flex flex-col bg-[#111111] transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-[70px]' : 'w-[240px]',
    )}>
      {/* Yellow accent bar */}
      <div className="h-[3px] w-full bg-[#FFD000]" />

      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-white/5',
        collapsed && 'justify-center px-4',
      )}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#FFD000] flex items-center justify-center">
          <Gift className="w-4 h-4 text-[#111111]" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-black text-[15px] text-white leading-none tracking-tight">LoyaltyPro</p>
            <p className="text-[#666] text-[11px] mt-0.5 font-medium">Management System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5">
        {!collapsed && (
          <p className="text-[10px] font-black text-[#333] uppercase tracking-widest px-3 mb-3">Menu</p>
        )}
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all',
                active
                  ? 'bg-[#FFD000] text-[#111111]'
                  : 'text-[#777] hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center',
              )}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px] flex-shrink-0',
                active ? 'text-[#111111]' : 'text-[#555] group-hover:text-white',
              )} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#111111]/40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className={cn('border-t border-white/5 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#FFD000] flex items-center justify-center text-xs font-black text-[#111111] flex-shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{user.username}</p>
              <p className="text-[11px] text-[#555] capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#555] hover:bg-white/5 hover:text-red-400 transition-all',
            collapsed && 'justify-center w-10 h-10',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[#111111] border border-[#333] flex items-center justify-center hover:bg-[#222] transition-colors z-10 shadow-md"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-[#FFD000]" />
          : <ChevronLeft className="w-3 h-3 text-[#FFD000]" />}
      </button>
    </aside>
  );
}
