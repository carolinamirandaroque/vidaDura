import { useTranslation } from 'react-i18next';
import type { Event } from '@lifehub/types';
import { eventsForDay } from '@/lib/calendar';
import { HubEmptyMessage, HubMetricCard, hubListClass } from '@/components/hub';
import { CalendarEventRow } from './CalendarEventRow';

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function DayView({ currentDate, events, onEventClick }: DayViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const dayEvents = eventsForDay(events, currentDate);

  const dayLabel = currentDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-3">
      <HubMetricCard
        label={dayLabel}
        value={t('calendar.eventsCount', { count: dayEvents.length })}
      />

      {dayEvents.length === 0 ? (
        <HubEmptyMessage>{t('calendar.noEventsDay')}</HubEmptyMessage>
      ) : (
        <div className={hubListClass}>
          {dayEvents.map((event) => (
            <CalendarEventRow key={event.id} event={event} onClick={onEventClick} />
          ))}
        </div>
      )}
    </div>
  );
}
