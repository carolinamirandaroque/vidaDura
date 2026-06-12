import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import { cn } from '@lifehub/ui';
import type { ShoppingListItem } from '@lifehub/types';
import {
  buildShoppingReorderUpdates,
  type ShoppingReorderUpdate,
} from '@/lib/shopping-reorder';

interface SortableShoppingItemsProps {
  items: ShoppingListItem[];
  canDrag?: boolean;
  onReorder: (updates: ShoppingReorderUpdate[]) => void;
  renderItem: (item: ShoppingListItem, dragHandle: React.ReactNode | null) => React.ReactNode;
}

export function SortableShoppingItems({
  items,
  canDrag = true,
  onReorder,
  renderItem,
}: SortableShoppingItemsProps) {
  const { t } = useTranslation();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const finishDrag = () => {
    setDraggingId(null);
    setOverId(null);
  };

  const reorder = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      finishDrag();
      return;
    }

    const ids = items.map((item) => item.id);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) {
      finishDrag();
      return;
    }

    const nextIds = [...ids];
    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, draggingId);
    onReorder(buildShoppingReorderUpdates(nextIds));
    finishDrag();
  };

  const dragHandle = (itemId: string) =>
    canDrag ? (
      <button
        type="button"
        draggable
        title={t('shopping.dragToReorder')}
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggingId(itemId);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', itemId);
        }}
        onDragEnd={finishDrag}
        className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    ) : null;

  return (
    <>
      {items.map((item) => (
        <li
          key={item.id}
          onDragOver={(e) => {
            if (!canDrag || !draggingId || draggingId === item.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOverId(item.id);
          }}
          onDragLeave={() => {
            setOverId((current) => (current === item.id ? null : current));
          }}
          onDrop={(e) => {
            e.preventDefault();
            reorder(item.id);
          }}
          className={cn(
            'list-none rounded-md transition-shadow',
            draggingId === item.id && 'opacity-40',
            overId === item.id && draggingId !== item.id && 'ring-1 ring-primary/40',
          )}
        >
          {renderItem(item, dragHandle(item.id))}
        </li>
      ))}
    </>
  );
}
