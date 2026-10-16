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

// Plan configuration - dynamic based on country
const PLAN_CONFIG = {
  monthly: {
    INR: {
      amount: 49900, // 100 paise (â‚¹1) - Razorpay minimum for India
      currency: 'INR',
    },
    USD: {
      amount: 100, // 100 cents ($1) - for international users
      currency: 'USD',
    },
    name: 'Intorza Pro',

  }
};

// Countries that use INR pricing (India only)
const INR_COUNTRIES = ['IN'];

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

    const { data: allowed, error: limitError } = await supabase.rpc('consume_user_api_limit', { p_user: user.id, p_operation: 'razorpay-create-subscription' });
    if (limitError) throw new Error('Request limit could not be checked');
    if (!allowed) return new Response(JSON.stringify({ error: 'Too many payment attempts. Please wait a minute.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } });
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

    // Determine pricing based on user's country
    const userCountry = profile.country_code || 'IN';
    const useINR = INR_COUNTRIES.includes(userCountry);
    const pricing = useINR ? planConfig.INR : planConfig.USD;
    
    console.log(`User country: ${userCountry}, Using ${pricing.currency} pricing: ${pricing.amount}`);

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

    // Create order with country-appropriate pricing
    console.log(`Creating order for Pro activation: ${pricing.amount} ${pricing.currency}`);
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: pricing.amount,
        currency: pricing.currency,
        receipt: `pro_${user.id.substring(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          user_id: user.id,
          plan: plan,
          type: 'pro_activation',
          country: userCountry,
        }
      }),
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      throw new Error(`Failed to create order: ${JSON.stringify(orderData)}`);
    }

    return new Response(JSON.stringify({
      orderId: orderData.id,
      customerId: customerId,
      amount: pricing.amount,
      currency: pricing.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: plan,
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
