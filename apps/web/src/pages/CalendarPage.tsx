import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Bell,
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Grid3x3,
  List,
  ChevronDown,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import {
  getViewRange,
  navigateDate,
  formatViewTitle,
  eventsForDay,
  getWeekDays,
} from '@/lib/calendar';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { DayView } from '@/components/calendar/DayView';
import { AgendaView } from '@/components/calendar/AgendaView';
import { YearGrid } from '@/components/calendar/YearGrid';
import { EventDetailModal } from '@/components/calendar/EventDetailModal';
import { CalendarToolbar } from '@/components/calendar/CalendarToolbar';
import {
  CalendarCreateDialog,
  buildCalendarCreatePayload,
  createEmptyCalendarForm,
  createFormForDate,
  type CalendarCreateFormState,
} from '@/components/calendar/CalendarCreateDialog';
import { CalendarDayActionDialog } from '@/components/calendar/CalendarDayActionDialog';
import {
  HubHint,
  HubMetricCard,
  HubSection,
  SectionChipTabs,
  hubSectionClass,
} from '@/components/hub';
import { expandRecurringEvents, parseRecurrenceInstanceId } from '@lifehub/utils';
import type { Event, EventView, HubEventType, RecurrenceType } from '@lifehub/types';

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
  const [newEvent, setNewEvent] = useState<CalendarCreateFormState>(createEmptyCalendarForm());
  const [dayActionDate, setDayActionDate] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventId = searchParams.get('event');
    if (!eventId) return;

    const occursOn = searchParams.get('occursOn');
    setSelectedEventId(eventId);
    setSelectedOccurrenceDate(occursOn);
    setDetailOpen(true);

    if (occursOn) {
      const date = new Date(occursOn);
      if (!Number.isNaN(date.getTime())) {
        setCurrentDate(date);
        setView('day');
      }
    }

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const today = useMemo(() => new Date(), []);
  const todayCount = useMemo(
    () => eventsForDay(displayEvents, today).length,
    [displayEvents, today],
  );
  const weekCount = useMemo(() => {
    const days = getWeekDays(currentDate);
    return days.reduce((sum, { date }) => sum + eventsForDay(displayEvents, date).length, 0);
  }, [displayEvents, currentDate]);

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
      location?: string;
      locationLat?: number | null;
      locationLng?: number | null;
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
            location: dto.location,
            locationLat: dto.locationLat,
            locationLng: dto.locationLng,
          }),
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      setNewEvent(createEmptyCalendarForm());
      setCreateKind('appointment');
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const navigate = (dir: -1 | 1) => {
    setCurrentDate(navigateDate(view, currentDate, dir));
  };

  const openCreateDialog = (kind: 'appointment' | 'deadline', date?: Date) => {
    setCreateKind(kind);
    setNewEvent(date ? createFormForDate(date, kind) : createEmptyCalendarForm());
    setCreateError(null);
    setDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    try {
      const payload = buildCalendarCreatePayload(createKind, newEvent, calendars);
      createMutation.mutate(payload);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'title') {
          setCreateError(t('eventHub.titleRequired'));
          return;
        }
        if (error.message === 'calendar') {
          setCreateError(t('calendar.noCalendar'));
          return;
        }
      }
      setCreateError(t('eventHub.deadlineDateRequired'));
    }
  };

  const handleDayClick = (date: Date) => {
    setDayActionDate(date);
  };

  const handleMonthClick = (date: Date) => {
    setCurrentDate(date);
    setView('month');
  };

  const handleViewDay = () => {
    if (!dayActionDate) return;
    setCurrentDate(dayActionDate);
    setView('day');
    setDayActionDate(null);
  };

  const handleAddFromDay = (kind: 'appointment' | 'deadline') => {
    if (!dayActionDate) return;
    const date = dayActionDate;
    setDayActionDate(null);
    openCreateDialog(kind, date);
  };

  const handleEventClick = (event: Event) => {
    const { seriesId, occurrenceAt } = parseRecurrenceInstanceId(event.id);
    setSelectedEventId(seriesId);
    setSelectedOccurrenceDate((occurrenceAt ?? new Date(event.startDate)).toISOString());
    setDetailOpen(true);
  };

  if (isLoading) return <PageLoading />;

  const viewTabs = [
    {
      id: 'year' as const,
      label: t('calendar.views.year'),
      icon: <Grid3x3 className="h-3.5 w-3.5" />,
    },
    {
      id: 'month' as const,
      label: t('calendar.views.month'),
      icon: <LayoutGrid className="h-3.5 w-3.5" />,
    },
    {
      id: 'week' as const,
      label: t('calendar.views.week'),
      icon: <CalendarRange className="h-3.5 w-3.5" />,
    },
    {
      id: 'day' as const,
      label: t('calendar.views.day'),
      icon: <CalendarDays className="h-3.5 w-3.5" />,
    },
    {
      id: 'agenda' as const,
      label: t('calendar.views.agenda'),
      icon: <List className="h-3.5 w-3.5" />,
    },
  ];

  const sectionTitle =
    view === 'year'
      ? t('calendar.sectionYear')
      : view === 'month'
        ? t('calendar.sectionMonth')
        : view === 'week'
          ? t('calendar.sectionWeek')
          : view === 'day'
            ? t('calendar.sectionDay')
            : t('calendar.sectionAgenda');

  const hintText =
    view === 'year' ? t('calendar.hintYear') : t('calendar.hint');

  return (
    <PageShell width="full" className="pb-6">
      <PageHeader
        title={t('calendar.title')}
        subtitle={t('calendar.subtitle')}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('calendar.add')}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openCreateDialog('appointment')}>
                <CalendarDays className="mr-2 h-4 w-4" />
                {t('calendar.addEvent')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openCreateDialog('deadline')}>
                <Bell className="mr-2 h-4 w-4" />
                {t('calendar.addDeadline')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className={hubSectionClass}>
        <SectionChipTabs
          tabs={viewTabs}
          activeId={view}
          onChange={(id) => setView(id as EventView)}
        />

        <CalendarToolbar
          title={formatViewTitle(view, currentDate, locale)}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setCurrentDate(new Date())}
          todayLabel={t('common.today')}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <HubMetricCard label={t('calendar.todayMetric')} value={String(todayCount)} />
          <HubMetricCard
            label={t('calendar.weekMetric')}
            value={String(weekCount)}
          />
        </div>

        <HubHint>{hintText}</HubHint>

        <HubSection icon={CalendarDays} title={sectionTitle}>
          {view === 'year' && (
            <YearGrid
              currentDate={currentDate}
              events={displayEvents}
              onMonthClick={handleMonthClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'month' && (
            <MonthGrid
              currentDate={currentDate}
              events={displayEvents}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'week' && (
            <WeekGrid
              currentDate={currentDate}
              events={displayEvents}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={displayEvents}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={displayEvents}
              onEventClick={handleEventClick}
            />
          )}
        </HubSection>
      </div>

      <CalendarDayActionDialog
        date={dayActionDate}
        onOpenChange={(open) => {
          if (!open) setDayActionDate(null);
        }}
        onViewDay={handleViewDay}
        onAddEvent={() => handleAddFromDay('appointment')}
        onAddDeadline={() => handleAddFromDay('deadline')}
      />

      <CalendarCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        createKind={createKind}
        form={newEvent}
        onFormChange={setNewEvent}
        currentUserId={currentUser?.id}
        isPending={createMutation.isPending}
        loadingCalendars={loadingCalendars}
        error={createError}
        onSubmit={handleCreateSubmit}
      />

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
