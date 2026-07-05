// S3 upload edge function — receives file via multipart form, uploads to S3 using SigV4,
// returns public URL. Uses Supabase secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// AWS_REGION, AWS_BUCKET.

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AWS_REGION = Deno.env.get("AWS_REGION") ?? "ap-south-1";
const AWS_BUCKET = Deno.env.get("AWS_BUCKET")!;
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;

const aws = new AwsClient({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
  service: "s3",
});

const s3Url = (key: string) =>
  `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURI(key)}`;

const publicUrl = (key: string) => s3Url(key);

// Folder prefix per upload type (matches the S3 storage org memory)
const PREFIXES: Record<string, string> = {
  logo: "company-logos",
  signature: "signatures",
  gallery: "gallery",
  room: "room-photos",
  qr: "payment-qr",
  generic: "uploads",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authn
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsRes, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsRes?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsRes.claims.sub as string;

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "generic");
    const customName = form.get("filename") ? String(form.get("filename")) : null;

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "file is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (25MB max)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prefix = PREFIXES[kind] ?? PREFIXES.generic;
    const ext =
      (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "bin";
    const base = customName
      ? customName.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const key = `${prefix}/${userId}/${base}`;

    const body = new Uint8Array(await file.arrayBuffer());
    const putRes = await aws.fetch(s3Url(key), {
      method: "PUT",
      body,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error("S3 PUT failed", putRes.status, text);
      return new Response(
        JSON.stringify({ error: "S3 upload failed", status: putRes.status }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ key, url: publicUrl(key), bucket: AWS_BUCKET }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("s3-upload error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
