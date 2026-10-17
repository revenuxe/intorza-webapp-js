import { paymentReceiptSummary } from './payment-receipt';
const first = { id: 'first', amount: 55000, payment_date: '2026-10-01', created_at: '2026-10-01T10:00:00Z' };
const second = { id: 'second', amount: 25000, payment_date: '2026-10-17', created_at: '2026-10-17T10:00:00Z' };
it('uses the full invoice value and cumulative paid amount for a partial receipt', () => {
  expect(paymentReceiptSummary(100000, [second, first], 'second')).toEqual({ totalAmount: 100000, paidAmount: 80000, remainingAmount: 20000, status: 'partially_paid' });
});
it('keeps an older receipt balance unchanged by later payments', () => {
  expect(paymentReceiptSummary(100000, [second, first], 'first')).toMatchObject({ paidAmount: 55000, remainingAmount: 45000 });
});
it('orders same-date payments by creation time, with newest-first fallback for legacy records', () => {
  const later = { ...second, payment_date: first.payment_date, created_at: '2026-10-01T11:00:00Z' };
  expect(paymentReceiptSummary(100000, [first, later], 'first').remainingAmount).toBe(45000);
  expect(paymentReceiptSummary(100000, [{ ...later, created_at: undefined }, { ...first, created_at: undefined }], 'first').remainingAmount).toBe(45000);
});
it('calculates decimal currency exactly and shows zero only when settled or overpaid', () => {
  const payments = [{ ...second, amount: 0.2 }, { ...first, amount: 0.1 }];
  expect(paymentReceiptSummary(1, payments, 'second').remainingAmount).toBe(0.7);
  expect(paymentReceiptSummary(0.3, payments, 'second')).toMatchObject({ remainingAmount: 0, status: 'paid' });
  expect(paymentReceiptSummary(0.2, payments, 'second').remainingAmount).toBe(0);
});
it('rejects an absent receipt or invalid money rather than printing a misleading balance', () => {
  expect(() => paymentReceiptSummary(100000, [first], 'missing')).toThrow('no longer exists');
  expect(() => paymentReceiptSummary(NaN, [first], 'first')).toThrow('Invalid invoice');
});
