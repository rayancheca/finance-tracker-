import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatUSD } from '@/lib/currency';
import { format } from 'date-fns';

export function GoalCard({
  goal,
}: {
  goal: {
    id: string;
    name: string;
    targetAmount: string;
    currentAmount: string;
    targetDate: string | null;
    status: 'active' | 'paused' | 'completed' | 'abandoned';
  };
}) {
  const cur = parseFloat(goal.currentAmount);
  const tgt = parseFloat(goal.targetAmount);
  const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{goal.name}</h3>
              {goal.targetDate && (
                <p className="text-xs text-muted-foreground">
                  by {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <Badge
              variant={
                goal.status === 'completed'
                  ? 'income'
                  : goal.status === 'active'
                    ? 'default'
                    : 'secondary'
              }
            >
              {goal.status}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm tabular">
              <span>{formatUSD(cur)}</span>
              <span className="text-muted-foreground">{formatUSD(tgt)}</span>
            </div>
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% complete</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
