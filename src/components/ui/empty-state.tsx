import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  subline?: ReactNode;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon: Icon, heading, subline, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">{heading}</h3>
        {subline && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{subline}</p>}
      </div>
      {action && (
        <Button asChild size="sm" className="mt-1">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
