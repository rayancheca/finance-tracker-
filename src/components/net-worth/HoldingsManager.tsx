'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  createHolding,
  deleteHolding,
  importHoldings,
  refreshHoldingPrices,
  type HoldingImportRow,
} from '@/actions/holdings';
import { formatUSD } from '@/lib/currency';

interface HoldingRow {
  id: string;
  accountName: string | null;
  symbol: string;
  name: string | null;
  quantity: string;
  currentPrice: string | null;
  marketValue: string;
  asOfDate: string;
}

interface AccountOption {
  id: string;
  name: string;
}

function mapHoldingRows(data: Record<string, string>[]): HoldingImportRow[] {
  const pick = (row: Record<string, string>, keys: string[]): string | undefined => {
    for (const k of Object.keys(row)) {
      if (keys.includes(k.toLowerCase().replace(/[^a-z]/g, ''))) return row[k];
    }
    return undefined;
  };
  const num = (raw: string | undefined): number => parseFloat((raw ?? '').replace(/[^0-9.\-]/g, ''));

  const out: HoldingImportRow[] = [];
  for (const row of data) {
    const symbol = pick(row, ['symbol', 'ticker', 'stock']);
    const quantity = num(pick(row, ['quantity', 'qty', 'shares', 'units', 'sharesowned']));
    if (!symbol || !Number.isFinite(quantity) || quantity <= 0) continue;
    const cost = num(pick(row, ['costbasis', 'cost', 'totalcost', 'basis']));
    out.push({
      symbol,
      quantity,
      costBasis: Number.isFinite(cost) && cost > 0 ? cost : null,
    });
  }
  return out;
}

export function HoldingsManager({
  holdings,
  accounts,
  totalMarket,
}: {
  holdings: HoldingRow[];
  accounts: AccountOption[];
  totalMarket: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');

  const hasAccount = accounts.length > 0;
  const asOf = holdings.reduce<string | null>((a, h) => (a && a > h.asOfDate ? a : h.asOfDate), null);

  function refresh() {
    startTransition(async () => {
      const res = await refreshHoldingPrices();
      if (res.ok) {
        toast.success(
          `Updated ${res.data.updated} price${res.data.updated === 1 ? '' : 's'}` +
            (res.data.unpriced ? `, ${res.data.unpriced} unpriced` : ''),
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function addHolding() {
    const quantity = parseFloat(qty);
    if (!accountId) {
      toast.error('Pick an account');
      return;
    }
    if (!symbol.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Symbol and a positive quantity are required');
      return;
    }
    startTransition(async () => {
      const res = await createHolding({
        accountId,
        symbol: symbol.trim(),
        quantity,
        costBasis: cost ? parseFloat(cost) : null,
      });
      if (res.ok) {
        toast.success(
          res.data.priced
            ? `Added ${res.data.symbol} at the live price`
            : `Added ${res.data.symbol} — no live price found, refresh later`,
        );
        setSymbol('');
        setQty('');
        setCost('');
        setAddOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!accountId) {
      toast.error('Pick an account to import into');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = mapHoldingRows(result.data);
        if (rows.length === 0) {
          toast.error('No symbol/quantity rows found — expected columns like "symbol" and "quantity".');
          return;
        }
        startTransition(async () => {
          const res = await importHoldings(accountId, rows);
          if (res.ok) {
            toast.success(
              `Imported ${res.data.inserted} holding${res.data.inserted === 1 ? '' : 's'} ` +
                `(${res.data.priced} priced live` +
                (res.data.skipped ? `, ${res.data.skipped} skipped` : '') +
                ')',
            );
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      },
    });
  }

  function remove(id: string, sym: string) {
    if (!window.confirm(`Remove ${sym}?`)) return;
    startTransition(async () => {
      const res = await deleteHolding(id);
      if (res.ok) {
        toast.success(`Removed ${sym}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 p-4 pb-0">
        {hasAccount ? (
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            Add a brokerage or retirement account to track holdings.
          </p>
        )}

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!hasAccount}>
              <Plus className="mr-1 h-4 w-4" /> Add holding
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add holding</DialogTitle>
              <DialogDescription>
                Enter a ticker and the number of shares — the current price is pulled live.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                addHolding();
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="h-symbol">Symbol</Label>
                  <Input
                    id="h-symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="VOO"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="h-qty">Quantity</Label>
                  <Input
                    id="h-qty"
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="h-cost">Total cost basis (optional)</Label>
                <Input
                  id="h-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="3500.00"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  Add
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          size="sm"
          variant="outline"
          disabled={!hasAccount || pending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-1 h-4 w-4" /> Import CSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFile}
        />

        <Button
          size="sm"
          variant="outline"
          disabled={holdings.length === 0 || pending}
          onClick={refresh}
        >
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh prices
        </Button>

        {asOf && (
          <span className="ml-auto text-xs text-muted-foreground">
            Prices as of {format(new Date(asOf), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      {holdings.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          No holdings yet. Add one above or import a CSV (columns: <code>symbol</code>,{' '}
          <code>quantity</code>, optional <code>cost basis</code>).
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">% Portfolio</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h) => {
              const mv = parseFloat(h.marketValue);
              const pct = totalMarket > 0 ? (mv / totalMarket) * 100 : 0;
              return (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    {h.symbol}
                    {h.name && (
                      <div className="text-xs font-normal text-muted-foreground">{h.name}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.accountName}</TableCell>
                  <TableCell className="tabular text-right">{parseFloat(h.quantity)}</TableCell>
                  <TableCell className="tabular text-right">
                    {h.currentPrice ? formatUSD(parseFloat(h.currentPrice)) : '—'}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatUSD(mv)}</TableCell>
                  <TableCell className="tabular text-right">{pct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${h.symbol}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => remove(h.id, h.symbol)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
