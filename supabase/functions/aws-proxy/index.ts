import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

const AWS_API_BASE_URL = "https://bqqxbtxch3.execute-api.ap-south-1.amazonaws.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token with Supabase to avoid an open proxy
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.searchParams.get("path");

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing 'path' query param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const targetUrl = `${AWS_API_BASE_URL}${normalizedPath}`;

    const shouldForwardBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
    const body = shouldForwardBody ? await req.text() : undefined;

    const awsResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") ?? "application/json",
        "Authorization": authHeader,
      },
      body,
    });

    const responseText = await awsResponse.text();

    return new Response(responseText, {
      status: awsResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": awsResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("aws-proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
