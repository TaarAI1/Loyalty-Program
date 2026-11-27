'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Settings, BarChart3, Bell,
  UserCog, LogOut, ChevronLeft, ChevronRight, Filter, ClipboardList, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const baseNavItems = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers',  label: 'Customers', icon: Users },
  { href: '/reports',    label: 'Reports',   icon: BarChart3 },
  { href: '/segments',   label: 'Segments',  icon: Filter },
];
const adminNavItems = [
  { href: '/notifications',  label: 'Notifications',   icon: Bell },
  { href: '/configuration',  label: 'Configuration',   icon: Settings },
  { href: '/forms',          label: 'Forms',            icon: ClipboardList },
  { href: '/feedback',       label: 'Feedback',         icon: MessageSquare },
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
      'relative flex flex-col bg-[#000820] transition-all duration-300 ease-in-out shrink-0',
      collapsed ? 'w-[72px]' : 'w-[248px]',
    )}>
      <div className="h-[3px] w-full bg-[#B9EB32]" />

      {/* Logo — left edge aligns with nav item text (px-2.5 + px-3) */}
      <div className={cn(
        'flex items-center border-b border-white/10',
        collapsed ? 'justify-center px-3 py-4' : 'px-2.5 py-4',
      )}>
        {collapsed ? (
          <div className="w-10 h-10 rounded-xl bg-[#B9EB32] flex items-center justify-center">
            <span className="text-[#000820] font-black text-xl leading-none">+</span>
          </div>
        ) : (
          <Image
            src="/brand/logo-white.png"
            alt="Loyalty Plus"
            width={220}
            height={40}
            className="ml-3 h-9 w-auto max-w-[200px] object-contain object-left"
            priority
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold text-[#6B8FA8] uppercase tracking-[0.14em] px-3 mb-3">
            Menu
          </p>
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
                  ? 'bg-[#B9EB32] text-[#000820] shadow-sm'
                  : 'text-[#C5D0DC] hover:bg-white/8 hover:text-white',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon className={cn(
                'w-[18px] h-[18px] flex-shrink-0',
                active ? 'text-[#000820]' : 'text-[#8FA3B8] group-hover:text-white',
              )} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#000820]/35" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className={cn('border-t border-white/10 p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#B9EB32] flex items-center justify-center text-xs font-black text-[#000820] flex-shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{user.username}</p>
              <p className="text-[11px] text-[#8FA3B8] capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#8FA3B8] hover:bg-white/8 hover:text-red-400 transition-all',
            collapsed && 'justify-center w-10 h-10',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[#000820] border border-[#2A3A50] flex items-center justify-center hover:border-[#B9EB32] hover:bg-[#001020] transition-colors z-10 shadow-md"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-[#B9EB32]" />
          : <ChevronLeft className="w-3 h-3 text-[#B9EB32]" />}
      </button>
    </aside>
  );
}
