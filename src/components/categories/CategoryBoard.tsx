'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { reorderCategories } from '@/actions/categories';
import { cn } from '@/lib/utils';
import { formatUSD } from '@/lib/currency';

export interface CategoryRow {
  id: string;
  name: string;
  group: string;
  kind: 'income' | 'expense' | 'savings' | 'transfer';
  monthlyBudget: string | null;
  isArchived: boolean;
}

function kindVariant(kind: CategoryRow['kind']) {
  if (kind === 'income') return 'income' as const;
  if (kind === 'expense') return 'expense' as const;
  return 'outline' as const;
}

function groupOrder(items: CategoryRow[]): string[] {
  const seen: string[] = [];
  for (const c of items) if (!seen.includes(c.group)) seen.push(c.group);
  return seen;
}

interface SortableCategoryRowProps {
  category: CategoryRow;
}

function SortableCategoryRow({ category }: SortableCategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  // dnd-kit computes this transform at runtime, so it cannot be a Tailwind class —
  // the React `style` prop is the sanctioned exception to the no-inline-styles rule.
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between gap-2 py-2',
        isDragging && 'opacity-60',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={`Reorder ${category.name}`}
          className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant={kindVariant(category.kind)}>{category.kind}</Badge>
        <span
          className={cn(
            'truncate',
            category.isArchived && 'text-muted-foreground line-through',
          )}
        >
          {category.name}
        </span>
      </div>
      <span className="tabular shrink-0 text-muted-foreground">
        {formatUSD(parseFloat(category.monthlyBudget ?? '0'))}/mo
      </span>
    </li>
  );
}

export function CategoryBoard({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<CategoryRow[]>(categories);
  const [, startTransition] = useTransition();

  // Re-sync local order when the server sends a new ordering (after router.refresh()).
  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(group: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const groupItems = items.filter((c) => c.group === group);
    const oldIndex = groupItems.findIndex((c) => c.id === active.id);
    const newIndex = groupItems.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGroup = arrayMove(groupItems, oldIndex, newIndex);

    // Groups are contiguous (the source query orders by group); splice the reordered
    // group back into place and keep every other group untouched.
    const next: CategoryRow[] = [];
    let inserted = false;
    for (const c of items) {
      if (c.group === group) {
        if (!inserted) {
          next.push(...reorderedGroup);
          inserted = true;
        }
      } else {
        next.push(c);
      }
    }

    const previous = items;
    setItems(next);
    startTransition(async () => {
      const res = await reorderCategories(next.map((c) => c.id));
      if (res.ok) {
        router.refresh();
      } else {
        setItems(previous);
        toast.error(res.error);
      }
    });
  }

  const groups = groupOrder(items);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => {
        const groupItems = items.filter((c) => c.group === group);
        return (
          <Card key={group}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{group}</h2>
                <Badge variant="secondary">{groupItems.length}</Badge>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(group, event)}
              >
                <SortableContext
                  items={groupItems.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="divide-y divide-border/40 text-sm">
                    {groupItems.map((c) => (
                      <SortableCategoryRow key={c.id} category={c} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
