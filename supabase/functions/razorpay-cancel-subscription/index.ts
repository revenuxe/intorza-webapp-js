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

    // Check if user has active subscription
    if (!profile.is_pro) {
      return new Response(JSON.stringify({ error: 'No active subscription' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // If there's a Razorpay subscription, cancel it
    if (profile.provider_subscription_id) {
      console.log('Cancelling Razorpay subscription:', profile.provider_subscription_id);
      
      const cancelResponse = await fetch(
        `https://api.razorpay.com/v1/subscriptions/${profile.provider_subscription_id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${razorpayAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cancel_at_cycle_end: true, // Cancel at end of billing cycle
          }),
        }
      );

      const cancelData = await cancelResponse.json();
      console.log('Cancellation response:', cancelData);

      if (!cancelResponse.ok && cancelResponse.status !== 400) {
        // 400 might mean already cancelled
        console.error('Failed to cancel Razorpay subscription:', cancelData);
      }
    }

    // Update profile - keep Pro until expiry but mark as cancelled
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        payment_status: 'cancelled',
        // Keep is_pro true until pro_expiry date
        // The subscription-status function will handle expiry
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update subscription status');
    }

    // Log cancellation event
    await supabase
      .from('subscription_events')
      .insert({
        user_id: user.id,
        event: 'subscription_cancelled',
        notes: `Cancelled by user. Pro access until: ${profile.pro_expiry}`,
        actor: 'user',
      });

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription cancelled. You will retain Pro access until your current period ends.',
      proExpiry: profile.pro_expiry,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error cancelling subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

