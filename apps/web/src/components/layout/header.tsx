'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import Link from 'next/link';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/notifications': 'Notifications',
  '/configuration': 'Configuration',
};

export function Header() {
  const pathname = usePathname();
  const title =
    Object.entries(titles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Loyalty Program';

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>
    </header>
  );
}
