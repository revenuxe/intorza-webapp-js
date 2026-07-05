// Invoice status is stored as one of: unpaid, partially_paid, paid, cancelled.
// "Overdue" is never stored — it's a point-in-time fact (an unpaid/partially
// paid invoice whose due date has passed), so it's computed at display time
// rather than persisted, avoiding the need to keep a stored value in sync
// with the passage of time.
export function getDisplayStatus(status: string | null | undefined, dueDate: string | null | undefined): string {
  const raw = (status || 'unpaid').toLowerCase();
  const isOutstanding = raw === 'unpaid' || raw === 'partially_paid' || raw === 'partial';
  if (isOutstanding && dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return raw;
}
