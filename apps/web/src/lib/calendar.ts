import { addDays, endOfDay, getMonthRange, getWeekRange, isToday, startOfDay } from '@lifehub/utils';
import type { Event } from '@lifehub/types';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getMonthGridDays(date: Date): CalendarDay[] {
  const month = date.getMonth();
  const firstOfMonth = new Date(date.getFullYear(), month, 1);

  let startOffset = firstOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const gridStart = addDays(firstOfMonth, -startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    return {
      date: d,
      isCurrentMonth: d.getMonth() === month,
      isToday: isToday(d),
    };
  });
}

export function getWeekDays(date: Date): CalendarDay[] {
  const { start } = getWeekRange(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    return { date: d, isCurrentMonth: true, isToday: isToday(d) };
  });
}

export function getWeekdayLabels(locale: string): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) =>
    addDays(monday, i).toLocaleDateString(locale, { weekday: 'short' }),
  );
}

/** Compact weekday headers for year mini-months (unique per column). */
export function getYearGridWeekdayLabels(locale: string): string[] {
  if (locale === 'pt-PT') {
    return ['2ª', '3ª', '4ª', '5ª', '6ª', 'S', 'D'];
  }

  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) =>
    addDays(monday, i).toLocaleDateString(locale, { weekday: 'narrow' }),
  );
}

export function eventOnDay(event: Event, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  return eventStart <= dayEnd && eventEnd >= dayStart;
}

export function eventsForDay(events: Event[], day: Date): Event[] {
  return events
    .filter((e) => eventOnDay(e, day))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

export function getYearRange(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export function getViewRange(view: string, date: Date): { start: Date; end: Date } {
  switch (view) {
    case 'day': {
      const start = startOfDay(date);
      return { start, end: endOfDay(date) };
    }
    case 'week':
      return getWeekRange(date);
    case 'year':
      return getYearRange(date);
    case 'agenda': {
      const start = startOfDay(date);
      const end = addDays(start, 30);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month':
    default: {
      const grid = getMonthGridDays(date);
      const start = startOfDay(grid[0].date);
      const end = endOfDay(grid[grid.length - 1].date);
      return { start, end };
    }
  }
}

export function navigateDate(view: string, date: Date, dir: -1 | 1): Date {
  const d = new Date(date);
  switch (view) {
    case 'day':
      d.setDate(d.getDate() + dir);
      break;
    case 'week':
      d.setDate(d.getDate() + dir * 7);
      break;
    case 'agenda':
      d.setDate(d.getDate() + dir * 14);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + dir);
      break;
    case 'month':
    default:
      d.setMonth(d.getMonth() + dir);
      break;
  }
  return d;
}

export function formatViewTitle(view: string, date: Date, locale: string): string {
  switch (view) {
    case 'day':
      return date.toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    case 'week': {
      const { start, end } = getWeekRange(date);
      const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
      return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, { ...opts, year: 'numeric' })}`;
    }
    case 'agenda': {
      const end = addDays(date, 30);
      return `${date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    case 'year':
      return String(date.getFullYear());
    case 'month':
    default:
      return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
}

export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDatetimeLocalValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function resolveDueDate(dueInput?: string): { startDate: string; endDate: string } {
  const due = dueInput?.trim()
    ? new Date(`${dueInput.trim()}T12:00:00`)
    : new Date();
  if (Number.isNaN(due.getTime())) {
    throw new Error('Invalid due date');
  }
  const start = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 0, 0, 0, 0);
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function resolveAllDayEventDates(
  startInput?: string,
  endInput?: string,
): { startDate: string; endDate: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const startKey = startInput?.trim().split('T')[0] || todayKey;
  const endKey = endInput?.trim().split('T')[0] || startKey;
  const [sy, sm, sd] = startKey.split('-').map(Number);
  const [ey, em, ed] = endKey.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  let end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid date');
  }
  if (end < start) {
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function resolveEventDates(
  startInput?: string,
  endInput?: string,
): { startDate: string; endDate: string } {
  const now = new Date();
  const start = startInput?.trim() ? new Date(startInput) : now;
  let end = endInput?.trim() ? new Date(endInput) : new Date(start);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid start date');
  }
  if (Number.isNaN(end.getTime())) {
    end = new Date(start);
  }
  if (end <= start) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export { getMonthRange };
