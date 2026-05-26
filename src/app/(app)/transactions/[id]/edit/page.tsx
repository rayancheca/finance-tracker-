import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { listAccounts, listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUser();
  const { id } = await params;

  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!row) notFound();

  const [accounts, categories] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Edit transaction</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={{
              id: row.id,
              type: row.type,
              date: row.date,
              amount: parseFloat(row.amount),
              accountId: row.accountId,
              transferAccountId: row.transferAccountId,
              categoryId: row.categoryId,
              merchant: row.merchant,
              description: row.description ?? '',
              notes: row.notes,
              isCleared: row.isCleared,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
