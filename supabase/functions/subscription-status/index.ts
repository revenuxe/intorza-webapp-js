import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get subscription status from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_pro, pro_since, pro_plan, pro_expiry, payment_status, provider_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ 
        isPro: false,
        plan: null,
        expiry: null,
        status: 'inactive'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if subscription is expired
    let isPro = profile?.is_pro || false;
    if (isPro && profile?.pro_expiry) {
      const expiry = new Date(profile.pro_expiry);
      if (expiry < new Date()) {
        isPro = false;
        // Update profile if expired
        await supabase
          .from('profiles')
          .update({ 
            is_pro: false,
            payment_status: 'expired'
          })
          .eq('id', user.id);
      }
    }

    return new Response(JSON.stringify({
      isPro,
      proSince: profile?.pro_since,
      plan: profile?.pro_plan,
      expiry: profile?.pro_expiry,
      status: profile?.payment_status || 'inactive',
      subscriptionId: profile?.provider_subscription_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching subscription status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
