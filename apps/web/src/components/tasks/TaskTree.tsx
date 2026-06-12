import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronDown,
  CalendarDays,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import type { Task, TaskStatus, User } from '@lifehub/types';
import { getInitials, isEventRootTask } from '@lifehub/utils';
import {
  EditableLabel,
  HubAddRow,
  TaskStatusControl,
  hubListClass,
  hubRowClass,
} from '@/components/hub';
import {
  reorderSiblingTree,
  resolveSiblingParentId,
  type TaskReorderUpdate,
} from '@/lib/task-reorder';
import { AssigneePicker } from './AssigneePicker';
import { SortableTaskSiblings } from './SortableTaskSiblings';
import { EntityAccessPanel } from '@/components/shared/EntityAccessPanel';
import { buildTaskAccessEntries } from '@/lib/entity-access';

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
  onTitleChange: (id: string, title: string) => Promise<void>;
  onAssigneeChange: (id: string, assigneeId: string | null) => void;
  onDelete: (id: string) => void;
  onReorder?: (updates: TaskReorderUpdate[]) => void;
  isCreating?: boolean;
  isReordering?: boolean;
  canEdit?: boolean;
  deleteConfirm?: string;
  addPlaceholder?: string;
}

function InlineAddRow({
  depth,
  placeholder,
  onSubmit,
  isPending,
}: {
  depth: number;
  placeholder: string;
  onSubmit: (payload: CreateTaskPayload) => void;
  isPending?: boolean;
}) {
  const [title, setTitle] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || isPending) return;
    onSubmit({ title: trimmed });
    setTitle('');
  };

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}>
      <HubAddRow
        value={title}
        onChange={setTitle}
        placeholder={placeholder}
        isPending={isPending}
        onSubmit={submit}
      />
    </div>
  );
}

