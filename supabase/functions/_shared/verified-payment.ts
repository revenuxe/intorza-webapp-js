export interface ProviderPayment { id: string; order_id: string; status: string; captured: boolean; amount: number; currency: string; amount_refunded?: number }
interface ProviderOrder { id: string; amount: number; currency: string; status: string; amount_paid: number; notes?: Record<string,string> }
export async function fetchRazorpay<T>(path: string): Promise<T> {
  const id=Deno.env.get('RAZORPAY_KEY_ID'), secret=Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!id || !secret) throw new Error('Payment provider is not configured');
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{headers:{Authorization:`Basic ${btoa(`${id}:${secret}`)}`},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('Could not verify payment with provider');
  return response.json();
}
export async function getOwnedPayment(paymentId: string, expectedUser?: string, expectedOrder?: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new Error('Invalid payment identifier');
  const payment=await fetchRazorpay<ProviderPayment>(`payments/${encodeURIComponent(paymentId)}`);
  if (payment.id !== paymentId || !/^order_[A-Za-z0-9]+$/.test(payment.order_id) || (expectedOrder && expectedOrder !== payment.order_id)) throw new Error('Payment order mismatch');
  const order=await fetchRazorpay<ProviderOrder>(`orders/${encodeURIComponent(payment.order_id)}`);
  const userId=order.notes?.user_id;
  if (!userId || (expectedUser && userId !== expectedUser) || order.notes?.type !== 'pro_activation' || order.notes?.plan !== 'monthly' || order.id !== payment.order_id) throw new Error('Payment ownership or purpose mismatch');
  if (order.amount !== 100 || payment.amount !== order.amount || !['INR','USD'].includes(order.currency) || payment.currency !== order.currency) throw new Error('Payment amount or currency mismatch');
  return {payment,order,userId};
}
export async function getCapturedPayment(paymentId: string, expectedUser?: string, expectedOrder?: string) {
  const verified=await getOwnedPayment(paymentId,expectedUser,expectedOrder);
  if (verified.payment.status !== 'captured' || !verified.payment.captured || (verified.payment.amount_refunded || 0)>0 || verified.order.status !== 'paid' || verified.order.amount_paid < verified.order.amount) throw new Error('Payment has not been captured or was refunded');
  return verified;
}
