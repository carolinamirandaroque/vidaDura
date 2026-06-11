import { cn } from '@lifehub/ui';
import type { Event } from '@lifehub/types';

interface EventChipProps {
  event: Event;
  compact?: boolean;
  showTime?: boolean;
  time?: string;
  onClick?: (event: Event) => void;
}

export function EventChip({ event, compact, showTime, time, onClick }: EventChipProps) {
  const color = event.calendar?.color ?? '#6366f1';

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        'w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80',
        compact ? 'leading-tight' : 'py-1',
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        borderLeft: `3px solid ${color}`,
      }}
      title={event.title}
    >
      {showTime && time && <span className="mr-1 opacity-70">{time}</span>}
      {event.title}
    </button>
  );
}
