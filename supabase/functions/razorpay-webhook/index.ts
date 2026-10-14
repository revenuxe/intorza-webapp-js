import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchRazorpay, getCapturedPayment, getOwnedPayment } from '../_shared/verified-payment.ts';
const secret=Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
const reply=(body: unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
serve(async req=>{
  if (req.method==='OPTIONS') return new Response(null,{status:200});
  if (req.method!=='POST') return reply({error:'Method not allowed'},405);
  if (!secret) return reply({error:'Webhook is not configured'},503);
  const signature=req.headers.get('x-razorpay-signature');
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return reply({error:'Invalid signature'},401);
  try {
    const body=await req.text();
    const encoder=new TextEncoder();
    const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const bytes=Uint8Array.from(signature.match(/.{2}/g)!,hex=>parseInt(hex,16));
    if (!await crypto.subtle.verify('HMAC',key,bytes,encoder.encode(body))) return reply({error:'Invalid signature'},401);
    const payload=JSON.parse(body);
    const event=payload.event;
    if (!['payment.captured','payment.failed','refund.created','refund.processed','subscription.cancelled'].includes(event)) return reply({received:true,processed:false});
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (event==='payment.captured') {
      const {payment,userId}=await getCapturedPayment(payload.payload?.payment?.entity?.id);
      const {error}=await supabase.rpc('activate_verified_razorpay_payment',{p_user:userId,p_payment:payment.id,p_order:payment.order_id,p_amount:payment.amount,p_currency:payment.currency});
      if (error) throw new Error('Activation transaction failed');
      return reply({received:true,processed:true});
    }
    const eventId=req.headers.get('x-razorpay-event-id');
    if (!eventId || eventId.length>200) return reply({error:'Missing event identifier'},400);
    let userId: string; let paymentId: string|null=null; let amount=0; let currency='INR'; let fullRefund=false; let subscriptionId: string|null=null;
    if (event==='subscription.cancelled') {
      subscriptionId=payload.payload?.subscription?.entity?.id;
      if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) return reply({error:'Invalid subscription'},400);
      const subscription=await fetchRazorpay<{status:string}>(`subscriptions/${encodeURIComponent(subscriptionId)}`);
      if (subscription.status!=='cancelled') throw new Error('Subscription is not cancelled');
      const {data,error}=await supabase.from('profiles').select('id').eq('provider_subscription_id',subscriptionId).maybeSingle();
      if (error || !data) throw new Error('Subscription ownership could not be verified');
      userId=data.id;
    } else {
      const isRefund=event.startsWith('refund.');
      paymentId=isRefund?payload.payload?.refund?.entity?.payment_id:payload.payload?.payment?.entity?.id;
      const verified=await getOwnedPayment(paymentId!);
      userId=verified.userId; amount=verified.payment.amount; currency=verified.payment.currency;
      if (event==='payment.failed' && verified.payment.status!=='failed') throw new Error('Payment is not failed');
      // Fetch the authoritative payment after the signed event. Full refunds of
      // this entitlement's source payment revoke it; partial/created refunds do not.
      fullRefund=event==='refund.processed' && (verified.payment.amount_refunded || 0)>=verified.payment.amount;
    }
    const {error}=await supabase.rpc('record_verified_razorpay_event',{p_event:eventId,p_type:event,p_user:userId,p_payment:paymentId,p_amount:amount,p_currency:currency,p_full_refund:fullRefund,p_subscription:subscriptionId});
    if (error) throw new Error('Lifecycle transaction failed');
    return reply({received:true,processed:true});
  } catch {
    console.error('Verified webhook could not be processed; delivery should retry');
    return reply({error:'Webhook processing failed'},500);
  }
});
