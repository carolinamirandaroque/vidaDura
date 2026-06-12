import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Users,
  CheckSquare,
  Wallet,
  ShoppingBag,
  Briefcase,
  Landmark,
  PartyPopper,
  Trophy,
  GraduationCap,
  Cpu,
  Heart,
  Church,
  CalendarDays,
  Package,
  Trash2,
  Bell,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { EntityAccessPanel } from '@/components/shared/EntityAccessPanel';
import { buildEventAccessEntries } from '@/lib/entity-access';
import { ExpenseSplitForm } from '@/components/expenses/ExpenseSplitForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { getDeadlineColor, isDeadline, isDeadlineOverdue } from '@lifehub/utils';
import { resolveDueDate, resolveEventDates, toDatetimeLocalValue } from '@/lib/calendar';
import { HUB_EVENT_TYPES, getEventTypeColor } from '@/lib/event-types';
import { ContactMultiSelect } from '@/components/shared/ContactMultiSelect';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { DateTimePickerField } from '@/components/shared/DateTimePickerField';
import {
  HubSection,
  HubAddRow,
  ShoppingHubRow,
  hubEmptyClass,
  hubListClass,
} from '@/components/hub';
import { TaskTree } from '@/components/tasks/TaskTree';
import { AssigneePicker } from '@/components/tasks/AssigneePicker';
import type {
  HubEventType,
  RecurrenceType,
  TaskStatus,
  User,
  EventDetail,
  ShoppingListItem,
} from '@lifehub/types';

const typeIcons: Record<HubEventType, typeof CalendarDays> = {
  social: Users,
  corporate: Briefcase,
  cultural: Landmark,
  entertainment: PartyPopper,
  sports: Trophy,
  educational: GraduationCap,
  technological: Cpu,
  charitable: Heart,
  religious: Church,
  other: CalendarDays,
};

function getEventPeople(detail: EventDetail, currentUser?: User | null): User[] {
  const map = new Map<string, User>();
  if (detail.createdBy) map.set(detail.createdBy.id, detail.createdBy);
  detail.participants?.forEach((p) => {
    if (p.user) map.set(p.user.id, p.user);
  });
  if (currentUser) map.set(currentUser.id, currentUser);
  return Array.from(map.values());
}

interface EventDetailModalProps {
  eventId: string | null;
  occurrenceDate?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailModal({
  eventId,
  occurrenceDate,
  open,
  onOpenChange,
}: EventDetailModalProps) {
  const { t } = useTranslation();
  const { formatDateTime, formatTime, formatCurrency } = useFormatters();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAssigneeId, setNewItemAssigneeId] = useState<string | undefined>();
  const [inviteIds, setInviteIds] = useState<string[]>([]);
  const [editType, setEditType] = useState<HubEventType>('social');
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>('none');
  const [editRecurrenceEnd, setEditRecurrenceEnd] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [detailsError, setDetailsError] = useState<string | null>(null);

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

  const isCreator = detail?.createdById === currentUser?.id;
  const isParticipant = useMemo(
    () => detail?.participants?.some((p) => p.userId === currentUser?.id) ?? false,
    [detail, currentUser?.id],
  );
  const isCollaborator = useMemo(() => {
    if (!detail || !currentUser?.id) return false;
    return detail.createdById === currentUser.id || isParticipant;
  }, [detail, currentUser?.id, isParticipant]);
  const canLeaveEvent = isCreator || isParticipant;
  const accessEntries = useMemo(
    () => (detail ? buildEventAccessEntries(detail) : []),
    [detail],
  );
  useEffect(() => {
    if (detail?.participants) {
      setInviteIds(detail.participants.map((p) => p.userId));
    }
  }, [detail?.id, detail?.participants]);

