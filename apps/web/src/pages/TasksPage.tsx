import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { TaskTree } from '@/components/tasks/TaskTree';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
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
    mutationFn: ({ id, ...dto }: { id: string; status?: TaskStatus; assigneeId?: string | null }) =>
      api.updateTask(id, dto),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteTask,
    onSuccess: invalidate,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('tasks.title')}</h1>
        <p className="text-muted-foreground">{t('tasks.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('tasks.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('tasks.statusFilter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tasks.filterAll')}</SelectItem>
            <SelectItem value="todo">{t('tasks.status.todo')}</SelectItem>
            <SelectItem value="doing">{t('tasks.status.doing')}</SelectItem>
            <SelectItem value="done">{t('tasks.status.done')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TaskTree
        tasks={tasks ?? []}
        people={people}
        isCreating={createMutation.isPending}
        onCreate={(payload) => createMutation.mutate(payload)}
        onStatusChange={(id, status) => updateMutation.mutate({ id, status })}
        onAssigneeChange={(id, assigneeId) => updateMutation.mutate({ id, assigneeId })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
