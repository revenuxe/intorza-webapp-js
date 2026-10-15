import { supabase } from '@/integrations/supabase/client';
import { storageObjectPath } from './storage-path';

/** Resolve durable keys and legacy public/signed links under the current user's RLS. */
export async function resolveCompanyAssetUrl(value: string): Promise<string> {
  if (!value || /^(data:|blob:)/i.test(value)) return value;
  const key = storageObjectPath(value, 'company-logos');
  if (!key) return value; // Other image providers and buckets.
  const { data, error } = await supabase.storage.from('company-logos').createSignedUrl(key, 3600);
  if (error || !data?.signedUrl) throw error || new Error('Could not open company image.');
  return data.signedUrl;
}
