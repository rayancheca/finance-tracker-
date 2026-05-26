import { CsvImportWizard } from '@/components/transactions/CsvImportWizard';
import { listAccounts, listCategories } from '@/db/queries';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const userId = await requireUser();
  const [accounts, categories] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Import CSV</h1>
        <p className="text-sm text-muted-foreground">
          Upload a bank export, map the columns, preview the data, and confirm.
        </p>
      </div>
      <CsvImportWizard accounts={accounts} categories={categories} />
    </div>
  );
}
