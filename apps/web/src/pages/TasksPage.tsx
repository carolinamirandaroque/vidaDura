import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, CheckSquare, Circle, ListChecks } from 'lucide-react';
import { api } from '@/lib/api';
import { TaskTree } from '@/components/tasks/TaskTree';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { SearchField } from '@/components/shared/SearchField';
import {
  HubEmptyMessage,
  HubHint,
  HubMetricCard,
  HubSection,
  SectionChipTabs,
  hubSectionClass,
} from '@/components/hub';
import { useAuthStore } from '@/stores/auth.store';
import { filterTaskTree, flattenTasks, searchTasks } from '@lifehub/utils';
import type { TaskStatus } from '@lifehub/types';

type TasksTab = 'all' | 'todo' | 'done';

export function TasksPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TasksTab>('all');
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => api.getTasks(),
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

  const flatTasks = useMemo(() => flattenTasks(tasks ?? []), [tasks]);
  const todoCount = useMemo(
    () => flatTasks.filter((task) => task.status !== 'done').length,
    [flatTasks],
  );
  const doneCount = useMemo(
    () => flatTasks.filter((task) => task.status === 'done').length,
    [flatTasks],
  );

  const filteredTasks = useMemo(() => {
    let result = tasks ?? [];
    if (search.trim()) result = searchTasks(result, search.trim());
    if (activeTab === 'todo') {
      result = filterTaskTree(result, (task) => task.status !== 'done');
    } else if (activeTab === 'done') {
      result = filterTaskTree(result, (task) => task.status === 'done');
    }
    return result;
  }, [tasks, search, activeTab]);

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

  const hasTasks = flatTasks.length > 0;
  const hasFilteredTasks = filteredTasks.length > 0;
  const isFiltered = activeTab !== 'all' || search.trim().length > 0;

  const tabs = [
    {
      id: 'all' as const,
      label: t('tasks.tabAll', { count: flatTasks.length }),
      icon: <ListChecks className="h-3.5 w-3.5" />,
    },
    {
      id: 'todo' as const,
      label: t('tasks.tabTodo', { count: todoCount }),
      icon: <Circle className="h-3.5 w-3.5" />,
    },
    {
      id: 'done' as const,
      label: t('tasks.tabDone', { count: doneCount }),
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  ];

  const sectionTitle =
    activeTab === 'todo'
      ? t('tasks.sectionTodo')
      : activeTab === 'done'
        ? t('tasks.sectionDone')
        : t('tasks.sectionAll');

  return (
    <PageShell width="wide" className="pb-6">
      <PageHeader title={t('tasks.title')} subtitle={t('tasks.subtitle')} />

      <div className={hubSectionClass}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={t('tasks.searchPlaceholder')}
        />

        <SectionChipTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as TasksTab)}
        />

        <HubSection icon={CheckSquare} title={sectionTitle}>
          <HubHint>{t('tasks.listHint')}</HubHint>

          {hasTasks && activeTab === 'all' && !search.trim() && (
            <div className="grid gap-2 sm:grid-cols-2">
              <HubMetricCard label={t('tasks.pendingMetric')} value={String(todoCount)} />
              <HubMetricCard
                label={t('tasks.doneMetric')}
                value={String(doneCount)}
                tone="positive"
              />
            </div>
          )}

          <TaskTree
            tasks={filteredTasks}
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

          {!hasFilteredTasks && isFiltered && (
            <HubEmptyMessage>{t('tasks.noResults')}</HubEmptyMessage>
          )}

          {!hasTasks && !isFiltered && (
            <HubEmptyMessage>{t('tasks.noTasksDescription')}</HubEmptyMessage>
          )}
        </HubSection>
      </div>
    </PageShell>
  );
}
