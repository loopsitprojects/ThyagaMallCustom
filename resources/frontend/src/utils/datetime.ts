// Sri Lanka date/time formatting: Asia/Colombo time zone, day-first, 12-hour clock
// e.g. "14 Nov 2026, 12:40 PM".

const LK_TIME_ZONE = 'Asia/Colombo';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LK_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: LK_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "14 Nov 2026, 12:40 PM" (Sri Lanka time) */
export function formatLkDateTime(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return typeof value === 'string' ? value : '';
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} ${String(parts.dayPeriod).toUpperCase()}`;
}

/** "14 Nov 2026" (Sri Lanka date) */
export function formatLkDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return typeof value === 'string' ? value : '';
  return dateFormatter.format(date);
}
