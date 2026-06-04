'use client';

import { UserButton } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LOCAL_DEV = process.env.NEXT_PUBLIC_LOCAL_DEV === '1';

export function Header({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <h1 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
        {title ?? 'Finance'}
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        {LOCAL_DEV ? (
          <span
            className="flex h-7 items-center rounded-full border border-border bg-muted px-2.5 text-xs font-medium text-muted-foreground"
            title="Local dev mode — Clerk auth bypassed"
          >
            Local dev
          </span>
        ) : (
          <UserButton afterSignOutUrl="/sign-in" />
        )}
      </div>
    </header>
  );
}
