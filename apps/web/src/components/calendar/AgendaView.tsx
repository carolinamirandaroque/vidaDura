import { useTranslation } from 'react-i18next';
import { cn, Card, CardContent } from '@lifehub/ui';
import { addDays, getDeadlineColor, isDeadline, isDeadlineOverdue, isToday } from '@lifehub/utils';
import { eventsForDay } from '@/lib/calendar';
import { useFormatters } from '@/hooks/useFormatters';
import type { Event } from '@lifehub/types';
import { getEventTypeColor } from '@/lib/event-types';

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function AgendaView({ currentDate, events, onEventClick }: AgendaViewProps) {
  const { t, i18n } = useTranslation();
  const { formatTime } = useFormatters();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';

  const days = Array.from({ length: 30 }, (_, i) => addDays(currentDate, i));
  const daysWithEvents = days
    .map((date) => ({ date, events: eventsForDay(events, date) }))
    .filter((d) => d.events.length > 0);

  if (daysWithEvents.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">{t('calendar.noUpcoming')}</p>
    );
  }

  return (
    <div className="space-y-6">
      {daysWithEvents.map(({ date, events: dayEvents }) => (
        <div key={date.toISOString()}>
          <h3
            className={cn(
              'mb-2 text-sm font-semibold',
              isToday(date) ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {isToday(date)
              ? t('common.today')
              : date.toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((event) => {
              const deadline = isDeadline(event);
              const color = deadline ? getDeadlineColor(event) : getEventTypeColor(event.type);
              const overdue = deadline && isDeadlineOverdue(event);
              return (
                <Card
                  key={event.id}
                  className="cursor-pointer transition-colors hover:bg-accent/30"
                  onClick={() => onEventClick?.(event)}
                >
                  <CardContent className="flex items-center gap-4 p-3">
                    <div
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {deadline
                          ? overdue
                            ? t('eventHub.overdue')
                            : t('eventHub.dueBy')
                          : event.allDay
                            ? t('calendar.allDay')
                            : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`}
                      </p>
                    </div>
                    <span
                      className="hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-medium sm:inline"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {deadline ? t('eventHub.deadline') : t(`eventHub.types.${event.type}`)}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
