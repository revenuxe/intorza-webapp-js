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

/**
 * Upload a file/blob to AWS S3 via the `s3-upload` Supabase edge function.
 * Returns the public S3 URL.
 */
export async function uploadToS3(
  file: File | Blob,
  kind: S3UploadKind = "generic",
  filename?: string,
): Promise<S3UploadResult> {
  const form = new FormData();
  const f =
    file instanceof File
      ? file
      : new File([file], filename ?? `upload-${Date.now()}`, {
          type: (file as Blob).type || "application/octet-stream",
        });
  form.append("file", f);
  form.append("kind", kind);
  if (filename) form.append("filename", filename);

  const { data, error } = await supabase.functions.invoke("s3-upload", {
    body: form,
  });

  if (error) throw error;
  if (!data?.url) throw new Error("S3 upload failed: missing url");
  return data as S3UploadResult;
}