function TaskNode({
  task,
  people,
  onCreate,
  onStatusChange,
  onTitleChange,
  onAssigneeChange,
  onDelete,
  onReorder,
  isCreating,
  isReordering,
  canEdit = true,
  deleteConfirm,
  dragHandle,
  depth = 0,
}: {
  task: Task;
  people: User[];
  onCreate: (payload: CreateTaskPayload) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onTitleChange: (id: string, title: string) => Promise<void>;
  onAssigneeChange: (id: string, assigneeId: string | null) => void;
  onDelete: (id: string) => void;
  onReorder?: (updates: TaskReorderUpdate[]) => void;
  isCreating?: boolean;
  isReordering?: boolean;
  canEdit?: boolean;
  deleteConfirm?: string;
  dragHandle?: React.ReactNode;
  depth?: number;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const hasChildren = task.children && task.children.length > 0;
  const childCount = task.children?.length ?? 0;
  const isDone = task.status === 'done';
  const isEventRoot = isEventRootTask(task);
  const canDrag = canEdit && !!onReorder && !isReordering;

  const handleSiblingReorder = (updates: TaskReorderUpdate[]) => {
    onReorder?.(updates);
  };

  const handleCreateSubtask = (payload: CreateTaskPayload) => {
    onCreate({ ...payload, parentTaskId: task.id });
    setShowSubtaskInput(false);
    setExpanded(true);
  };

  const renderChild = (child: Task, childDragHandle: React.ReactNode | null) => (
    <TaskNode
      key={child.id}
      task={child}
      people={people}
      onCreate={onCreate}
      onStatusChange={onStatusChange}
      onTitleChange={onTitleChange}
      onAssigneeChange={onAssigneeChange}
      onDelete={onDelete}
      onReorder={onReorder}
      isCreating={isCreating}
      isReordering={isReordering}
      canEdit={canEdit}
      deleteConfirm={deleteConfirm}
      dragHandle={childDragHandle}
      depth={depth + 1}
    />
  );

  if (isEventRoot) {
    return (
      <div>
        <div
          className={cn(hubRowClass, 'bg-muted/40')}
          style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}
        >
          {dragHandle}
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

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{task.title}</p>
          </div>

          {!expanded && childCount > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t('tasks.subtaskCount', { count: childCount })}
            </span>
          )}
        </div>

        {expanded && hasChildren && (
          <div className={hubListClass}>
            <SortableTaskSiblings
              tasks={task.children ?? []}
              parentTaskId={task.id}
              canDrag={canDrag}
              onReorder={handleSiblingReorder}
              renderTask={renderChild}
            />
          </div>
        )}
      </div>
    );
  }

  const handleDelete = () => {
    const message =
      childCount > 0
        ? t('tasks.deleteConfirmWithSubtasks', { title: task.title, count: childCount })
        : deleteConfirm;
    if (message && !window.confirm(message)) return;
    onDelete(task.id);
  };

  return (
    <div>
      <div
        className={cn(hubRowClass, 'group')}
        style={{ marginLeft: depth > 0 ? `${depth * 12}px` : undefined }}
      >
        {dragHandle}
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

        <TaskStatusControl
          status={task.status}
          disabled={!canEdit}
          onChange={(status) => onStatusChange(task.id, status)}
        />

        <div className="min-w-0 flex-1">
          <EditableLabel
            value={task.title}
            canEdit={canEdit}
            done={isDone}
            onSave={(title) => onTitleChange(task.id, title)}
          />
          {task.eventTitle && depth === 0 && !isEventRoot && (
            <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 shrink-0" />
              <span className="truncate">{task.eventTitle}</span>
            </span>
          )}
        </div>

        {!expanded && childCount > 0 && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('tasks.subtaskCount', { count: childCount })}
          </span>
        )}

        {canEdit ? (
          <AssigneePicker
            people={people}
            value={task.assigneeId}
            onChange={(assigneeId) => onAssigneeChange(task.id, assigneeId)}
            className="opacity-60 group-hover:opacity-100"
          />
        ) : (
          task.assignee && (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={task.assignee.avatar ?? undefined} />
              <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
          )
        )}

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setShowSubtaskInput(true); setExpanded(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                {t('tasks.addSubtask')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                {t('tasks.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {expanded && !task.eventId && buildTaskAccessEntries(task, people).length > 1 && (
        <div style={{ marginLeft: depth > 0 ? `${depth * 12 + 28}px` : '28px' }}>
          <EntityAccessPanel
            entries={buildTaskAccessEntries(task, people)}
            className="mb-2 rounded-md border bg-muted/20 p-2"
          />
        </div>
      )}

      {expanded && (
        <div className={hubListClass}>
          {hasChildren && (
            <SortableTaskSiblings
              tasks={task.children ?? []}
              parentTaskId={task.id}
              canDrag={canDrag}
              onReorder={handleSiblingReorder}
              renderTask={renderChild}
            />
          )}

          {canEdit && (showSubtaskInput ? (
            <InlineAddRow
              depth={depth + 1}
              placeholder={t('tasks.addSubtaskPlaceholder')}
              onSubmit={handleCreateSubtask}
              isPending={isCreating}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowSubtaskInput(true)}
              className="flex w-full items-center gap-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              style={{ paddingLeft: `${(depth + 1) * 12 + 12}px` }}
            >
              <Plus className="h-3 w-3" />
              {t('tasks.addSubtask')}
            </button>
          ))}
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
  onTitleChange,
  onAssigneeChange,
  onDelete,
  onReorder,
  isCreating,
  isReordering,
  canEdit = true,
  deleteConfirm,
  addPlaceholder,
}: TaskTreeProps) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const [localTasks, setLocalTasks] = useState(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleCreateRoot = () => {
    const trimmed = newTitle.trim();
    if (!trimmed || isCreating) return;
    onCreate({ title: trimmed });
    setNewTitle('');
  };

  const handleReorder = (updates: TaskReorderUpdate[]) => {
    const parentTaskId = updates[0]?.parentTaskId ?? null;
    const orderedIds = [...updates]
      .sort((a, b) => a.position - b.position)
      .map((update) => update.id);
    setLocalTasks((current) => reorderSiblingTree(current, parentTaskId, orderedIds));
    onReorder?.(updates);
  };

  const canDrag = canEdit && !!onReorder && !isReordering;

  const renderRootTask = (task: Task, dragHandle: React.ReactNode | null) => (
    <TaskNode
      task={task}
      people={people}
      onCreate={onCreate}
      onStatusChange={onStatusChange}
      onTitleChange={onTitleChange}
      onAssigneeChange={onAssigneeChange}
      onDelete={onDelete}
      onReorder={handleReorder}
      isCreating={isCreating}
      isReordering={isReordering}
      canEdit={canEdit}
      deleteConfirm={deleteConfirm}
      dragHandle={dragHandle}
    />
  );

  return (
    <div className="space-y-2">
      {canEdit && (
        <HubAddRow
          value={newTitle}
          onChange={setNewTitle}
          placeholder={addPlaceholder ?? t('tasks.addTaskPlaceholder')}
          isPending={isCreating}
          onSubmit={handleCreateRoot}
        />
      )}

      {localTasks.length > 0 && (
        <div className={hubListClass}>
          <SortableTaskSiblings
            tasks={localTasks}
            parentTaskId={resolveSiblingParentId(localTasks)}
            canDrag={canDrag}
            onReorder={handleReorder}
            renderTask={renderRootTask}
          />
        </div>
      )}
    </div>
  );
}
