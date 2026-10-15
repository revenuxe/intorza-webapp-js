import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const valid = (value: unknown, pattern: RegExp) => typeof value === 'string' && pattern.test(value);

serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('authorization'); if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Unauthorized' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7)); if (authError || !user) return reply({ error: 'Unauthorized' }, 401);
    const { data: allowed } = await supabase.rpc('consume_user_api_limit', { p_user: user.id, p_operation: 'razorpay-verify-coin-payment' }); if (!allowed) return reply({ error: 'Too many verification attempts. Please wait a minute.' }, 429);
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await request.json();
    if (!valid(orderId, /^order_[A-Za-z0-9]+$/) || !valid(paymentId, /^pay_[A-Za-z0-9]+$/) || !valid(signature, /^[a-f0-9]{64}$/i)) return reply({ error: 'Invalid payment details' }, 400);
    const key = Deno.env.get('RAZORPAY_KEY_SECRET'); if (!key) return reply({ error: 'Payment verification is not configured.' }, 503);
    const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBytes = Uint8Array.from(signature.match(/.{2}/g)!, part => parseInt(part, 16));
    if (!await crypto.subtle.verify('HMAC', cryptoKey, signatureBytes, new TextEncoder().encode(`${orderId}|${paymentId}`))) return reply({ error: 'Payment verification failed' }, 400);
    const auth = `Basic ${btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${key}`)}`;
    const [paymentResponse, orderResponse] = await Promise.all([fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: auth } }), fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, { headers: { Authorization: auth } })]);
    const payment = await paymentResponse.json(), order = await orderResponse.json();
    if (!paymentResponse.ok || !orderResponse.ok || payment.order_id !== orderId || payment.status !== 'captured' || !payment.captured || (payment.amount_refunded || 0) > 0 || order.status !== 'paid' || order.notes?.user_id !== user.id || order.notes?.type !== 'coin_topup' || order.currency !== 'INR' || payment.currency !== 'INR' || payment.amount !== order.amount) return reply({ error: 'Payment has not been captured for this wallet.' }, 400);
    const coins = Number(order.notes?.coins); if (!Number.isInteger(coins) || coins < 10 || order.amount !== coins * 100) return reply({ error: 'Coin order details are invalid.' }, 400);
    const { data, error } = await supabase.rpc('verify_coin_purchase', { p_user: user.id, p_order_id: orderId, p_payment_id: paymentId, p_coins: coins, p_amount_paise: order.amount, p_currency: 'INR' });
    if (error) throw new Error('Verified payment could not be credited; please retry.');
    return reply({ balance: data, coins });
  } catch (error) { console.error('Coin verification failed'); return reply({ error: error instanceof Error ? error.message : 'Payment verification failed.' }, 500); }
});
