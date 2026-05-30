import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { listAccounts, listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewTransactionPage() {
  const userId = await requireUser();
  const [accounts, categories] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">New transaction</h1>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm accounts={accounts} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
