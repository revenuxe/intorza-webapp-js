import { filesApi } from "@/lib/api";

export type S3UploadKind =
  | "logo" | "signature" | "gallery" | "room" | "qr" | "invoice" | "quotation" | "generic";

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

/**
 * Direct-to-S3 upload via backend-issued presigned PUT URL.
 * No Supabase storage and no edge functions involved.
 */
export async function uploadToS3(
  file: File | Blob,
  kind: S3UploadKind = "generic",
  filename?: string,
): Promise<S3UploadResult> {
  const f =
    file instanceof File
      ? file
      : new File([file], filename ?? `upload-${Date.now()}`, {
          type: (file as Blob).type || "application/octet-stream",
        });

  const { data: signed } = await filesApi.signUpload({
    kind,
    filename: f.name,
    contentType: f.type || "application/octet-stream",
    size: f.size,
  });

  const putRes = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: signed.headers,
    body: f,
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  return { key: signed.key, url: signed.url, bucket: signed.bucket };
}
