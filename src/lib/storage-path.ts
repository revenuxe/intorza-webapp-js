/** Supports durable object keys and existing Supabase public/signed URLs. */
export function storageObjectPath(value: string, bucket: string): string | null {
  if (!value) return null;
  let key = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const prefix = `/storage/v1/object/`;
      const suffix = ['public', 'sign', 'authenticated'].map(mode => `${prefix}${mode}/${bucket}/`).find(part => url.pathname.startsWith(part));
      if (!suffix) return null;
      key = decodeURIComponent(url.pathname.slice(suffix.length));
    } catch { return null; }
  }
  if (!key || key.startsWith('/') || key.includes('?') || key.includes('#') || key.includes('\\') || key.split('/').some(part => !part || part === '..' || part === '.')) return null;
  return key;
}
