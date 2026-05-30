'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Target, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/transactions', label: 'Tx', icon: Receipt },
  { href: '/transactions/new', label: 'Add', icon: Plus, primary: true },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur md:hidden">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
              active ? 'text-foreground' : 'text-muted-foreground',
              it.primary && 'relative',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                it.primary && 'bg-primary text-primary-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
