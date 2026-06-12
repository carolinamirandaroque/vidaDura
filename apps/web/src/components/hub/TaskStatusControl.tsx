import { Check } from 'lucide-react';
import { cn } from '@lifehub/ui';
import type { TaskStatus } from '@lifehub/types';

interface TaskStatusControlProps {
  status: TaskStatus;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  title?: string;
}

export function TaskStatusControl({
  status,
  disabled,
  onChange,
  onMouseDown,
  title,
}: TaskStatusControlProps) {
  const isDone = status === 'done';

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onMouseDown={onMouseDown}
      onClick={() => onChange(isDone ? 'todo' : 'done')}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        isDone
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-muted-foreground/50 hover:border-emerald-500',
      )}
    >
      {isDone && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    </button>
  );
}
