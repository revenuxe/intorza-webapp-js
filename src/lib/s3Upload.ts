import { supabase } from "@/integrations/supabase/client";

export type S3Folder = 
  | "logos" 
  | "signatures" 
  | "qr-codes" 
  | "room-photos" 
  | "invoices" 
  | "quotes" 
  | "documents"
  | "uploads";

interface UploadResult {
  url: string;
  success: boolean;
}

interface UploadOptions {
  folder: S3Folder;
  fileName?: string;
  contentType?: string;
}

/**
 * Upload a file to AWS S3 via the edge function
 */
export async function uploadToS3(file: File | Blob, options: UploadOptions): Promise<UploadResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options.folder);
  
  if (options.fileName) {
    formData.append("fileName", options.fileName);
  }

  const response = await supabase.functions.invoke("uploadToS3", {
    body: formData,
  });

  if (response.error) {
    throw new Error(response.error.message || "Upload failed");
  }

  return response.data as UploadResult;
}

/**
 * Upload a base64 encoded file to AWS S3
 */
export async function uploadBase64ToS3(
  base64Data: string, 
  options: UploadOptions
): Promise<UploadResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await supabase.functions.invoke("uploadToS3", {
    body: {
      data: base64Data,
      fileName: options.fileName,
      folder: options.folder,
      contentType: options.contentType,
    },
  });

  if (response.error) {
    throw new Error(response.error.message || "Upload failed");
  }

  return response.data as UploadResult;
}

/**
 * Delete a file from AWS S3
 */
export async function deleteFromS3(url: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const response = await supabase.functions.invoke("uploadToS3", {
    method: "DELETE",
    body: { url },
  });

  if (response.error) {
    console.error("Delete from S3 failed:", response.error);
  }
}

/**
 * Helper to get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "bin";
}

/**
 * Helper to generate a unique file name
 */
export function generateFileName(userId: string, originalName: string, prefix?: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const prefixStr = prefix ? `${prefix}-` : "";
  return `${userId}/${prefixStr}${timestamp}.${ext}`;
}
