import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  differenceInCalendarMonths,
  differenceInDays,
  parseISO,
  isValid,
} from 'date-fns';

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function fromISODate(s: string): Date {
  const d = parseISO(s);
  if (!isValid(d)) throw new Error(`Invalid ISO date: ${s}`);
  return d;
}

export function currentMonthRange(today = new Date()) {
  return { start: startOfMonth(today), end: endOfMonth(today) };
}

export function currentYearRange(today = new Date()) {
  return { start: startOfYear(today), end: endOfYear(today) };
}

export function lastNMonths(n: number, today = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = subMonths(today, n - 1 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, 'MMM yyyy') };
  });
}

export function monthsBetween(start: Date, end: Date): number {
  return Math.max(0, differenceInCalendarMonths(end, start));
}

export function daysBetween(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

export { startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, subMonths, format };
