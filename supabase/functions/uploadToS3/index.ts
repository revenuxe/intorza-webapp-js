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

// Allowed folders for S3 uploads - whitelist validation
const ALLOWED_FOLDERS = new Set([
  "logos",
  "signatures", 
  "qr-codes",
  "room-photos",
  "invoices",
  "quotes",
  "documents",
  "uploads"
]);

// Allowed file extensions - prevent executable uploads
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "svg", // images
  "pdf", "doc", "docx", "xls", "xlsx", // documents
  "mp4", "mov", "avi", // videos
  "mp3", "wav", // audio
]);

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Sanitize file path to prevent path traversal attacks
 * Removes dangerous characters and sequences
 */
function sanitizeFileName(fileName: string): string {
  // Remove path traversal sequences
  let sanitized = fileName
    .replace(/\.\./g, "") // Remove ..
    .replace(/\/+/g, "/") // Collapse multiple slashes
    .replace(/\\/g, "/") // Convert backslashes
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/[<>:"|?*]/g, ""); // Remove dangerous characters
  
  // Extract just the filename if a path was provided
  const parts = sanitized.split("/");
  sanitized = parts[parts.length - 1];
  
  // Ensure not empty
  if (!sanitized || sanitized.length === 0) {
    return `file_${Date.now()}`;
  }
  
  return sanitized;
}

/**
 * Validate folder is in the allowed list
 */
function validateFolder(folder: string): string {
  const sanitized = folder.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
  if (ALLOWED_FOLDERS.has(sanitized)) {
    return sanitized;
  }
  return "uploads"; // Default to uploads if invalid
}

/**
 * Validate file extension
 */
function validateFileExtension(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSIONS.has(ext);
}

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
        const rawFolder = (formData.get("folder") as string) || "uploads";
        const customFileName = formData.get("fileName") as string | null;

        if (!file) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        fileData = new Uint8Array(await file.arrayBuffer());
        fileContentType = file.type || "application/octet-stream";
        
        // SECURITY: Validate folder against whitelist
        folder = validateFolder(rawFolder);
        
        // SECURITY: Validate file size
        if (fileData.length > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: "File too large. Maximum size is 50MB." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Generate unique filename with sanitization
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const sanitizedCustomName = customFileName ? sanitizeFileName(customFileName) : null;
        
        // SECURITY: Validate file extension
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return new Response(JSON.stringify({ error: `File type .${ext} is not allowed` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // SECURITY: Force user ID prefix to prevent overwriting other users' files
        fileName = sanitizedCustomName 
          ? `${user.id}/${sanitizeFileName(sanitizedCustomName)}`
          : `${user.id}/${Date.now()}.${ext}`;
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
        
        // SECURITY: Validate folder against whitelist
        folder = validateFolder(f || "uploads");
        
        // SECURITY: Validate file size
        if (fileData.length > MAX_FILE_SIZE) {
          return new Response(JSON.stringify({ error: "File too large. Maximum size is 50MB." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // SECURITY: Sanitize fileName and force user ID prefix
        const sanitizedName = name ? sanitizeFileName(name) : `${Date.now()}`;
        fileName = `${user.id}/${sanitizedName}`;
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
