import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_subscription_id,
      razorpay_signature,
      plan = 'monthly',
    } = await req.json();

    console.log('Verifying payment:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_subscription_id,
      user_id: user.id,
    });

    // Determine signature payload based on flow (order vs subscription)
    let signaturePayload = '';
    if (razorpay_order_id && razorpay_payment_id) {
      // Order-based payment: order_id|payment_id
      signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    } else if (razorpay_subscription_id && razorpay_payment_id) {
      // Subscription-based payment: payment_id|subscription_id
      signaturePayload = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    } else {
      console.error('Invalid payment details, missing IDs');
      return new Response(JSON.stringify({ error: 'Invalid payment details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(RAZORPAY_KEY_SECRET!);
    const messageData = encoder.encode(signaturePayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const expectedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signature)));

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Signature verified successfully');
    // Check for idempotency
    const { data: existingLog } = await supabase
      .from('payment_logs')
      .select('id')
      .eq('provider_event_id', razorpay_payment_id)
      .single();

    if (existingLog) {
      console.log('Payment already processed:', razorpay_payment_id);
      // Still return success but note it was already processed
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro, pro_expiry')
        .eq('id', user.id)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        isPro: profile?.is_pro,
        proExpiry: profile?.pro_expiry,
        message: 'Payment already processed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate expiry (30 days from now for monthly)
    const proExpiry = new Date();
    proExpiry.setMonth(proExpiry.getMonth() + 1);

    // Update user profile to Pro
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_since: new Date().toISOString(),
        pro_plan: plan,
        pro_expiry: proExpiry.toISOString(),
        payment_status: 'active',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      throw new Error('Failed to activate subscription');
    }

    console.log('Profile updated to Pro for user:', user.id);

    // Log the payment (₹0.50 token)
    await supabase
      .from('payment_logs')
      .insert({
        user_id: user.id,
        provider: 'razorpay',
        event_type: 'pro_activation',
        provider_event_id: razorpay_payment_id,
        amount: 50, // 50 paise token amount
        currency: 'INR',
        status: 'captured',
        raw_payload: {
          order_id: razorpay_order_id,
          subscription_id: razorpay_subscription_id,
          payment_id: razorpay_payment_id,
          plan: plan,
          type: 'pro_activation',
        },
      });

    // Log subscription event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: user.id,
        event: 'pro_activated',
        notes: `Plan: ${plan}, Payment ID: ${razorpay_payment_id}, Amount: ₹0.50`,
        actor: 'system',
      });

    console.log('Payment logged and subscription activated');

    return new Response(JSON.stringify({ 
      success: true, 
      isPro: true,
      proExpiry: proExpiry.toISOString(),
      message: 'Subscription activated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error verifying payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
