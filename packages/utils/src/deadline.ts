import type { Event, EventKind, RecurrenceType } from '@lifehub/types';
import { endOfDay, startOfDay } from './date';
import { addMonths, addYears } from './recurrence';
import { addDays } from './date';

export const DEADLINE_COLOR = '#ea580c';
export const DEADLINE_OVERDUE_COLOR = '#dc2626';
export const DEADLINE_DONE_COLOR = '#94a3b8';

export function isDeadline(event: Pick<Event, 'kind'>): boolean {
  return event.kind === 'deadline';
}

export function isDeadlineDone(event: Pick<Event, 'kind' | 'deadlineStatus'>): boolean {
  return event.kind === 'deadline' && event.deadlineStatus === 'done';
}

export function isDeadlineOverdue(event: Pick<Event, 'kind' | 'deadlineStatus' | 'endDate'>): boolean {
  if (!isDeadline(event) || isDeadlineDone(event)) return false;
  return new Date(event.endDate) < startOfDay(new Date());
}

export function getDeadlineColor(event: Pick<Event, 'kind' | 'deadlineStatus' | 'endDate'>): string {
  if (!isDeadline(event)) return '';
  if (isDeadlineDone(event)) return DEADLINE_DONE_COLOR;
  if (isDeadlineOverdue(event)) return DEADLINE_OVERDUE_COLOR;
  return DEADLINE_COLOR;
}

function nextDeadlineDate(date: Date, recurrence: RecurrenceType): Date {
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

export function advanceDeadlineDates(
  dueDate: string | Date,
  recurrence: RecurrenceType,
): { startDate: Date; endDate: Date } {
  const next = nextDeadlineDate(startOfDay(typeof dueDate === 'string' ? new Date(dueDate) : dueDate), recurrence);
  return { startDate: startOfDay(next), endDate: endOfDay(next) };
}

export function shouldShowDeadlineOnCalendar(
  event: Pick<Event, 'kind' | 'deadlineStatus'>,
): boolean {
  if (!isDeadline(event)) return true;
  return event.deadlineStatus !== 'done';
}
