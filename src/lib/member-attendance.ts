import { format, startOfDay, addDays } from 'date-fns';
export function attendanceRange(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return null;
  const first = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  if (isNaN(first.getTime()) || isNaN(last.getTime()) || format(first, 'yyyy-MM-dd') !== start || format(last, 'yyyy-MM-dd') !== end) return null;
  return { start: startOfDay(first).toISOString(), end: addDays(startOfDay(last), 1).toISOString() };
}
export function workedMinutes(clockIn: string, clockOut: string | null, now = Date.now()) {
  return Math.max(0, Math.floor(((clockOut ? new Date(clockOut).getTime() : now) - new Date(clockIn).getTime()) / 60000));
}
export function hoursLabel(minutes: number) { return Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm'; }
