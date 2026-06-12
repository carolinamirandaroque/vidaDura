export function formatDate(date: string | Date, locale = 'pt-PT'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date, locale = 'pt-PT'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: string | Date, locale = 'pt-PT'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
}

export function getDatePartsInTimeZone(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  return { year, month, day };
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const getOffset = (timestamp: number) => {
    const formatted = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]),
    );
    const asUtc = Date.UTC(
      Number(formatted.year),
      Number(formatted.month) - 1,
      Number(formatted.day),
      Number(formatted.hour),
      Number(formatted.minute),
      Number(formatted.second),
    );
    return asUtc - timestamp;
  };

  let timestamp = utcGuess;
  for (let i = 0; i < 3; i++) {
    timestamp = utcGuess - getOffset(timestamp);
  }

  return new Date(timestamp);
}

export function startOfDayInTimeZone(timeZone: string, date: Date = new Date()): Date {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return zonedDateTimeToUtc(year, month, day, 0, 0, 0, 0, timeZone);
}

export function endOfDayInTimeZone(timeZone: string, date: Date = new Date()): Date {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return zonedDateTimeToUtc(year, month, day, 23, 59, 59, 999, timeZone);
}

export function addDaysInTimeZone(timeZone: string, date: Date, days: number): Date {
  const noon = zonedDateTimeToUtc(
    ...(() => {
      const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
      return [year, month, day, 12, 0, 0, 0, timeZone] as const;
    })(),
  );
  return startOfDayInTimeZone(timeZone, addDays(noon, days));
}

export function eventOverlapsRange(
  eventStart: Date | string,
  eventEnd: Date | string,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const start = typeof eventStart === 'string' ? new Date(eventStart) : eventStart;
  const end = typeof eventEnd === 'string' ? new Date(eventEnd) : eventEnd;
  return start <= rangeEnd && end >= rangeStart;
}
