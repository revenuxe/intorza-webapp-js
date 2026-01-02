import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Webhooks don't need CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();
    
    console.log('Webhook received, verifying signature...');

    // Verify webhook signature using Web Crypto API
    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(RAZORPAY_WEBHOOK_SECRET);
      const messageData = encoder.encode(body);
      
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
      const expectedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBytes)));
      
      if (expectedSignature !== signature) {
        console.error('Webhook signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.log('Webhook signature verified');
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;

    console.log('Processing webhook event:', event);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Extract user_id from notes
    let userId: string | null = null;
    if (paymentEntity?.notes?.user_id) {
      userId = paymentEntity.notes.user_id;
    } else if (subscriptionEntity?.notes?.user_id) {
      userId = subscriptionEntity.notes.user_id;
    }

    if (!userId) {
      console.log('No user_id in webhook payload, skipping...');
      return new Response(JSON.stringify({ received: true, processed: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check idempotency
    const eventId = paymentEntity?.id || subscriptionEntity?.id || `${event}_${Date.now()}`;
    const { data: existingLog } = await supabase
      .from('payment_logs')
      .select('id')
      .eq('provider_event_id', eventId)
      .single();

    if (existingLog) {
      console.log('Event already processed:', eventId);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process different events
    switch (event) {
      case 'payment.captured':
        console.log('Processing payment.captured for user:', userId);
        
        const proExpiry = new Date();
        proExpiry.setMonth(proExpiry.getMonth() + 1);

        await supabase
          .from('profiles')
          .update({
            is_pro: true,
            pro_since: new Date().toISOString(),
            pro_plan: 'monthly',
            pro_expiry: proExpiry.toISOString(),
            payment_status: 'active',
          })
          .eq('id', userId);

        await supabase
          .from('payment_logs')
          .insert({
            user_id: userId,
            provider: 'razorpay',
            event_type: event,
            provider_event_id: eventId,
            amount: paymentEntity?.amount,
            currency: paymentEntity?.currency,
            status: 'captured',
            raw_payload: payload,
          });

        await supabase
          .from('subscription_events')
          .insert({
            user_id: userId,
            event: 'subscription_activated_webhook',
            notes: `Payment captured via webhook: ${eventId}`,
            actor: 'webhook',
          });
        break;

      case 'payment.failed':
        console.log('Processing payment.failed for user:', userId);
        
        await supabase
          .from('profiles')
          .update({ payment_status: 'past_due' })
          .eq('id', userId);

        await supabase
          .from('payment_logs')
          .insert({
            user_id: userId,
            provider: 'razorpay',
            event_type: event,
            provider_event_id: eventId,
            amount: paymentEntity?.amount,
            currency: paymentEntity?.currency,
            status: 'failed',
            raw_payload: payload,
          });

        await supabase
          .from('subscription_events')
          .insert({
            user_id: userId,
            event: 'payment_failed',
            notes: `Payment failed: ${paymentEntity?.error_description || 'Unknown error'}`,
            actor: 'webhook',
          });
        break;

      case 'subscription.cancelled':
        console.log('Processing subscription.cancelled for user:', userId);
        
        // Don't revoke immediately - let them use until expiry
        await supabase
          .from('profiles')
          .update({ payment_status: 'canceled' })
          .eq('id', userId);

        await supabase
          .from('payment_logs')
          .insert({
            user_id: userId,
            provider: 'razorpay',
            event_type: event,
            provider_event_id: eventId,
            status: 'cancelled',
            raw_payload: payload,
          });

        await supabase
          .from('subscription_events')
          .insert({
            user_id: userId,
            event: 'subscription_cancelled',
            notes: 'Subscription cancelled - access until expiry',
            actor: 'webhook',
          });
        break;

      case 'refund.created':
        console.log('Processing refund for user:', userId);
        
        await supabase
          .from('profiles')
          .update({ 
            is_pro: false,
            payment_status: 'refunded' 
          })
          .eq('id', userId);

        await supabase
          .from('payment_logs')
          .insert({
            user_id: userId,
            provider: 'razorpay',
            event_type: event,
            provider_event_id: eventId,
            amount: payload.payload?.refund?.entity?.amount,
            currency: payload.payload?.refund?.entity?.currency,
            status: 'refunded',
            raw_payload: payload,
          });

        await supabase
          .from('subscription_events')
          .insert({
            user_id: userId,
            event: 'subscription_refunded',
            notes: 'Payment refunded - Pro access revoked',
            actor: 'webhook',
          });
        break;

      default:
        console.log('Unhandled event type:', event);
        await supabase
          .from('payment_logs')
          .insert({
            user_id: userId,
            provider: 'razorpay',
            event_type: event,
            provider_event_id: eventId,
            raw_payload: payload,
            status: 'unhandled',
          });
    }

    return new Response(JSON.stringify({ received: true, processed: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