  useEffect(() => {
    if (detail) {
      setEditType(detail.type);
      setEditTitle(detail.title);
      setEditStart(toDatetimeLocalValue(detail.startDate));
      setEditEnd(toDatetimeLocalValue(detail.endDate));
      setEditRecurrence(detail.recurrence);
      setEditRecurrenceEnd(
        detail.recurrenceEnd ? detail.recurrenceEnd.slice(0, 10) : '',
      );
      setEditDueDate(detail.endDate.slice(0, 10));
      setDetailsError(null);
    }
  }, [
    detail?.id,
    detail?.type,
    detail?.title,
    detail?.startDate,
    detail?.endDate,
    detail?.recurrence,
    detail?.recurrenceEnd,
  ]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const [settlingShareId, setSettlingShareId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);

  const updateExpenseMutation = useMutation({
    mutationFn: ({ expenseId, amount }: { expenseId: string; amount: number }) =>
      api.updateExpense(expenseId, { amount }),
    onMutate: ({ expenseId }) => setUpdatingExpenseId(expenseId),
    onSettled: () => setUpdatingExpenseId(null),
    onSuccess: invalidate,
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: api.deleteExpense,
    onMutate: (id) => setDeletingExpenseId(id),
    onSettled: () => setDeletingExpenseId(null),
    onSuccess: invalidate,
  });

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
    mutationFn: (payload: { title: string; parentTaskId?: string }) =>
      api.addEventTask(eventId!, payload),
    onSuccess: invalidate,
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      api.addEventItem(eventId!, {
        title: newItemTitle,
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
    mutationFn: ({ itemId, assigneeId }: { itemId: string; assigneeId?: string | null }) =>
      api.updateEventItem(eventId!, itemId, { assigneeId: assigneeId ?? null }),
    onSuccess: async (_, { assigneeId, itemId }) => {
      if (assigneeId && assigneeId !== currentUser?.id) {
        queryClient.setQueryData<ShoppingListItem[]>(
          ['shopping-list', currentUser?.id],
          (old) => old?.filter((row) => row.eventItemId !== itemId) ?? [],
        );
      }
      await queryClient.refetchQueries({ queryKey: ['shopping-list'] });
      invalidate();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      title,
      status,
      assigneeId,
    }: {
      taskId: string;
      title?: string;
      status?: TaskStatus;
      assigneeId?: string | null;
    }) => api.updateEventTask(eventId!, taskId, { title, status, assigneeId }),
    onSuccess: async (_, vars) => {
      if (vars.assigneeId !== undefined) {
        await queryClient.refetchQueries({ queryKey: ['tasks'] });
      }
      invalidate();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteEventTask(eventId!, taskId),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['tasks'] });
      invalidate();
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: api.reorderTasks,
    onSuccess: invalidate,
    onError: invalidate,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      itemId,
      title,
      done,
      assigneeId,
    }: {
      itemId: string;
      title?: string;
      done?: boolean;
      assigneeId?: string | null;
    }) => api.updateEventItem(eventId!, itemId, { title, done, assigneeId }),
    onSuccess: invalidate,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.deleteEventItem(eventId!, itemId),
    onSuccess: invalidate,
  });

  const [removingParticipantId, setRemovingParticipantId] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (participantIds: string[]) =>
      api.updateEvent(eventId!, { participantIds }),
    onSuccess: invalidate,
  });

  const handleRemoveParticipant = (userId: string, name: string) => {
    if (!window.confirm(t('eventHub.removeParticipantConfirm', { name }))) return;
    const next = inviteIds.filter((id) => id !== userId);
    setInviteIds(next);
    setRemovingParticipantId(userId);
    inviteMutation.mutate(next, { onSettled: () => setRemovingParticipantId(null) });
  };

  const completeDeadlineMutation = useMutation({
    mutationFn: () => api.completeDeadline(eventId!),
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
    },
  });

  const updateDetailsMutation = useMutation({
    mutationFn: () => {
      const title = editTitle.trim();
      if (!title) throw new Error(t('eventHub.titleRequired'));
      const isDeadlineEvent = detail?.kind === 'deadline';
      const dates = isDeadlineEvent
        ? resolveDueDate(editDueDate)
        : resolveEventDates(editStart, editEnd);
      return api.updateEvent(eventId!, {
        title,
        type: isDeadlineEvent ? undefined : editType,
        startDate: dates.startDate,
        endDate: dates.endDate,
        recurrence: editRecurrence,
        recurrenceEnd:
          editRecurrence === 'none'
            ? null
            : editRecurrenceEnd.trim()
              ? new Date(editRecurrenceEnd).toISOString()
              : null,
      });
    },
    onSuccess: () => {
      setDetailsError(null);
      invalidate();
    },
    onError: (err: Error) => setDetailsError(err.message),
  });

  const closeAndRefreshEvents = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    onOpenChange(false);
  };

  const deleteEventMutation = useMutation({
    mutationFn: () => api.deleteEvent(eventId!),
    onSuccess: closeAndRefreshEvents,
  });

  const deleteOccurrenceMutation = useMutation({
    mutationFn: (date: string) => api.deleteEventOccurrence(eventId!, date),
    onSuccess: closeAndRefreshEvents,
  });

  const leaveEventMutation = useMutation({
    mutationFn: () => api.leaveEvent(eventId!),
    onSuccess: closeAndRefreshEvents,
  });

  if (!eventId) return null;

  const isDeadlineEvent = detail ? isDeadline(detail) : false;
  const displayType = isCollaborator && !isDeadlineEvent ? editType : detail?.type ?? 'social';
  const Icon = detail ? (isDeadlineEvent ? Bell : typeIcons[displayType]) : CalendarDays;
  const color = detail
    ? isDeadlineEvent
      ? getDeadlineColor(detail)
      : getEventTypeColor(displayType)
    : '#f97316';
  const overdue = detail && isDeadlineOverdue(detail);
  const resolvedOccurrenceDate = occurrenceDate ?? detail?.endDate ?? null;
  const occurrenceLabel = resolvedOccurrenceDate
    ? formatDateTime(resolvedOccurrenceDate).split(',')[0]
    : '';

  const confirmDeleteSeries = () => {
    if (!detail) return;
    const hasOthers = detail.participants?.some((p) => p.userId !== currentUser?.id) ?? false;
    const message = isDeadlineEvent
      ? t('eventHub.deleteDeadlineSeriesConfirm', { title: detail.title })
      : t(
          hasOthers ? 'eventHub.deleteEventConfirmWithOthers' : 'eventHub.deleteEventConfirm',
          {
            title: detail.title,
            tasks: detail.stats.tasksTotal,
            items: detail.stats.itemsTotal,
            expenses: detail.expenses.length,
          },
        );
    if (window.confirm(message)) {
      deleteEventMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {isLoading || !detail ? (
          <>
            <VisuallyHidden>
              <DialogTitle>{t('common.loading')}</DialogTitle>
            </VisuallyHidden>
            <div className="py-12 text-center text-muted-foreground">{t('common.loading')}</div>
          </>
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
                  {isCollaborator ? (
                    <DialogTitle className="text-left text-xl">
                      {isDeadlineEvent ? t('eventHub.editDeadline') : t('eventHub.editEvent')}
                    </DialogTitle>
                  ) : (
                    <>
                      <DialogTitle className="text-xl">{detail.title}</DialogTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {isDeadlineEvent ? (
                          <Badge style={{ backgroundColor: `${color}20`, color }}>
                            {t('eventHub.deadline')}
                          </Badge>
                        ) : (
                          <Badge style={{ backgroundColor: `${color}20`, color }}>
                            {t(`eventHub.types.${detail.type}`)}
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="destructive">{t('eventHub.overdue')}</Badge>
                        )}
                        {detail.recurrence !== 'none' && (
                          <Badge variant="outline">
                            {t(`eventHub.recurrence.${detail.recurrence}`)}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {isDeadlineEvent
                            ? `${t('eventHub.dueBy')} ${formatDateTime(detail.endDate).split(',')[0]}`
                            : detail.allDay
                              ? `${formatDateTime(detail.startDate).split(',')[0]} · ${t('calendar.allDay')}`
                              : `${formatDateTime(detail.startDate)} – ${formatTime(detail.endDate)}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canLeaveEvent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground"
                      disabled={leaveEventMutation.isPending}
                      title={t('eventHub.leaveEvent')}
                      onClick={() => {
                        const hasOtherParticipants =
                          (detail.participants?.some((p) => p.userId !== currentUser?.id) ??
                            false);
                        const message =
                          isCreator && hasOtherParticipants
                            ? t('eventHub.leaveEventConfirmCreator')
                            : t('eventHub.leaveEventConfirm');
                        if (window.confirm(message)) {
                          leaveEventMutation.mutate();
                        }
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                  {isCollaborator && isDeadlineEvent && detail.recurrence !== 'none' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={
                            deleteEventMutation.isPending || deleteOccurrenceMutation.isPending
                          }
                          title={t('eventHub.deleteDeadline')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!resolvedOccurrenceDate}
                          onClick={() => {
                            if (!resolvedOccurrenceDate) return;
                            const message = t('eventHub.deleteDeadlineOccurrenceConfirm', {
                              title: detail.title,
                              date: occurrenceLabel,
                            });
                            if (window.confirm(message)) {
                              deleteOccurrenceMutation.mutate(resolvedOccurrenceDate);
                            }
                          }}
                        >
                          {t('eventHub.deleteDeadlineOccurrence', { date: occurrenceLabel })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={confirmDeleteSeries}
                        >
                          {t('eventHub.deleteDeadlineSeries')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    isCollaborator && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteEventMutation.isPending}
                        title={t(isDeadlineEvent ? 'eventHub.deleteDeadline' : 'eventHub.deleteEvent')}
                        onClick={confirmDeleteSeries}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )
                  )}
                </div>
              </div>
            </DialogHeader>

            {accessEntries.length > 0 && !isCreator && (
              <EntityAccessPanel entries={accessEntries} />
            )}

            {isCollaborator && (
              <div className="space-y-3 rounded-lg border p-3">
                {!isDeadlineEvent && (
                  <div className="space-y-2">
                    <Label>{t('eventHub.type')}</Label>
                    <Select
                      value={editType}
                      onValueChange={(v) => setEditType(v as HubEventType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HUB_EVENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: getEventTypeColor(type) }}
                              />
                              {t(`eventHub.types.${type}`)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('common.title')} *</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('eventHub.titlePlaceholder')}
                  />
                </div>
                {isDeadlineEvent ? (
                  <div className="space-y-2">
                    <Label>{t('eventHub.dueDate')} *</Label>
                    <DatePickerField value={editDueDate} onChange={setEditDueDate} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>{t('common.start')}</Label>
                      <DateTimePickerField value={editStart} onChange={setEditStart} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.end')}</Label>
                      <DateTimePickerField value={editEnd} onChange={setEditEnd} />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('eventHub.recurrence.label')}</Label>
                  <Select
                    value={editRecurrence}
                    onValueChange={(v) => setEditRecurrence(v as RecurrenceType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {t(`eventHub.recurrence.${value}`)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {editRecurrence !== 'none' && (
                  <div className="space-y-2">
                    <Label>{t('eventHub.recurrence.endLabel')}</Label>
                    <DatePickerField value={editRecurrenceEnd} onChange={setEditRecurrenceEnd} />
                    <p className="text-xs text-muted-foreground">{t('eventHub.recurrence.hint')}</p>
                  </div>
                )}
                {detailsError && <p className="text-sm text-destructive">{detailsError}</p>}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={updateDetailsMutation.isPending}
                  onClick={() => updateDetailsMutation.mutate()}
                >
                  {t('eventHub.saveDetails')}
                </Button>
                {isDeadlineEvent && detail.deadlineStatus !== 'done' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={completeDeadlineMutation.isPending}
                    onClick={() => completeDeadlineMutation.mutate()}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {t('eventHub.markDeadlineDone')}
                  </Button>
                )}
              </div>
            )}

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

            {isCreator && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{t('eventHub.manageAccess')}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{t('eventHub.manageAccessHint')}</p>
                {accessEntries.length > 0 && (
                  <EntityAccessPanel
                    entries={accessEntries}
                    canManage
                    onRemove={handleRemoveParticipant}
                    removingUserId={removingParticipantId}
                    className="rounded-md border bg-muted/20 p-2"
                  />
                )}
                <ContactMultiSelect
                  currentUserId={currentUser?.id}
                  selectedIds={inviteIds}
                  onChange={setInviteIds}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(inviteIds)}
                >
                  {t('eventHub.saveInvites')}
                </Button>
              </div>
            )}

            {!isDeadlineEvent && myItems.length > 0 && (
              <HubSection icon={Package} title={t('eventHub.yourItems')}>
                <div className={hubListClass}>
                  {myItems.map((item) => (
                    <ShoppingHubRow
                      key={item.id}
                      title={item.title}
                      done={item.done}
                      canEdit={isCollaborator}
                      onToggle={() =>
                        toggleItemMutation.mutate({ itemId: item.id, done: !item.done })
                      }
                      onTitleChange={async (title) => {
                        await updateItemMutation.mutateAsync({ itemId: item.id, title });
                      }}
                    />
                  ))}
                </div>
              </HubSection>
            )}

            {!isDeadlineEvent && (
            <>
            <HubSection
              icon={Wallet}
              title={t('eventHub.expenses')}
              count={
                detail.expenses.length > 0
                  ? formatCurrency(detail.stats.expensesTotal)
                  : undefined
              }
            >
              {detail.expenses.length > 0 ? (
                <div className={hubListClass}>
                  {detail.expenses.map((expense) => (
                    <ExpenseCard
                      key={expense.id}
                      expense={expense}
                      currentUserId={currentUser?.id ?? ''}
                      compact
                      canEditAmount={isCollaborator}
                      onAmountChange={(expenseId, amount) =>
                        updateExpenseMutation.mutate({ expenseId, amount })
                      }
                      updatingAmount={
                        updateExpenseMutation.isPending && updatingExpenseId === expense.id
                      }
                      onSettleShare={(expenseId, shareId) =>
                        settleShareMutation.mutate({ expenseId, shareId })
                      }
                      canDelete={isCollaborator}
                      onDelete={(id) => deleteExpenseMutation.mutate(id)}
                      deleting={
                        deleteExpenseMutation.isPending && deletingExpenseId === expense.id
                      }
                      settlingShareId={
                        settleShareMutation.isPending ? settlingShareId : null
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className={hubEmptyClass}>{t('eventHub.noExpenses')}</p>
              )}
              {isCollaborator && (
                <ExpenseSplitForm
                  extraParticipants={people}
                  currentUserId={currentUser?.id ?? ''}
                  onSubmit={(data) => addExpenseMutation.mutate(data)}
                  isPending={addExpenseMutation.isPending}
                  submitLabel={t('eventHub.addExpense')}
                />
              )}
            </HubSection>

            <HubSection
              icon={CheckSquare}
              title={t('eventHub.tasks')}
              count={`${detail.stats.tasksDone}/${detail.stats.tasksTotal}`}
            >
              {detail.tasks.length === 0 && !isCollaborator ? (
                <p className={hubEmptyClass}>{t('eventHub.noTasks')}</p>
              ) : (
                <TaskTree
                  tasks={detail.tasks}
                  people={people}
                  canEdit={isCollaborator}
                  addPlaceholder={t('eventHub.addTask')}
                  deleteConfirm={t('eventHub.deleteTaskConfirm')}
                  isCreating={addTaskMutation.isPending}
                  onCreate={(payload) => addTaskMutation.mutate(payload)}
                  onStatusChange={(taskId, status) =>
                    updateTaskMutation.mutate({ taskId, status })
                  }
                  onTitleChange={async (taskId, title) => {
                    await updateTaskMutation.mutateAsync({ taskId, title });
                  }}
                  onAssigneeChange={(taskId, assigneeId) =>
                    updateTaskMutation.mutate({ taskId, assigneeId })
                  }
                  onDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
                  onReorder={(updates) => reorderTasksMutation.mutate(updates)}
                  isReordering={reorderTasksMutation.isPending}
                />
              )}
            </HubSection>

            <HubSection
              icon={ShoppingBag}
              title={t('eventHub.shopping')}
              count={`${detail.stats.itemsDone}/${detail.stats.itemsTotal}`}
            >
              {detail.items.length === 0 ? (
                <p className={hubEmptyClass}>{t('eventHub.noShopping')}</p>
              ) : (
                <div className={hubListClass}>
                  {detail.items.map((item) => (
                    <ShoppingHubRow
                      key={item.id}
                      title={item.title}
                      done={item.done}
                      canEdit={isCollaborator}
                      assignee={item.assignee}
                      deleteConfirm={t('eventHub.deleteItemConfirm')}
                      onToggle={() =>
                        toggleItemMutation.mutate({ itemId: item.id, done: !item.done })
                      }
                      onTitleChange={async (title) => {
                        await updateItemMutation.mutateAsync({ itemId: item.id, title });
                      }}
                      onDelete={() => deleteItemMutation.mutate(item.id)}
                      assigneeControl={
                        isCollaborator ? (
                          <AssigneePicker
                            people={people}
                            value={item.assigneeId}
                            onChange={(assigneeId) =>
                              assignItemMutation.mutate({
                                itemId: item.id,
                                assigneeId,
                              })
                            }
                            className="opacity-60 group-hover:opacity-100"
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </div>
              )}
              {isCollaborator && (
                <HubAddRow
                  value={newItemTitle}
                  onChange={setNewItemTitle}
                  placeholder={t('eventHub.addShopping')}
                  isPending={addItemMutation.isPending}
                  onSubmit={() => addItemMutation.mutate()}
                  extra={
                    <AssigneePicker
                      people={people}
                      value={newItemAssigneeId}
                      onChange={(assigneeId) => setNewItemAssigneeId(assigneeId ?? undefined)}
                    />
                  }
                />
              )}
            </HubSection>
            </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
