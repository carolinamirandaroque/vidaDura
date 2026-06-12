import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { ContactMultiSelect } from '@/components/shared/ContactMultiSelect';
import { DatePickerField } from '@/components/shared/DatePickerField';
import { DateTimePickerField } from '@/components/shared/DateTimePickerField';
import {
  getViewRange,
  navigateDate,
  formatViewTitle,
  resolveAllDayEventDates,
  resolveDueDate,
  resolveEventDates,
} from '@/lib/calendar';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lifehub/ui';
import { expandRecurringEvents, parseRecurrenceInstanceId } from '@lifehub/utils';
import type { Event, EventView, HubEventType, RecurrenceType } from '@lifehub/types';
import { HUB_EVENT_TYPES, getEventTypeColor } from '@/lib/event-types';

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const [view, setView] = useState<EventView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'appointment' | 'deadline'>('appointment');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: '',
    endDate: '',
    calendarId: '',
    type: 'social' as HubEventType,
    participantIds: [] as string[],
    recurrence: 'none' as RecurrenceType,
    recurrenceEnd: '',
    dueDate: '',
    allDay: false,
  });
  const queryClient = useQueryClient();

  const { start, end } = getViewRange(view, currentDate);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', view, start.toISOString(), end.toISOString()],
    queryFn: () => api.getEvents(start.toISOString(), end.toISOString()),
  });

  const displayEvents = useMemo(
    () => expandRecurringEvents(events, start, end),
    [events, start, end],
  );

  const { data: calendars, isLoading: loadingCalendars } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => api.getCalendars(),
  });

  const createMutation = useMutation({
    mutationFn: ({
      createKind: kind,
      ...dto
    }: {
      createKind: 'appointment' | 'deadline';
      title: string;
      calendarId: string;
      startDate: string;
      endDate: string;
      type?: HubEventType;
      recurrence?: RecurrenceType;
      recurrenceEnd?: string;
      participantIds?: string[];
      allDay?: boolean;
    }) =>
      kind === 'deadline'
        ? api.createDeadline({
            calendarId: dto.calendarId,
            title: dto.title,
            startDate: dto.startDate,
            endDate: dto.endDate,
            recurrence: dto.recurrence,
            recurrenceEnd: dto.recurrenceEnd,
          })
        : api.createEvent({
            title: dto.title,
            calendarId: dto.calendarId,
            startDate: dto.startDate,
            endDate: dto.endDate,
            allDay: dto.allDay,
            type: dto.type,
            recurrence: dto.recurrence,
            recurrenceEnd: dto.recurrenceEnd,
            participantIds: dto.participantIds,
          }),
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      setNewEvent({
        title: '',
        startDate: '',
        endDate: '',
        calendarId: '',
        type: 'social',
        participantIds: [],
        recurrence: 'none',
        recurrenceEnd: '',
        dueDate: '',
        allDay: false,
      });
      setCreateKind('appointment');
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(navigateDate(view, currentDate, dir));
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const handleEventClick = (event: Event) => {
    const { seriesId, occurrenceAt } = parseRecurrenceInstanceId(event.id);
    setSelectedEventId(seriesId);
    setSelectedOccurrenceDate((occurrenceAt ?? new Date(event.startDate)).toISOString());
    setDetailOpen(true);
  };

  if (isLoading) return <PageLoading />;

  return (
    <PageShell width="full">
      <PageHeader
        title={t('calendar.title')}
        meta={<span className="capitalize">{formatViewTitle(view, currentDate, locale)}</span>}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                {t('common.today')}
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setCreateKind('appointment');
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> {t('calendar.addEvent')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setCreateKind('deadline');
                setDialogOpen(true);
              }}
            >
              <Bell className="mr-2 h-4 w-4" /> {t('calendar.addDeadline')}
            </Button>
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {createKind === 'deadline'
                    ? t('calendar.newDeadline')
                    : t('calendar.newEvent')}
                </DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = newEvent.title.trim();
                  if (!title) {
                    setCreateError(t('eventHub.titleRequired'));
                    return;
                  }
                  const calendarId = newEvent.calendarId || calendars?.[0]?.id;
                  if (!calendarId) {
                    setCreateError(t('calendar.noCalendar'));
                    return;
                  }
                  try {
                    const dates =
                      createKind === 'deadline'
                        ? resolveDueDate(newEvent.dueDate)
                        : newEvent.allDay
                          ? resolveAllDayEventDates(newEvent.startDate, newEvent.endDate)
                          : resolveEventDates(newEvent.startDate, newEvent.endDate);
                    createMutation.mutate({
                      createKind,
                      title,
                      type: newEvent.type,
                      calendarId,
                      startDate: dates.startDate,
                      endDate: dates.endDate,
                      allDay: createKind === 'appointment' ? newEvent.allDay : undefined,
                      recurrence: newEvent.recurrence,
                      recurrenceEnd: newEvent.recurrenceEnd.trim()
                        ? new Date(newEvent.recurrenceEnd).toISOString()
                        : undefined,
                      participantIds:
                        createKind === 'appointment' && newEvent.participantIds.length > 0
                          ? newEvent.participantIds
                          : undefined,
                    });
                  } catch {
                    setCreateError(t('eventHub.deadlineDateRequired'));
                  }
                }}
              >
                {createKind === 'appointment' && (
                  <div className="space-y-2">
                    <Label>{t('eventHub.type')}</Label>
                    <Select
                      value={newEvent.type}
                      onValueChange={(v) => setNewEvent({ ...newEvent, type: v as HubEventType })}
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
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder={
                      createKind === 'deadline'
                        ? t('eventHub.deadlinePlaceholder')
                        : t('eventHub.titlePlaceholder')
                    }
                    required
                  />
                </div>
                {createKind === 'deadline' ? (
                  <div className="space-y-2">
                    <Label>{t('eventHub.dueDate')} *</Label>
                    <DatePickerField
                      value={newEvent.dueDate}
                      onChange={(dueDate) => setNewEvent({ ...newEvent, dueDate })}
                    />
                    <p className="text-xs text-muted-foreground">{t('eventHub.deadlineHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <Label htmlFor="all-day" className="cursor-pointer">
                        {t('calendar.allDay')}
                      </Label>
                      <Switch
                        id="all-day"
                        checked={newEvent.allDay}
                        onCheckedChange={(allDay) =>
                          setNewEvent((prev) => ({
                            ...prev,
                            allDay,
                            startDate: allDay
                              ? prev.startDate.split('T')[0]
                              : prev.startDate
                                ? `${prev.startDate.split('T')[0]}T09:00`
                                : '',
                            endDate: allDay
                              ? prev.endDate.split('T')[0] || prev.startDate.split('T')[0]
                              : prev.endDate
                                ? `${prev.endDate.split('T')[0]}T10:00`
                                : '',
                          }))
                        }
                      />
                    </div>
                    {newEvent.allDay ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t('common.start')}</Label>
                          <DatePickerField
                            value={newEvent.startDate.split('T')[0]}
                            onChange={(startDate) =>
                              setNewEvent({ ...newEvent, startDate: startDate })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('common.end')}</Label>
                          <DatePickerField
                            value={(newEvent.endDate || newEvent.startDate).split('T')[0]}
                            onChange={(endDate) => setNewEvent({ ...newEvent, endDate: endDate })}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>{t('common.start')}</Label>
                          <DateTimePickerField
                            value={newEvent.startDate}
                            onChange={(startDate) => setNewEvent({ ...newEvent, startDate })}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t('eventHub.datesOptionalHint')}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('common.end')}</Label>
                          <DateTimePickerField
                            value={newEvent.endDate}
                            onChange={(endDate) => setNewEvent({ ...newEvent, endDate })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('eventHub.recurrence.label')}</Label>
                  <Select
                    value={newEvent.recurrence}
                    onValueChange={(v) =>
                      setNewEvent({ ...newEvent, recurrence: v as RecurrenceType })
                    }
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
                {newEvent.recurrence !== 'none' && (
                  <div className="space-y-2">
                    <Label>{t('eventHub.recurrence.endLabel')}</Label>
                    <DatePickerField
                      value={newEvent.recurrenceEnd}
                      onChange={(recurrenceEnd) => setNewEvent({ ...newEvent, recurrenceEnd })}
                    />
                    <p className="text-xs text-muted-foreground">{t('eventHub.recurrence.hint')}</p>
                  </div>
                )}
                {createKind === 'appointment' && (
                  <div className="space-y-2">
                    <Label>{t('eventHub.inviteContacts')}</Label>
                    <ContactMultiSelect
                      currentUserId={currentUser?.id}
                      selectedIds={newEvent.participantIds}
                      onChange={(participantIds) => setNewEvent({ ...newEvent, participantIds })}
                    />
                  </div>
                )}
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || loadingCalendars}
                >
                  {t('common.create')}
                </Button>
              </form>
            </DialogContent>
      </Dialog>

      <Tabs value={view} onValueChange={(v) => setView(v as EventView)}>
        <TabsList>
          <TabsTrigger value="day">{t('calendar.views.day')}</TabsTrigger>
          <TabsTrigger value="week">{t('calendar.views.week')}</TabsTrigger>
          <TabsTrigger value="month">{t('calendar.views.month')}</TabsTrigger>
          <TabsTrigger value="agenda">{t('calendar.views.agenda')}</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          <MonthGrid
            currentDate={currentDate}
            events={displayEvents}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <WeekGrid
            currentDate={currentDate}
            events={displayEvents}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="day" className="mt-4">
          <DayView currentDate={currentDate} events={displayEvents} onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <AgendaView currentDate={currentDate} events={displayEvents} onEventClick={handleEventClick} />
        </TabsContent>
      </Tabs>

      <EventDetailModal
        eventId={selectedEventId}
        occurrenceDate={selectedOccurrenceDate}
        open={detailOpen}
        onOpenChange={(nextOpen) => {
          setDetailOpen(nextOpen);
          if (!nextOpen) setSelectedOccurrenceDate(null);
        }}
      />
    </PageShell>
  );
}
