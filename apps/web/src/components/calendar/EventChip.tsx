import { cn } from '@lifehub/ui';
import { Bell } from 'lucide-react';
import type { Event } from '@lifehub/types';
import { getDeadlineColor, isDeadline, isDeadlineOverdue } from '@lifehub/utils';
import { getEventTypeColor } from '@/lib/event-types';

interface EventChipProps {
  event: Event;
  compact?: boolean;
  showTime?: boolean;
  time?: string;
  onClick?: (event: Event) => void;
}

export function EventChip({ event, compact, showTime, time, onClick }: EventChipProps) {
  const deadline = isDeadline(event);
  const color = deadline ? getDeadlineColor(event) : getEventTypeColor(event.type);
  const overdue = deadline && isDeadlineOverdue(event);

  return (
    <button
      type="button"
      data-calendar-event
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80',
        compact ? 'leading-tight' : 'py-1',
        overdue && 'ring-1 ring-destructive/40',
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        borderLeft: `3px solid ${color}`,
      }}
      title={event.title}
    >
      {deadline && <Bell className="h-3 w-3 shrink-0 opacity-80" />}
      {showTime && time && !deadline && <span className="mr-1 opacity-70">{time}</span>}
      <span className="truncate">{event.title}</span>
    </button>
  );
}
