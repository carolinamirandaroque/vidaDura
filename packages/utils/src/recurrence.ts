import type { Event, RecurrenceType } from '@lifehub/types';
import { addDays, startOfDay } from './date';
import { shouldShowDeadlineOnCalendar } from './deadline';

export const RECURRENCE_INSTANCE_SEP = '@';

export function getEventSeriesId(eventId: string): string {
  const idx = eventId.indexOf(RECURRENCE_INSTANCE_SEP);
  return idx === -1 ? eventId : eventId.slice(0, idx);
}

export function parseRecurrenceInstanceId(eventId: string): {
  seriesId: string;
  occurrenceAt: Date | null;
} {
  const idx = eventId.indexOf(RECURRENCE_INSTANCE_SEP);
  if (idx === -1) {
    return { seriesId: eventId, occurrenceAt: null };
  }
  const timestamp = Number(eventId.slice(idx + RECURRENCE_INSTANCE_SEP.length));
  return {
    seriesId: eventId.slice(0, idx),
    occurrenceAt: Number.isFinite(timestamp) ? new Date(timestamp) : null,
  };
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function nextOccurrence(date: Date, recurrence: RecurrenceType): Date {
  switch (recurrence) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addDays(date, 7);
    case 'monthly':
      return addMonths(date, 1);
    case 'yearly':
      return addYears(date, 1);
    default:
      return addDays(date, 1);
  }
}

function advanceToRange(cursor: Date, recurrence: RecurrenceType, rangeStart: Date): Date {
  let current = new Date(cursor);
  let guard = 0;
  while (current < rangeStart && guard++ < 5000) {
    current = nextOccurrence(current, recurrence);
  }
  return current;
}

export function expandRecurringEvent(
  event: Event,
  rangeStart: Date,
  rangeEnd: Date,
): Event[] {
  if (event.recurrence === 'none') {
    return [event];
  }

  const seriesStart = new Date(event.startDate);
  const duration = new Date(event.endDate).getTime() - seriesStart.getTime();
  const seriesEnd = event.recurrenceEnd ? new Date(event.recurrenceEnd) : rangeEnd;
  const effectiveEnd = seriesEnd < rangeEnd ? seriesEnd : rangeEnd;

  if (seriesStart > effectiveEnd) return [];

  const skippedOccurrences = new Set(
    (event.recurrenceExceptions ?? []).map((value) => startOfDay(new Date(value)).getTime()),
  );

  const instances: Event[] = [];
  let cursor = advanceToRange(seriesStart, event.recurrence, rangeStart);
  let guard = 0;

  while (cursor <= effectiveEnd && guard++ < 500) {
    const instanceEnd = new Date(cursor.getTime() + duration);
    const isSkipped = skippedOccurrences.has(startOfDay(cursor).getTime());
    if (!isSkipped && instanceEnd >= rangeStart) {
      instances.push({
        ...event,
        id: `${event.id}${RECURRENCE_INSTANCE_SEP}${cursor.getTime()}`,
        startDate: cursor.toISOString(),
        endDate: instanceEnd.toISOString(),
      });
    }
    cursor = nextOccurrence(cursor, event.recurrence);
  }

  return instances;
}

export function expandRecurringEvents(
  events: Event[],
  rangeStart: Date,
  rangeEnd: Date,
): Event[] {
  return events
    .filter(shouldShowDeadlineOnCalendar)
    .flatMap((event) => expandRecurringEvent(event, rangeStart, rangeEnd))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}
