'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Receipt,
  FolderTree,
  Wallet,
  Target,
  LineChart,
  Repeat,
  Building2,
  Calculator,
  FileBarChart,
  Settings,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/net-worth', label: 'Net Worth', icon: LineChart },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/lease', label: 'NYC Lease', icon: Building2 },
  { href: '/tax-calculator', label: 'Tax', icon: Calculator },
  { href: '/reports/monthly', label: 'Reports', icon: FileBarChart },
  { href: '/connections', label: 'Connections', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <div className="h-8 w-8 rounded-lg bg-brand-teal" />
        <span className="font-display text-lg font-semibold tracking-tight">Finance</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-secondary text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
