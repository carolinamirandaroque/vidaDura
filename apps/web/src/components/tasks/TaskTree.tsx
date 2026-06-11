import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Check,
  Plus,
} from 'lucide-react';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@lifehub/ui';
import type { Task, TaskStatus, User } from '@lifehub/types';
import { AssigneePicker } from './AssigneePicker';

interface CreateTaskPayload {
  title: string;
  parentTaskId?: string;
  assigneeId?: string;
}

interface TaskTreeProps {
  tasks: Task[];
  people: User[];
  onCreate: (payload: CreateTaskPayload) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onAssigneeChange: (id: string, assigneeId: string | null) => void;
  onDelete: (id: string) => void;
  isCreating?: boolean;
}

function InlineAddRow({
  depth,
  placeholder,
  people,
  onSubmit,
  isPending,
  autoFocus,
}: {
  depth: number;
  placeholder: string;
  people: User[];
  onSubmit: (payload: CreateTaskPayload) => void;
  isPending?: boolean;
  autoFocus?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;
    onSubmit({ title: trimmed, assigneeId });
    setTitle('');
    setAssigneeId(undefined);
  };

  return (
    <div
      className="flex items-center gap-2 py-1.5 pr-2"
      style={{ paddingLeft: `${depth * 24 + 12}px` }}
    >
      <span className="w-4 shrink-0" />
      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
          if (e.key === 'Escape') {
            setTitle('');
            inputRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        disabled={isPending}
        className="h-8 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
      />
      <AssigneePicker
        people={people}
        value={assigneeId}
        onChange={(id) => setAssigneeId(id ?? undefined)}
      />
    </div>
  );
}

function TaskNode({
  task,
  people,
  onCreate,
  onStatusChange,
  onAssigneeChange,
  onDelete,
  isCreating,
  depth = 0,
}: {
  task: Task;
  people: User[];
  onCreate: (payload: CreateTaskPayload) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onAssigneeChange: (id: string, assigneeId: string | null) => void;
  onDelete: (id: string) => void;
  isCreating?: boolean;
  depth?: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const hasChildren = task.children && task.children.length > 0;
  const childCount = task.children?.length ?? 0;
  const isDone = task.status === 'done';

  const toggleComplete = () => {
    onStatusChange(task.id, isDone ? 'todo' : 'done');
  };

  const handleCreateSubtask = (payload: CreateTaskPayload) => {
    onCreate({ ...payload, parentTaskId: task.id });
    setShowSubtaskInput(false);
    setExpanded(true);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md py-1.5 pr-2 hover:bg-accent/40"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleComplete}
          className={cn(
            'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-muted-foreground/50 hover:border-emerald-500',
          )}
        >
          {isDone && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
        </button>

        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            isDone && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
          {task.eventTitle && (
            <span className="ml-1.5 text-xs text-muted-foreground">· {task.eventTitle}</span>
          )}
        </span>

        {!expanded && childCount > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('tasks.subtaskCount', { count: childCount })}
          </span>
        )}

        <AssigneePicker
          people={people}
          value={task.assigneeId}
          onChange={(assigneeId) => onAssigneeChange(task.id, assigneeId)}
          className="opacity-60 group-hover:opacity-100"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setShowSubtaskInput(true); setExpanded(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t('tasks.addSubtask')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('tasks.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div>
          {hasChildren &&
            (task.children ?? []).map((child) => (
              <TaskNode
                key={child.id}
                task={child}
                people={people}
                onCreate={onCreate}
                onStatusChange={onStatusChange}
                onAssigneeChange={onAssigneeChange}
                onDelete={onDelete}
                isCreating={isCreating}
                depth={depth + 1}
              />
            ))}

          {showSubtaskInput ? (
            <InlineAddRow
              depth={depth + 1}
              placeholder={t('tasks.addSubtaskPlaceholder')}
              people={people}
              onSubmit={handleCreateSubtask}
              isPending={isCreating}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowSubtaskInput(true)}
              className="flex w-full items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              style={{ paddingLeft: `${(depth + 1) * 24 + 36}px` }}
            >
              <Plus className="h-3 w-3" />
              {t('tasks.addSubtask')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskTree({
  tasks,
  people,
  onCreate,
  onStatusChange,
  onAssigneeChange,
  onDelete,
  isCreating,
}: TaskTreeProps) {
  const { t } = useTranslation();

  return (
    <div className="divide-y rounded-lg border bg-card">
      <InlineAddRow
        depth={0}
        placeholder={t('tasks.addTaskPlaceholder')}
        people={people}
        onSubmit={onCreate}
        isPending={isCreating}
      />

      {tasks.length > 0 && (
        <div className="py-1">
          {tasks.map((task) => (
            <TaskNode
              key={task.id}
              task={task}
              people={people}
              onCreate={onCreate}
              onStatusChange={onStatusChange}
              onAssigneeChange={onAssigneeChange}
              onDelete={onDelete}
              isCreating={isCreating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
