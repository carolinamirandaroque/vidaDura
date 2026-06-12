import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { TaskTree } from '@/components/tasks/TaskTree';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { SearchField } from '@/components/shared/SearchField';
import { FilterBar } from '@/components/shared/FilterBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import type { TaskStatus } from '@lifehub/types';

export function TasksPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', userId, filters],
    queryFn: () => api.getTasks(filters),
    enabled: !!userId,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts', userId],
    queryFn: () => api.getContacts(),
    enabled: !!userId,
  });

  const people = useMemo(() => {
    const map = new Map<string, NonNullable<typeof user>>();
    if (user) map.set(user.id, user);
    contacts?.forEach((c) => {
      if (c.user) map.set(c.user.id, c.user);
    });
    return Array.from(map.values());
  }, [user, contacts]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

  const createMutation = useMutation({
    mutationFn: api.createTask,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      ...dto
    }: {
      id: string;
      title?: string;
      status?: TaskStatus;
      assigneeId?: string | null;
    }) => api.updateTask(id, dto),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: api.reorderTasks,
    onSuccess: invalidate,
    onError: invalidate,
  });

  if (isLoading) return <PageLoading />;

  const hasTasks = (tasks?.length ?? 0) > 0;

  return (
    <PageShell width="wide">
      <PageHeader title={t('tasks.title')} subtitle={t('tasks.subtitle')} />

      <FilterBar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('tasks.searchPlaceholder')}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('tasks.statusFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.filterAll')}</SelectItem>
            <SelectItem value="todo">{t('tasks.status.todo')}</SelectItem>
            <SelectItem value="done">{t('tasks.status.done')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {!hasTasks && !search && statusFilter === 'all' ? (
        <EmptyState
          icon={CheckSquare}
          title={t('tasks.noTasks')}
          description={t('tasks.noTasksDescription')}
        />
      ) : (
        <TaskTree
          tasks={tasks ?? []}
          people={people}
          isCreating={createMutation.isPending}
          deleteConfirm={t('tasks.deleteConfirm')}
          onCreate={(payload) => createMutation.mutate(payload)}
          onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
          onTitleChange={async (id, title) => {
            await updateMutation.mutateAsync({ id, title });
          }}
          onAssigneeChange={(id, assigneeId) => updateMutation.mutate({ id, assigneeId })}
          onDelete={(id) => deleteMutation.mutate(id)}
          onReorder={(updates) => reorderMutation.mutate(updates)}
          isReordering={reorderMutation.isPending}
        />
      )}
    </PageShell>
  );
}
