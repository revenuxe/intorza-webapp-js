import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// S3 configuration from environment
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;
const AWS_REGION = Deno.env.get("AWS_REGION") || "ap-south-1";
const AWS_BUCKET = Deno.env.get("AWS_BUCKET") || "revenuxe-intorza-prod";

// Helper to create AWS signature
function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode("AWS4" + key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then(k => crypto.subtle.sign("HMAC", k, enc.encode(dateStamp)))
    .then(kDate => crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]))
    .then(k => crypto.subtle.sign("HMAC", k, enc.encode(regionName)))
    .then(kRegion => crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]))
    .then(k => crypto.subtle.sign("HMAC", k, enc.encode(serviceName)))
    .then(kService => crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]))
    .then(k => crypto.subtle.sign("HMAC", k, enc.encode("aws4_request")));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return toHex(hash);
}


async function uploadToS3(
  fileData: Uint8Array,
  fileName: string,
  contentType: string,
  folder: string
): Promise<string> {
  const service = "s3";
  const host = `${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
  const key = `${folder}/${fileName}`;
  const endpoint = `https://${host}/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(fileData);
  const canonicalUri = "/" + key;
  const canonicalQuerystring = "";
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = 
    `PUT\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, service);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", signingKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode(stringToSign)
  );
  const signature = toHex(signatureBuffer);

  const authorizationHeader = 
    `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authorizationHeader,
    },
    body: fileData.buffer as ArrayBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("S3 upload failed:", response.status, errorText);
    throw new Error(`S3 upload failed: ${response.status} - ${errorText}`);
  }

  // Return the public URL
  return endpoint;
}

async function deleteFromS3(fileUrl: string): Promise<void> {
  // Extract the key from the URL
  const urlPattern = new RegExp(`https://${AWS_BUCKET}\\.s3\\.${AWS_REGION}\\.amazonaws\\.com/(.+)`);
  const match = fileUrl.match(urlPattern);
  if (!match) {
    console.log("Could not parse S3 URL for deletion:", fileUrl);
    return;
  }

  const key = decodeURIComponent(match[1]);
  const service = "s3";
  const host = `${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}/${key}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256(new Uint8Array(0));
  const canonicalUri = "/" + key;
  const canonicalQuerystring = "";
  const canonicalHeaders = 
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = 
    `DELETE\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(new TextEncoder().encode(canonicalRequest));
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, service);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", signingKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    new TextEncoder().encode(stringToSign)
  );
  const signature = toHex(signatureBuffer);

  const authorizationHeader = 
    `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      "Host": host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authorizationHeader,
    },
  });

  if (!response.ok && response.status !== 204) {
    console.error("S3 delete failed:", response.status, await response.text());
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle DELETE request
    if (req.method === "DELETE") {
      const { url } = await req.json();
      if (url) {
        await deleteFromS3(url);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle POST request (file upload)
    if (req.method === "POST") {
      let fileData: Uint8Array;
      let fileName: string;
      let fileContentType: string;
      let folder: string;

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        folder = (formData.get("folder") as string) || "uploads";
        const customFileName = formData.get("fileName") as string | null;

        if (!file) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        fileData = new Uint8Array(await file.arrayBuffer());
        fileContentType = file.type || "application/octet-stream";
        
        // Generate unique filename
        const ext = file.name.split(".").pop() || "bin";
        fileName = customFileName || `${user.id}/${Date.now()}.${ext}`;
      } else {
        // JSON body with base64 data
        const body = await req.json();
        const { data, fileName: name, folder: f, contentType: ct } = body;

        if (!data) {
          return new Response(JSON.stringify({ error: "No file data provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Decode base64
        const base64Data = data.includes(",") ? data.split(",")[1] : data;
        fileData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        fileName = name || `${user.id}/${Date.now()}`;
        folder = f || "uploads";
        fileContentType = ct || "application/octet-stream";
      }

      console.log(`Uploading file: ${folder}/${fileName}, size: ${fileData.length}, type: ${fileContentType}`);

      const publicUrl = await uploadToS3(fileData, fileName, fileContentType, folder);

      console.log(`Upload successful: ${publicUrl}`);

      return new Response(
        JSON.stringify({ url: publicUrl, success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in uploadToS3:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
