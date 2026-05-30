import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiTile({
  label,
  value,
  sub,
  href,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const inner = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-1 p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={cn(
            'tabular font-display text-2xl font-semibold',
            tone === 'positive' && 'text-income',
            tone === 'negative' && 'text-expense',
          )}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href as any}>{inner}</Link> : inner;
}
