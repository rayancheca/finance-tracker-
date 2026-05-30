import { Target } from 'lucide-react';
import { listGoals } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { GoalCard } from '@/components/goals/GoalCard';
import { EmptyState } from '@/components/ui/empty-state';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const userId = await requireUser();
  const goals = await listGoals(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Track progress toward what matters. Higher priority shows first.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
        {goals.length === 0 && (
          <EmptyState
            icon={Target}
            heading="No goals yet"
            subline="Savings goals are seeded automatically on your first sign-in."
            className="col-span-full"
          />
        )}
      </div>
    </div>
  );
}
