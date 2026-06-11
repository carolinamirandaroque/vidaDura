import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@lifehub/ui';
import type { Event } from '@lifehub/types';
import { getDeadlineColor, isDeadline, isDeadlineOverdue } from '@lifehub/utils';
import { getEventTypeColor } from '@/lib/event-types';
import { eventsForDay } from '@/lib/calendar';
import { useFormatters } from '@/hooks/useFormatters';
import { MapPin } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const { formatTime } = useFormatters();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const dayEvents = eventsForDay(events, currentDate);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-lg font-semibold capitalize">
          {currentDate.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dayEvents.length}{' '}
          {dayEvents.length === 1 ? t('calendar.event') : t('calendar.events')}
        </p>
      </div>

      {dayEvents.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('calendar.noEventsDay')}</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((event) => {
            const deadline = isDeadline(event);
            const color = deadline ? getDeadlineColor(event) : getEventTypeColor(event.type);
            const overdue = deadline && isDeadlineOverdue(event);
            return (
              <Card
                key={event.id}
                className="cursor-pointer overflow-hidden transition-colors hover:bg-accent/30"
                onClick={() => onEventClick?.(event)}
              >
                <div className="h-1" style={{ backgroundColor: color }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {deadline
                          ? overdue
                            ? t('eventHub.overdue')
                            : t('eventHub.dueBy')
                          : event.allDay
                            ? t('calendar.allDay')
                            : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`}
                      </p>
                      {event.location && (
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {deadline ? t('eventHub.deadline') : t(`eventHub.types.${event.type}`)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
