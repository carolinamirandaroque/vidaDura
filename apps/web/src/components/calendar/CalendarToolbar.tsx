import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@lifehub/ui';

interface CalendarToolbarProps {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayLabel: string;
}

export function CalendarToolbar({
  title,
  onPrev,
  onNext,
  onToday,
  todayLabel,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-2">
      <Button type="button" variant="ghost" size="icon" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-sm font-semibold capitalize sm:text-base">{title}</p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={onToday}
        >
          {todayLabel}
        </Button>
      </div>

      <Button type="button" variant="ghost" size="icon" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
