import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
  DialogTrigger,
  Input,
  Label,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { getViewRange, navigateDate, formatViewTitle } from '@/lib/calendar';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
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
import type { Event, EventView, HubEventType } from '@lifehub/types';

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const [view, setView] = useState<EventView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: '',
    endDate: '',
    calendarId: '',
    type: 'general' as HubEventType,
  });
  const queryClient = useQueryClient();

  const { start, end } = getViewRange(view, currentDate);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', view, start.toISOString(), end.toISOString()],
    queryFn: () => api.getEvents(start.toISOString(), end.toISOString()),
  });

  const { data: calendars, isLoading: loadingCalendars } = useQuery({
    queryKey: ['calendars'],
    queryFn: () => api.getCalendars(),
  });

  const createMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
      setNewEvent({ title: '', startDate: '', endDate: '', calendarId: '', type: 'general' });
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
    setSelectedEventId(event.id);
    setDetailOpen(true);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
          <p className="text-muted-foreground capitalize">{formatViewTitle(view, currentDate, locale)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            {t('common.today')}
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t('calendar.addEvent')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('calendar.newEvent')}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const calendarId = newEvent.calendarId || calendars?.[0]?.id;
                  if (!calendarId) {
                    setCreateError(t('calendar.noCalendar'));
                    return;
                  }
                  createMutation.mutate({
                    title: newEvent.title,
                    type: newEvent.type,
                    calendarId,
                    startDate: new Date(newEvent.startDate).toISOString(),
                    endDate: new Date(newEvent.endDate).toISOString(),
                  });
                }}
              >
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
                      {(['general', 'birthday', 'meeting', 'trip', 'celebration', 'social', 'other'] as HubEventType[]).map(
                        (type) => (
                          <SelectItem key={type} value={type}>
                            {t(`eventHub.types.${type}`)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.title')}</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.start')}</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.end')}</Label>
                  <Input
                    type="datetime-local"
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    required
                  />
                </div>
                {createError && (
                  <p className="text-sm text-destructive">{createError}</p>
                )}
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
        </div>
      </div>

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
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="week" className="mt-4">
          <WeekGrid
            currentDate={currentDate}
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        </TabsContent>

        <TabsContent value="day" className="mt-4">
          <DayView currentDate={currentDate} events={events} onEventClick={handleEventClick} />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <AgendaView currentDate={currentDate} events={events} onEventClick={handleEventClick} />
        </TabsContent>
      </Tabs>

      <EventDetailModal
        eventId={selectedEventId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
