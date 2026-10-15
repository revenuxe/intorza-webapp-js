import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Unauthorized' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !user) return reply({ error: 'Unauthorized' }, 401);
    const { data: allowed } = await supabase.rpc('consume_user_api_limit', { p_user: user.id, p_operation: 'razorpay-create-coin-order' });
    if (!allowed) return reply({ error: 'Too many payment attempts. Please wait a minute.' }, 429);
    const { coins } = await request.json();
    if (!Number.isInteger(coins) || coins < 10 || coins > 100000) return reply({ error: 'Choose between 10 and 100,000 coins.' }, 400);
    const id = Deno.env.get('RAZORPAY_KEY_ID'), secret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!id || !secret) return reply({ error: 'Coin payments are not configured.' }, 503);
    const { data: profile } = await supabase.from('profiles').select('full_name,company_name,email,phone').eq('id', user.id).single();
    const amount = coins * 100;
    const created = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR', receipt: `coins_${user.id.slice(0, 8)}_${Date.now().toString(36)}`, notes: { user_id: user.id, type: 'coin_topup', coins: String(coins) } }) });
    const order = await created.json(); if (!created.ok || !/^order_[A-Za-z0-9]+$/.test(order.id)) throw new Error('Razorpay could not create the coin order');
    const { error } = await supabase.from('coin_payments').insert({ user_id: user.id, razorpay_order_id: order.id, coins, amount_paise: amount, currency: 'INR' });
    if (error) throw new Error('Could not save the coin order');
    return reply({ orderId: order.id, keyId: id, amount, currency: 'INR', coins, prefill: { name: profile?.full_name || profile?.company_name || '', email: profile?.email || user.email || '', contact: profile?.phone || '' } });
  } catch (error) { console.error('Coin order failed'); return reply({ error: error instanceof Error ? error.message : 'Could not start coin checkout.' }, 500); }
});
