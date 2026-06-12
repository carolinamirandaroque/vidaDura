import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import { cn } from '@lifehub/ui';
import type { Task } from '@lifehub/types';
import { buildReorderUpdates, type TaskReorderUpdate } from '@/lib/task-reorder';

interface SortableTaskSiblingsProps {
  tasks: Task[];
  parentTaskId: string | null;
  canDrag: boolean;
  onReorder: (updates: TaskReorderUpdate[]) => void;
  renderTask: (task: Task, dragHandle: React.ReactNode | null) => React.ReactNode;
}

export function SortableTaskSiblings({
  tasks,
  parentTaskId,
  canDrag,
  onReorder,
  renderTask,
}: SortableTaskSiblingsProps) {
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

    const ids = tasks.map((task) => task.id);
    const fromIndex = ids.indexOf(draggingId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex < 0 || toIndex < 0) {
      finishDrag();
      return;
    }

    const nextIds = [...ids];
    nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, draggingId);
    onReorder(buildReorderUpdates(nextIds, parentTaskId));
    finishDrag();
  };

  const dragHandle = (taskId: string) =>
    canDrag ? (
      <button
        type="button"
        draggable
        title={t('tasks.dragToReorder')}
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggingId(taskId);
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', taskId);
        }}
        onDragEnd={finishDrag}
        className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    ) : null;

  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onDragOver={(e) => {
            if (!canDrag || !draggingId || draggingId === task.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOverId(task.id);
          }}
          onDragLeave={() => {
            setOverId((current) => (current === task.id ? null : current));
          }}
          onDrop={(e) => {
            e.preventDefault();
            reorder(task.id);
          }}
          className={cn(
            'rounded-md transition-shadow',
            draggingId === task.id && 'opacity-40',
            overId === task.id && draggingId !== task.id && 'ring-1 ring-primary/40',
          )}
        >
          {renderTask(task, dragHandle(task.id))}
        </div>
      ))}
    </>
  );
}
