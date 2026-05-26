import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireUser } from '@/lib/auth';
import { db } from '@/db';
import { goals, goalContributions } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { formatUSD } from '@/lib/currency';
import { ContributeForm } from '@/components/goals/ContributeForm';

export const dynamic = 'force-dynamic';

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUser();
  const { id } = await params;

  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .limit(1);
  if (!goal) notFound();

  const contributions = await db
    .select()
    .from(goalContributions)
    .where(eq(goalContributions.goalId, id))
    .orderBy(desc(goalContributions.date));

  const cur = parseFloat(goal.currentAmount);
  const tgt = parseFloat(goal.targetAmount);
  const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{goal.name}</h1>
          {goal.targetDate && (
            <p className="text-sm text-muted-foreground">
              Target {format(new Date(goal.targetDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <Badge variant={goal.status === 'completed' ? 'income' : 'default'}>{goal.status}</Badge>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex justify-between text-sm tabular">
            <span>{formatUSD(cur)}</span>
            <span className="text-muted-foreground">{formatUSD(tgt)}</span>
          </div>
          <Progress value={pct} />
          <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contribute</CardTitle>
        </CardHeader>
        <CardContent>
          <ContributeForm goalId={goal.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contributions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No contributions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="tabular">{format(new Date(c.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="tabular text-right text-income">
                      +{formatUSD(parseFloat(c.amount))}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
