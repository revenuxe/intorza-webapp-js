type ReceiptPayment = { id: string; amount: number; payment_date: string; created_at?: string };

/** Receipt balance at the selected payment, independent of later payments.
 * Input history is newest first, matching the invoice detail query.
 */
export function paymentReceiptSummary(total: number, payments: ReceiptPayment[], paymentId: string) {
  if (!Number.isFinite(total) || total < 0) throw new Error('Invalid invoice total.');
  const ordered = payments.map((payment, index) => ({ payment, index })).sort((a, b) =>
    a.payment.payment_date.localeCompare(b.payment.payment_date)
    || (a.payment.created_at && b.payment.created_at ? a.payment.created_at.localeCompare(b.payment.created_at) : 0)
    || b.index - a.index);
  const selected = ordered.findIndex(row => row.payment.id === paymentId);
  if (selected < 0) throw new Error('Payment no longer exists. Reload the invoice before downloading.');
  const paidCents = ordered.slice(0, selected + 1).reduce((sum, { payment }) => {
    if (!Number.isFinite(payment.amount) || payment.amount < 0) throw new Error('Invalid payment amount.');
    return sum + Math.round(payment.amount * 100);
  }, 0);
  const totalCents = Math.round(total * 100);
  const remainingCents = Math.max(0, totalCents - paidCents);
  return { totalAmount: totalCents / 100, paidAmount: paidCents / 100, remainingAmount: remainingCents / 100,
    status: remainingCents === 0 ? 'paid' : paidCents > 0 ? 'partially_paid' : 'unpaid' };
}
