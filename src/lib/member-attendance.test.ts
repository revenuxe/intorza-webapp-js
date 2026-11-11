import { attendanceRange, workedMinutes, hoursLabel } from './member-attendance';
it('includes the final day and excludes the next midnight', () => {
  const range=attendanceRange('2026-11-01','2026-11-12')!;
  expect(new Date(range.start).getDate()).toBe(1);
  expect(new Date(range.end).getDate()).toBe(13);
  expect(new Date(range.end).getHours()).toBe(0);
});
it('rejects reversed, incomplete and impossible dates', () => {
  expect(attendanceRange('2026-11-12','2026-11-01')).toBeNull();
  expect(attendanceRange('','2026-11-01')).toBeNull();
  expect(attendanceRange('2026-02-30','2026-03-01')).toBeNull();
});
it('counts overnight and ongoing shifts without negative durations', () => {
  expect(workedMinutes('2026-11-11T22:00:00Z','2026-11-12T06:30:00Z')).toBe(510);
  expect(workedMinutes('2026-11-11T22:00:00Z',null,Date.parse('2026-11-11T23:15:00Z'))).toBe(75);
  expect(workedMinutes('2026-11-11T22:00:00Z','2026-11-11T21:00:00Z')).toBe(0);
  expect(hoursLabel(510)).toBe('8h 30m');
});
