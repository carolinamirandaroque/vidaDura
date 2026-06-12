import { useTranslation } from 'react-i18next';
import { Bell, MapPin } from 'lucide-react';
import { cn } from '@lifehub/ui';
import type { Event } from '@lifehub/types';
import { getDeadlineColor, isDeadline, isDeadlineOverdue } from '@lifehub/utils';
import { getEventTypeColor } from '@/lib/event-types';
import { useFormatters } from '@/hooks/useFormatters';
import { hubRowClass } from '@/components/hub';

interface CalendarEventRowProps {
  event: Event;
  onClick?: (event: Event) => void;
}

export function CalendarEventRow({ event, onClick }: CalendarEventRowProps) {
  const { t } = useTranslation();
  const { formatTime } = useFormatters();
  const deadline = isDeadline(event);
  const color = deadline ? getDeadlineColor(event) : getEventTypeColor(event.type);
  const overdue = deadline && isDeadlineOverdue(event);

  const timeLabel = deadline
    ? overdue
      ? t('eventHub.overdue')
      : t('eventHub.dueBy')
    : event.allDay
      ? t('calendar.allDay')
      : `${formatTime(event.startDate)} – ${formatTime(event.endDate)}`;

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        hubRowClass,
        'w-full text-left',
        overdue && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {deadline && <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <p className="truncate font-medium">{event.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">{timeLabel}</p>
        {event.location && (
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}
      </div>
      <span
        className="hidden shrink-0 rounded-md px-2 py-0.5 text-xs font-medium sm:inline"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {deadline ? t('eventHub.deadline') : t(`eventHub.types.${event.type}`)}
      </span>
    </button>
  );
}
