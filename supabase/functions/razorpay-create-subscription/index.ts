import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Plan configuration - First month free, then ₹49/month autopay
const PLAN_CONFIG = {
  monthly: {
    amount: 4900, // ₹49 in paise
    currency: 'INR',
    period: 'monthly',
    interval: 1,
    name: 'Intorza Pro Monthly',
    description: 'First month FREE, then ₹49/month',
    trialDays: 30, // 1 month free trial
  }
};

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

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan = 'monthly' } = await req.json();
    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    
    if (!planConfig) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already Pro
    if (profile.is_pro && profile.pro_expiry && new Date(profile.pro_expiry) > new Date()) {
      return new Response(JSON.stringify({ error: 'Already subscribed', isPro: true }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Create or get Razorpay customer
    let customerId = profile.provider_customer_id;
    
    if (!customerId) {
      console.log('Creating Razorpay customer for user:', user.id);
      const customerResponse = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${razorpayAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profile.full_name || profile.company_name || 'Customer',
          email: profile.email || user.email,
          contact: profile.phone || '',
          notes: {
            user_id: user.id,
          }
        }),
      });

      const customerData = await customerResponse.json();
      console.log('Customer creation response:', customerData);
      
      if (!customerResponse.ok) {
        throw new Error(`Failed to create customer: ${JSON.stringify(customerData)}`);
      }
      
      customerId = customerData.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ provider_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create or get Razorpay Plan for subscription
    // First, try to find existing plan or create one
    let planId = Deno.env.get('RAZORPAY_PLAN_ID');
    
    if (!planId) {
      console.log('Creating Razorpay plan');
      const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${razorpayAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: planConfig.period,
          interval: planConfig.interval,
          item: {
            name: planConfig.name,
            amount: planConfig.amount,
            currency: planConfig.currency,
            description: planConfig.description,
          }
        }),
      });

      const planData = await planResponse.json();
      console.log('Plan creation response:', planData);
      
      if (!planResponse.ok) {
        // If plan exists, we'll use orders instead
        console.log('Plan creation failed, using orders instead');
      } else {
        planId = planData.id;
      }
    }

    // Create Razorpay Subscription with trial period
    if (planId) {
      console.log('Creating Razorpay subscription with trial');
      const subscriptionResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${razorpayAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          customer_id: customerId,
          total_count: 120, // 10 years max
          quantity: 1,
          customer_notify: 1,
          start_at: Math.floor(Date.now() / 1000) + (planConfig.trialDays * 24 * 60 * 60), // Start charging after trial
          notes: {
            user_id: user.id,
            plan: plan,
            trial: 'true',
          }
        }),
      });

      const subscriptionData = await subscriptionResponse.json();
      console.log('Subscription creation response:', subscriptionData);

      if (subscriptionResponse.ok && subscriptionData.id) {
        // Save subscription ID
        await supabase
          .from('profiles')
          .update({ 
            provider_subscription_id: subscriptionData.id,
            payment_status: 'trial',
          })
          .eq('id', user.id);

        // Log subscription event
        await supabase
          .from('subscription_events')
          .insert({
            user_id: user.id,
            event: 'trial_started',
            notes: `Plan: ${plan}, Subscription ID: ${subscriptionData.id}, Trial: ${planConfig.trialDays} days`,
            actor: 'system',
          });

        return new Response(JSON.stringify({
          subscriptionId: subscriptionData.id,
          customerId: customerId,
          keyId: RAZORPAY_KEY_ID,
          plan: plan,
          trial: true,
          trialDays: planConfig.trialDays,
          prefill: {
            name: profile.full_name || profile.company_name || '',
            email: profile.email || user.email || '',
            contact: profile.phone || '',
          },
          notes: {
            user_id: user.id,
            plan: plan,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback to order-based flow (first month free, manual subscription setup)
    console.log('Using order-based flow with trial activation');
    
    // For trial, we create a zero-amount order or directly activate trial
    // Activate trial immediately without payment
    const trialExpiryDate = new Date();
    trialExpiryDate.setDate(trialExpiryDate.getDate() + PLAN_CONFIG.monthly.trialDays);
    
    // Update profile to trial status
    await supabase
      .from('profiles')
      .update({
        is_pro: true,
        pro_plan: 'monthly',
        pro_since: new Date().toISOString(),
        pro_expiry: trialExpiryDate.toISOString(),
        payment_provider: 'razorpay',
        payment_status: 'trial',
      })
      .eq('id', user.id);

    // Log trial start event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: user.id,
        event: 'trial_started',
        notes: `Plan: ${plan}, Trial ends: ${trialExpiryDate.toISOString()}`,
        actor: 'system',
      });

    // Create an order for ₹1 authorization (refundable) to verify payment method
    // Autopay of ₹49/month will start after trial ends
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100, // ₹1 in paise - refundable authorization
        currency: planConfig.currency,
        receipt: `auth_${user.id.substring(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          user_id: user.id,
          plan: plan,
          type: 'authorization',
          trial: 'true',
          autopay_amount: planConfig.amount, // ₹49 will be charged after trial
        }
      }),
    });

    const orderData = await orderResponse.json();
    console.log('Order creation response for autopay:', orderData);
    
    if (!orderResponse.ok) {
      // Trial already activated, just return success
      return new Response(JSON.stringify({
        trial: true,
        trialActivated: true,
        trialDays: planConfig.trialDays,
        trialExpiry: trialExpiryDate.toISOString(),
        message: 'Trial activated! Set up autopay to continue after trial.',
        customerId: customerId,
        keyId: RAZORPAY_KEY_ID,
        plan: plan,
        prefill: {
          name: profile.full_name || profile.company_name || '',
          email: profile.email || user.email || '',
          contact: profile.phone || '',
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      orderId: orderData.id,
      customerId: customerId,
      amount: 100, // ₹1 authorization amount
      currency: planConfig.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: plan,
      trial: true,
      trialActivated: true,
      trialDays: planConfig.trialDays,
      trialExpiry: trialExpiryDate.toISOString(),
      prefill: {
        name: profile.full_name || profile.company_name || '',
        email: profile.email || user.email || '',
        contact: profile.phone || '',
      },
      notes: {
        user_id: user.id,
        plan: plan,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error creating subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
