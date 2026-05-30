import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { formatUSD } from '@/lib/currency';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const userId = await requireUser();
  const cats = await listCategories(userId);

  const byGroup = new Map<string, typeof cats>();
  for (const c of cats) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Group your spending and set monthly budgets per bucket.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from(byGroup.entries()).map(([group, items]) => (
          <Card key={group}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{group}</h2>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <ul className="divide-y divide-border/40 text-sm">
                {items.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          c.kind === 'income'
                            ? 'income'
                            : c.kind === 'expense'
                              ? 'expense'
                              : 'outline'
                        }
                      >
                        {c.kind}
                      </Badge>
                      <span className={c.isArchived ? 'text-muted-foreground line-through' : ''}>
                        {c.name}
                      </span>
                    </div>
                    <span className="tabular text-muted-foreground">
                      {formatUSD(parseFloat(c.monthlyBudget ?? '0'))}/mo
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        {cats.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No categories yet — they will be seeded automatically on first sign-in.
          </p>
        )}
      </div>
    </div>
  );
}
