import { supabase } from "@/integrations/supabase/client";

export type S3UploadKind =
  | "logo"
  | "signature"
  | "gallery"
  | "room"
  | "qr"
  | "hero"
  | "generic";

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

const BUCKETS: Record<S3UploadKind, string> = {
  logo: "company-logos",
  signature: "company-logos",
  qr: "company-logos",
  hero: "company-logos",
  generic: "company-logos",
  gallery: "gallery-images",
  room: "room-photos",
};

const FOLDERS: Record<S3UploadKind, string> = {
  logo: "logos",
  signature: "signatures",
  qr: "payment-qr",
  hero: "hero-banners",
  generic: "uploads",
  gallery: "gallery",
  room: "rooms",
};

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

/**
 * Upload a file/blob to Supabase Storage and return its public URL.
 * Files are stored under `<user-id>/<folder>/<filename>` so storage
 * policies scoped to the owner's folder keep working.
 */
export async function uploadToS3(
  file: File | Blob,
  kind: S3UploadKind = "generic",
  filename?: string,
): Promise<S3UploadResult> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("You must be signed in to upload files.");

  const original =
    filename ?? (file instanceof File ? file.name : `upload-${Date.now()}`);
  const ext = (original.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "bin";

  const bucket = BUCKETS[kind] ?? BUCKETS.generic;
  const folder = FOLDERS[kind] ?? FOLDERS.generic;
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${userId}/${folder}/${sanitize(base)}`;

  const contentType =
    (file as File).type || `image/${ext === "jpg" ? "jpeg" : ext}`;

  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    upsert: true,
    cacheControl: "31536000",
    contentType,
  });

  if (error) throw new Error(error.message || "Upload failed");

  if (bucket === "room-photos") {
    // Private bucket — hand back a long-lived signed URL instead.
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) {
      throw new Error(signErr?.message || "Could not create file link");
    }
    return { key, url: signed.signedUrl, bucket };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  if (!data?.publicUrl) throw new Error("Upload succeeded but URL is missing");

  return { key, url: data.publicUrl, bucket };
}
