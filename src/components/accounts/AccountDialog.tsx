'use client';

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AccountForm, type AccountInitial } from './AccountForm';

export function AccountDialog({
  initial,
  children,
}: {
  initial?: AccountInitial;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Add account
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial?.id ? 'Edit account' : 'New account'}</DialogTitle>
          <DialogDescription>
            {initial?.id
              ? 'Update the details or balance of this account.'
              : 'Add a bank, card, cash, or brokerage account with its current balance.'}
          </DialogDescription>
        </DialogHeader>
        <AccountForm initial={initial} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
