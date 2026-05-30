import { CategoryBoard } from '@/components/categories/CategoryBoard';
import { listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const userId = await requireUser();
  const cats = await listCategories(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Drag to reorder within a group, and set monthly budgets per bucket.
        </p>
      </div>
      {cats.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories yet — they will be seeded automatically on first sign-in.
        </p>
      ) : (
        <CategoryBoard categories={cats} />
      )}
    </div>
  );
}
