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

// Plan configuration - 30 days Pro for ₹0.50 token payment
const PLAN_CONFIG = {
  monthly: {
    amount: 50, // 50 paise (₹0.50) token amount
    currency: 'INR',
    name: 'Intorza Pro',
    trialDays: 30,
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

    // Create simple one-time order for ₹0.50 (50 paise)
    // This enables ALL payment methods (UPI, cards, netbanking, wallets)
    console.log('Creating simple order for Pro activation');
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: planConfig.amount, // 50 paise
        currency: planConfig.currency,
        receipt: `pro_${user.id.substring(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          user_id: user.id,
          plan: plan,
          type: 'pro_activation',
        }
      }),
    });

    const orderData = await orderResponse.json();
    console.log('Order creation response:', orderData);
    
    if (!orderResponse.ok) {
      throw new Error(`Failed to create order: ${JSON.stringify(orderData)}`);
    }

    return new Response(JSON.stringify({
      orderId: orderData.id,
      customerId: customerId,
      amount: planConfig.amount,
      currency: planConfig.currency,
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

  } catch (error: unknown) {
    console.error('Error creating order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
