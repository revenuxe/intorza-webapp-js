import { supabase } from "@/integrations/supabase/client";
import { storageObjectPath } from './storage-path';

export type StorageUploadKind =
  | "logo"
  | "signature"
  | "gallery"
  | "room"
  | "qr"
  | "hero"
  | "generic";

export interface StorageUploadResult {
  key: string;
  url: string;
  bucket: string;
}

const BUCKETS: Record<StorageUploadKind, string> = {
  logo: "company-logos",
  signature: "company-logos",
  qr: "company-logos",
  hero: "company-logos",
  generic: "company-logos",
  gallery: "gallery-images",
  room: "room-photos",
};

const FOLDERS: Record<StorageUploadKind, string> = {
  logo: "logos",
  signature: "signatures",
  qr: "payment-qr",
  hero: "hero-banners",
  generic: "uploads",
  gallery: "gallery",
  room: "rooms",
};

const MAX_DIMENSION: Record<StorageUploadKind, number> = {
  logo: 800,
  signature: 800,
  qr: 800,
  hero: 1920,
  generic: 1600,
  gallery: 1600,
  room: 1600,
};

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);

const loadBitmap = async (file: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};

/**
 * Resize + re-encode large phone photos before upload.
 * Returns the original blob when the browser can't decode it (e.g. HEIC).
 */
async function compressImage(
  file: File | Blob,
  maxDim: number,
  transparent: boolean,
): Promise<{ blob: Blob; ext: string; contentType: string } | null> {
  try {
    const bitmap = await loadBitmap(file);
    const w = (bitmap as ImageBitmap).width;
    const h = (bitmap as ImageBitmap).height;
    if (!w || !h) return null;

    const scale = Math.min(1, maxDim / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (!transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    const type = transparent ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, transparent ? undefined : 0.85),
    );
    if (!blob) return null;
    return {
      blob,
      ext: transparent ? "png" : "jpg",
      contentType: type,
    };
  } catch {
    return null;
  }
}

/**
 * Upload a file/blob to Supabase Storage and return its public URL.
 * Files are stored under `<user-id>/<folder>/<filename>` so storage
 * policies scoped to the owner's folder keep working.
 */
export async function uploadToStorage(
  file: File | Blob,
  kind: StorageUploadKind = "generic",
  filename?: string,
): Promise<StorageUploadResult> {
  // getSession reads the local session (works on flaky mobile networks);
  // fall back to a server check only if it's missing.
  const { data: sessionData } = await supabase.auth.getSession();
  let userId = sessionData?.session?.user?.id;
  if (!userId) {
    const { data: auth } = await supabase.auth.getUser();
    userId = auth?.user?.id;
  }
  if (!userId) throw new Error("Please sign in before uploading a file.");
  if (!file.size) throw new Error('The selected file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Please choose an image under 15 MB.');

  const original =
    filename ?? (file instanceof File ? file.name : `upload-${Date.now()}`);
  let ext = (original.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "bin";

  const declaredType = (file as File).type || "";
  if (!['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'].includes(declaredType)) {
    throw new Error('Please choose a JPG, PNG, WebP, GIF, or HEIC image.');
  }
  const looksLikeImage =
    declaredType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext);

  let payload: Blob = file;
  let contentType =
    declaredType || `image/${ext === "jpg" ? "jpeg" : ext}`;

  if (looksLikeImage && ext !== "svg") {
    const transparent = ext === "png" || declaredType === "image/png";
    const compressed = await compressImage(
      file,
      MAX_DIMENSION[kind] ?? 1600,
      transparent,
    );
    if (compressed) {
      payload = compressed.blob;
      ext = compressed.ext;
      contentType = compressed.contentType;
    } else if (["heic", "heif"].includes(ext)) {
      throw new Error(
        "This photo format (HEIC) isn't supported. On iPhone, set Camera > Formats to 'Most Compatible', or pick a JPG/PNG image.",
      );
    }
  }

  if (payload.size > MAX_UPLOAD_BYTES) {
    throw new Error("This file is too large. Please choose an image under 15 MB.");
  }

  const bucket = BUCKETS[kind] ?? BUCKETS.generic;
  const folder = FOLDERS[kind] ?? FOLDERS.generic;
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${userId}/${folder}/${sanitize(base)}`;

  const { error } = await supabase.storage.from(bucket).upload(key, payload, {
    upsert: false,
    cacheControl: "31536000",
    contentType,
  });

  if (error) {
    const msg = (error as any)?.message || "Upload failed";
    if (/row-level security|Unauthorized|403/i.test(msg)) {
      throw new Error("Your session expired. Please sign in again and retry the upload.");
    }
    if (/exceeded the maximum allowed size|Payload too large|413/i.test(msg)) {
      throw new Error("This file is too large for storage. Please choose a smaller image.");
    }
    throw new Error(msg);
  }

  if (bucket === "room-photos") {
    // Private bucket — hand back a long-lived signed URL instead.
    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 3600);
    if (signErr || !signed?.signedUrl) {
      try { await removeStoredUpload({ bucket, key }); } catch (error) { console.error('Upload cleanup failed', error); }
      throw new Error(signErr?.message || "Could not create file link");
    }
    return { key, url: signed.signedUrl, bucket };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  if (!data?.publicUrl) throw new Error("Upload succeeded but URL is missing");

  return { key, url: data.publicUrl, bucket };
}

export async function removeStoredUpload(upload: Pick<StorageUploadResult, 'bucket' | 'key'>) {
  const { error } = await supabase.storage.from(upload.bucket).remove([upload.key]);
  if (error) throw error;
}

/** Commit a storage upload's DB reference; compensate if the DB save fails. */
export async function uploadAndSave<T>(file: File | Blob, kind: StorageUploadKind, save: (upload: StorageUploadResult) => Promise<T>) {
  const upload = await uploadToStorage(file, kind);
  try { return await save(upload); }
  catch (error) {
    try { await removeStoredUpload(upload); }
    catch (cleanupError) { console.error('Could not clean up unreferenced upload', cleanupError); }
    throw error;
  }
}

export async function resolveRoomPhotoUrl(value: string) {
  const key = storageObjectPath(value, 'room-photos');
  if (!key) throw new Error('Room photo does not reference Supabase Storage.');
  const { data, error } = await supabase.storage.from('room-photos').createSignedUrl(key, 3600);
  if (error || !data?.signedUrl) throw error || new Error('Could not open room photo.');
  return data.signedUrl;
}
