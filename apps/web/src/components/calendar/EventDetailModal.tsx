import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Users,
  CheckSquare,
  Wallet,
  ShoppingBag,
  Plus,
  Cake,
  Plane,
  PartyPopper,
  CalendarDays,
  Package,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarImage,
  AvatarFallback,
  cn,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { ExpenseSplitForm } from '@/components/expenses/ExpenseSplitForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials } from '@lifehub/utils';
import type { HubEventType, EventItemType, Task, User, EventDetail } from '@lifehub/types';

const typeIcons: Record<HubEventType, typeof CalendarDays> = {
  general: CalendarDays,
  birthday: Cake,
  meeting: Users,
  trip: Plane,
  celebration: PartyPopper,
  social: Users,
  other: CalendarDays,
};

const UNASSIGNED = '__none__';

function getEventPeople(detail: EventDetail, currentUser?: User | null): User[] {
  const map = new Map<string, User>();
  if (detail.createdBy) map.set(detail.createdBy.id, detail.createdBy);
  detail.participants?.forEach((p) => {
    if (p.user) map.set(p.user.id, p.user);
  });
  if (currentUser) map.set(currentUser.id, currentUser);
  return Array.from(map.values());
}

function AssigneeSelect({
  people,
  value,
  onChange,
  className,
}: {
  people: User[];
  value?: string;
  onChange: (id: string | undefined) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(v) => onChange(v === UNASSIGNED ? undefined : v)}
    >
      <SelectTrigger className={cn('h-9', className)}>
        <SelectValue placeholder={t('eventHub.assignTo')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>{t('eventHub.unassigned')}</SelectItem>
        {people.map((person) => (
          <SelectItem key={person.id} value={person.id}>
            <span className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={person.avatar ?? undefined} />
                <AvatarFallback className="text-[8px]">{getInitials(person.name)}</AvatarFallback>
              </Avatar>
              {person.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Wallet;
  title: string;
  count?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {count && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );
}

function TaskRow({ task, depth = 0 }: { task: Task; depth?: number }) {
  const { t } = useTranslation();
  return (
    <>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            task.status === 'done' && 'bg-green-500',
            task.status === 'doing' && 'bg-yellow-500',
            task.status === 'todo' && 'bg-muted-foreground',
          )}
        />
        <span className={cn('flex-1', task.status === 'done' && 'line-through opacity-60')}>
          {task.title}
        </span>
        {task.assignee && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={task.assignee.avatar ?? undefined} />
            <AvatarFallback className="text-[8px]">{getInitials(task.assignee.name)}</AvatarFallback>
          </Avatar>
        )}
        <Badge variant="outline" className="text-[10px]">
          {t(`tasks.status.${task.status}`)}
        </Badge>
      </div>
      {task.children?.map((child) => (
        <TaskRow key={child.id} task={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface EventDetailModalProps {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailModal({ eventId, open, onOpenChange }: EventDetailModalProps) {
  const { t } = useTranslation();
  const { formatDateTime, formatTime, formatCurrency } = useFormatters();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string | undefined>();
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<EventItemType>('buy');
  const [newItemAssigneeId, setNewItemAssigneeId] = useState<string | undefined>();

  const { data: detail, isLoading } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => api.getEventDetail(eventId!),
    enabled: !!eventId && open,
  });

  const people = useMemo(
    () => (detail ? getEventPeople(detail, currentUser) : []),
    [detail, currentUser],
  );

  const myItems = useMemo(
    () =>
      detail?.items.filter((item) => item.assigneeId && item.assigneeId === currentUser?.id) ?? [],
    [detail, currentUser],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const [settlingShareId, setSettlingShareId] = useState<string | null>(null);

  const settleShareMutation = useMutation({
    mutationFn: ({ expenseId, shareId }: { expenseId: string; shareId: string }) =>
      api.settleExpenseShare(expenseId, shareId, true),
    onMutate: ({ shareId }) => setSettlingShareId(shareId),
    onSettled: () => setSettlingShareId(null),
    onSuccess: invalidate,
  });

  const addExpenseMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      amount: number;
      paidById: string;
      shares: { userId: string; amountOwed: number }[];
    }) =>
      api.addEventExpense(eventId!, {
        ...payload,
        date: new Date().toISOString(),
      }),
    onSuccess: invalidate,
  });

  const addTaskMutation = useMutation({
    mutationFn: (payload: { title: string; assigneeId?: string }) =>
      api.addEventTask(eventId!, payload),
    onSuccess: () => {
      setNewTaskTitle('');
      setNewTaskAssigneeId(undefined);
      invalidate();
    },
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      api.addEventItem(eventId!, {
        title: newItemTitle,
        type: newItemType,
        assigneeId: newItemAssigneeId,
      }),
    onSuccess: () => {
      setNewItemTitle('');
      setNewItemAssigneeId(undefined);
      invalidate();
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      api.updateEventItem(eventId!, itemId, { done }),
    onSuccess: invalidate,
  });

  const assignItemMutation = useMutation({
    mutationFn: ({ itemId, assigneeId }: { itemId: string; assigneeId?: string }) =>
      api.updateEventItem(eventId!, itemId, { assigneeId: assigneeId ?? null }),
    onSuccess: invalidate,
  });

  if (!eventId) return null;

  const Icon = detail ? typeIcons[detail.type] : CalendarDays;
  const color = detail?.calendar?.color ?? '#6366f1';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !detail ? (
          <div className="py-12 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl">{detail.title}</DialogTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge style={{ backgroundColor: `${color}20`, color }}>
                      {t(`eventHub.types.${detail.type}`)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {detail.allDay
                        ? `${formatDateTime(detail.startDate).split(',')[0]} · ${t('calendar.allDay')}`
                        : `${formatDateTime(detail.startDate)} – ${formatTime(detail.endDate)}`}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {(detail.description || detail.location) && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {detail.description && <p>{detail.description}</p>}
                {detail.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {detail.location}
                  </p>
                )}
              </div>
            )}

            {detail.participants && detail.participants.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {detail.participants.map((p) => (
                    <Avatar key={p.id} className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={p.user?.avatar ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {p.user ? getInitials(p.user.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {detail.participants.length} {t('eventHub.participants')}
                </span>
              </div>
            )}

            {myItems.length > 0 && (
              <div className="rounded-lg border-2 border-primary/25 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{t('eventHub.yourItems')}</h3>
                </div>
                <div className="space-y-1.5">
                  {myItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md bg-background/80 px-2 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          toggleItemMutation.mutate({ itemId: item.id, done: !item.done })
                        }
                        className="h-4 w-4 rounded"
                      />
                      <span
                        className={cn(
                          'flex-1 text-sm font-medium',
                          item.done && 'line-through opacity-60',
                        )}
                      >
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {t(`eventHub.itemTypes.${item.type}`)}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses — first */}
            <section className="space-y-2">
              <SectionHeader
                icon={Wallet}
                title={t('eventHub.expenses')}
                count={
                  detail.expenses.length > 0
                    ? formatCurrency(detail.stats.expensesTotal)
                    : undefined
                }
              />
              {detail.expenses.length > 0 && (
                <div className="space-y-2">
                  {detail.expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      currentUserId={currentUser?.id ?? ''}
                      compact
                      onSettleShare={(expenseId, shareId) =>
                        settleShareMutation.mutate({ expenseId, shareId })
                      }
                      settlingShareId={
                        settleShareMutation.isPending ? settlingShareId : null
                      }
                    />
                  ))}
                </div>
              )}
              <ExpenseSplitForm
                extraParticipants={people}
                currentUserId={currentUser?.id ?? ''}
                onSubmit={(data) => addExpenseMutation.mutate(data)}
                isPending={addExpenseMutation.isPending}
                submitLabel={t('eventHub.addExpense')}
              />
            </section>

            {/* Tasks */}
            <section className="space-y-2">
              <SectionHeader
                icon={CheckSquare}
                title={t('eventHub.tasks')}
                count={`${detail.stats.tasksDone}/${detail.stats.tasksTotal}`}
              />
              {detail.tasks.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">{t('eventHub.noTasks')}</p>
              ) : (
                <div className="rounded-lg border p-2">
                  {detail.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Input
                  className="min-w-[140px] flex-1"
                  placeholder={t('eventHub.addTask')}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    newTaskTitle &&
                    addTaskMutation.mutate({ title: newTaskTitle, assigneeId: newTaskAssigneeId })
                  }
                />
                {people.length > 0 && (
                  <AssigneeSelect
                    people={people}
                    value={newTaskAssigneeId}
                    onChange={setNewTaskAssigneeId}
                    className="w-36"
                  />
                )}
                <Button
                  size="icon"
                  disabled={!newTaskTitle || addTaskMutation.isPending}
                  onClick={() =>
                    addTaskMutation.mutate({ title: newTaskTitle, assigneeId: newTaskAssigneeId })
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>

            {/* Checklist */}
            <section className="space-y-2">
              <SectionHeader
                icon={ShoppingBag}
                title={t('eventHub.items')}
                count={`${detail.stats.itemsDone}/${detail.stats.itemsTotal}`}
              />
              {detail.items.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">{t('eventHub.noItems')}</p>
              ) : (
                <div className="space-y-1">
                  {detail.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border p-2 hover:bg-accent/30"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          toggleItemMutation.mutate({ itemId: item.id, done: !item.done })
                        }
                        className="h-4 w-4 shrink-0 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            item.done && 'line-through opacity-60',
                          )}
                        >
                          {item.title}
                        </p>
                        <Badge variant="outline" className="mt-0.5 text-[10px]">
                          {t(`eventHub.itemTypes.${item.type}`)}
                        </Badge>
                      </div>
                      {people.length > 0 ? (
                        <AssigneeSelect
                          people={people}
                          value={item.assigneeId ?? undefined}
                          onChange={(assigneeId) =>
                            assignItemMutation.mutate({ itemId: item.id, assigneeId })
                          }
                          className="w-32 shrink-0"
                        />
                      ) : (
                        item.assignee && (
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={item.assignee.avatar ?? undefined} />
                            <AvatarFallback className="text-[8px]">
                              {getInitials(item.assignee.name)}
                            </AvatarFallback>
                          </Avatar>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Select
                  value={newItemType}
                  onValueChange={(v) => setNewItemType(v as EventItemType)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">{t('eventHub.itemTypes.buy')}</SelectItem>
                    <SelectItem value="bring">{t('eventHub.itemTypes.bring')}</SelectItem>
                    <SelectItem value="reminder">{t('eventHub.itemTypes.reminder')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="min-w-[120px] flex-1"
                  placeholder={t('eventHub.addItem')}
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newItemTitle && addItemMutation.mutate()}
                />
                {people.length > 0 && (
                  <AssigneeSelect
                    people={people}
                    value={newItemAssigneeId}
                    onChange={setNewItemAssigneeId}
                    className="w-36"
                  />
                )}
                <Button
                  size="icon"
                  disabled={!newItemTitle || addItemMutation.isPending}
                  onClick={() => addItemMutation.mutate()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
