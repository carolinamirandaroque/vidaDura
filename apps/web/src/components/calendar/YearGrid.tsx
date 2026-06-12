import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import type { Event } from '@lifehub/types';
import { getMonthGridDays, getYearGridWeekdayLabels, eventsForDay } from '@/lib/calendar';
import { hubPanelClass } from '@/components/hub';

interface YearGridProps {
  currentDate: Date;
  events: Event[];
  onMonthClick?: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

function eventsInMonth(events: Event[], monthDate: Date) {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  return events.filter((event) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return start <= monthEnd && end >= monthStart;
  }).length;
}

export function YearGrid({ currentDate, events, onMonthClick, onDayClick }: YearGridProps) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const year = currentDate.getFullYear();
  const weekdayLabels = useMemo(() => getYearGridWeekdayLabels(locale), [locale]);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, month) => new Date(year, month, 1)),
    [year],
  );

  return (
    <div className={hubPanelClass}>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 sm:gap-4 sm:p-4 xl:grid-cols-4">
        {months.map((monthDate) => {
          const days = getMonthGridDays(monthDate);
          const monthEventCount = eventsInMonth(events, monthDate);
          const isCurrentMonth =
            monthDate.getMonth() === new Date().getMonth() &&
            monthDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={monthDate.toISOString()}
              className={cn(
                'rounded-xl border bg-card p-2.5 transition-colors sm:p-3',
                isCurrentMonth && 'border-primary/30 bg-primary/5',
              )}
            >
              <button
                type="button"
                onClick={() => onMonthClick?.(monthDate)}
                className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent/40"
              >
                <span className="text-sm font-semibold capitalize">
                  {monthDate.toLocaleDateString(locale, { month: 'long' })}
                </span>
                {monthEventCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                    {monthEventCount}
                  </span>
                )}
              </button>

              <div className="grid grid-cols-7 gap-0.5">
                {weekdayLabels.map((label, weekdayIndex) => (
                  <div
                    key={`${year}-m${monthDate.getMonth()}-header-${weekdayIndex}`}
                    className="text-center text-[9px] font-medium uppercase text-muted-foreground"
                  >
                    {label}
                  </div>
                ))}

                {days.map(({ date, isCurrentMonth: inMonth, isToday }, dayIndex) => {
                  const dayEvents = eventsForDay(events, date);
                  const hasEvents = dayEvents.length > 0;

                  return (
                    <button
                      key={`${year}-m${monthDate.getMonth()}-d${dayIndex}-${date.getTime()}`}
                      type="button"
                      onClick={() => onDayClick?.(date)}
                      className={cn(
                        'relative flex h-6 w-full items-center justify-center rounded text-[10px] transition-colors sm:h-7 sm:text-[11px]',
                        inMonth
                          ? 'text-foreground hover:bg-accent/50'
                          : 'text-muted-foreground/40 hover:bg-accent/20',
                        isToday && 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
                        hasEvents && !isToday && 'font-medium text-primary',
                      )}
                      title={
                        hasEvents
                          ? t('calendar.yearDayEvents', { count: dayEvents.length })
                          : undefined
                      }
                    >
                      {date.getDate()}
                      {hasEvents && !isToday && (
                        <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
