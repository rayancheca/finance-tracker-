'use client';

import { useState, useTransition } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { badgeVariants } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { bulkUpdateCategory } from '@/actions/transactions';
import { cn } from '@/lib/utils';

export interface CategoryOption {
  id: string;
  name: string;
  group: string;
  kind: 'income' | 'expense' | 'savings' | 'transfer';
}

interface CategoryComboboxProps {
  transactionId: string;
  transactionType: 'income' | 'expense' | 'transfer';
  currentCategoryId: string | null;
  currentLabel: string;
  categories: CategoryOption[];
  onChanged?: () => void;
}

// Mirrors assertCategoryMatchesType on the server: income rows need an income
// category; expense rows accept anything but income.
function allowedForType(kind: CategoryOption['kind'], type: 'income' | 'expense' | 'transfer') {
  if (type === 'income') return kind === 'income';
  return kind !== 'income';
}

export function CategoryCombobox({
  transactionId,
  transactionType,
  currentCategoryId,
  currentLabel,
  categories,
  onChanged,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function select(categoryId: string) {
    setOpen(false);
    if (categoryId === currentCategoryId) return;
    startTransition(async () => {
      const res = await bulkUpdateCategory([transactionId], categoryId);
      if (res.ok) {
        toast.success('Category updated');
        onChanged?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  const byGroup = new Map<string, CategoryOption[]>();
  for (const c of categories) {
    if (!allowedForType(c.kind, transactionType)) continue;
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label="Change category"
          className={cn(
            badgeVariants({ variant: 'outline' }),
            'gap-1 hover:bg-accent disabled:opacity-50',
          )}
        >
          {currentLabel}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories…" />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            {Array.from(byGroup.entries()).map(([group, opts]) => (
              <CommandGroup key={group} heading={group}>
                {opts.map((c) => (
                  <CommandItem key={c.id} value={`${group} ${c.name}`} onSelect={() => select(c.id)}>
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        c.id === currentCategoryId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
