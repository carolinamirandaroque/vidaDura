import { describe, expect, it } from 'vitest';
import {
  endOfDayInTimeZone,
  eventOverlapsRange,
  startOfDayInTimeZone,
} from './date';

describe('timezone day boundaries', () => {
  it('keeps an all-day event on the 13th out of the 12th in Europe/Lisbon', () => {
    const timeZone = 'Europe/Lisbon';
    const reference = new Date('2026-06-12T15:00:00.000Z');

    const todayStart = startOfDayInTimeZone(timeZone, reference);
    const todayEnd = endOfDayInTimeZone(timeZone, reference);

    const eventStart = new Date('2026-06-12T23:00:00.000Z');
    const eventEnd = new Date('2026-06-13T22:59:59.999Z');

    expect(eventOverlapsRange(eventStart, eventEnd, todayStart, todayEnd)).toBe(false);
  });

  it('includes an all-day event on the 12th in Europe/Lisbon', () => {
    const timeZone = 'Europe/Lisbon';
    const reference = new Date('2026-06-12T15:00:00.000Z');

    const todayStart = startOfDayInTimeZone(timeZone, reference);
    const todayEnd = endOfDayInTimeZone(timeZone, reference);

    const eventStart = new Date('2026-06-11T23:00:00.000Z');
    const eventEnd = new Date('2026-06-12T22:59:59.999Z');

    expect(eventOverlapsRange(eventStart, eventEnd, todayStart, todayEnd)).toBe(true);
  });
});
