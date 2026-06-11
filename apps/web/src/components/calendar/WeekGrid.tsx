import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import type { Event } from '@lifehub/types';
import { getWeekDays, eventsForDay } from '@/lib/calendar';
import { useFormatters } from '@/hooks/useFormatters';
import { EventChip } from './EventChip';

interface WeekGridProps {
  currentDate: Date;
  events: Event[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
}

export function WeekGrid({ currentDate, events, onDayClick, onEventClick }: WeekGridProps) {
  const { i18n } = useTranslation();
  const { formatTime } = useFormatters();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const days = getWeekDays(currentDate);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">
        {days.map(({ date, isToday }) => (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onDayClick?.(date)}
            className={cn(
              'border-r px-2 py-3 text-center transition-colors last:border-r-0 hover:bg-accent/50',
              isToday && 'bg-primary/5',
            )}
          >
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {date.toLocaleDateString(locale, { weekday: 'short' })}
            </p>
            <p
              className={cn(
                'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold',
                isToday && 'bg-primary text-primary-foreground',
              )}
            >
              {date.getDate()}
            </p>
          </button>
        ))}
      </div>

      <div className="grid min-h-[400px] grid-cols-7">
        {days.map(({ date, isToday }) => {
          const dayEvents = eventsForDay(events, date);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'space-y-1 border-r p-2 last:border-r-0',
                isToday && 'bg-primary/5',
              )}
            >
              {dayEvents.map((event) => (
                <EventChip
                  key={event.id}
                  event={event}
                  showTime={!event.allDay}
                  time={event.allDay ? undefined : formatTime(event.startDate)}
                  onClick={onEventClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
