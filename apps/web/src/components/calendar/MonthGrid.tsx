import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import type { Event } from '@lifehub/types';
import { getMonthGridDays, getWeekdayLabels, eventsForDay } from '@/lib/calendar';
import { useFormatters } from '@/hooks/useFormatters';
import { EventChip } from './EventChip';

interface MonthGridProps {
  currentDate: Date;
  events: Event[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
}

const MAX_VISIBLE = 3;

export function MonthGrid({ currentDate, events, onDayClick, onEventClick }: MonthGridProps) {
  const { i18n } = useTranslation();
  const { formatTime } = useFormatters();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const weekdays = getWeekdayLabels(locale);
  const days = getMonthGridDays(currentDate);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {weekdays.map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth, isToday }) => {
          const dayEvents = eventsForDay(events, date);
          const hidden = dayEvents.length - MAX_VISIBLE;

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'min-h-[100px] border-b border-r p-1.5 transition-colors sm:min-h-[120px]',
                !isCurrentMonth && 'bg-muted/20',
                isToday && 'bg-primary/5',
              )}
            >
              <button
                type="button"
                onClick={() => onDayClick?.(date)}
                className={cn(
                  'mb-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-accent',
                  isToday && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  !isCurrentMonth && 'text-muted-foreground',
                )}
              >
                {date.getDate()}
              </button>

              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    compact
                    showTime={!event.allDay}
                    time={event.allDay ? undefined : formatTime(event.startDate)}
                    onClick={onEventClick}
                  />
                ))}
                {hidden > 0 && (
                  <p className="px-1 text-[10px] font-medium text-muted-foreground">+{hidden}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
