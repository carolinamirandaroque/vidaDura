import { useTranslation } from 'react-i18next';
import { cn } from '@lifehub/ui';
import { addDays, isToday } from '@lifehub/utils';
import { eventsForDay } from '@/lib/calendar';
import type { Event } from '@lifehub/types';
import { HubEmptyMessage, HubGroupLabel, hubListClass } from '@/components/hub';
import { CalendarEventRow } from './CalendarEventRow';

interface AgendaViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function AgendaView({ currentDate, events, onEventClick }: AgendaViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';

  const days = Array.from({ length: 30 }, (_, i) => addDays(currentDate, i));
  const daysWithEvents = days
    .map((date) => ({ date, events: eventsForDay(events, date) }))
    .filter((day) => day.events.length > 0);

  if (daysWithEvents.length === 0) {
    return <HubEmptyMessage>{t('calendar.noUpcoming')}</HubEmptyMessage>;
  }

  return (
    <div className="space-y-4">
      {daysWithEvents.map(({ date, events: dayEvents }) => (
        <section key={date.toISOString()}>
          <HubGroupLabel
            className={cn(
              'mb-2 normal-case',
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
          </HubGroupLabel>
          <div className={hubListClass}>
            {dayEvents.map((event) => (
              <CalendarEventRow key={event.id} event={event} onClick={onEventClick} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
