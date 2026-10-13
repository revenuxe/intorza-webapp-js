export function resolvePublicSupabase(environment, defaults) {
  const urlOverride = environment.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const keyOverride = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (Boolean(urlOverride) !== Boolean(keyOverride)) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY together.');
  }
  const url = urlOverride || defaults.url;
  const publishableKey = keyOverride || defaults.publishableKey;
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Supabase URL must be a valid HTTPS URL.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Supabase URL must be an HTTPS origin (HTTP is allowed for localhost only).');
  }
  if (!publishableKey || publishableKey.startsWith('sb_secret_')) {
    throw new Error('Use a Supabase publishable or anon key, never a secret/service-role key.');
  }
  if (!publishableKey.startsWith('sb_publishable_')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString()); }
    catch { throw new Error('Supabase key must be a publishable key or an anon JWT.'); }
    if (claims.role !== 'anon') throw new Error('Only an anon JWT can be exposed to the browser.');
    if (parsed.hostname.endsWith('.supabase.co') && claims.ref && parsed.hostname !== `${claims.ref}.supabase.co`) {
      throw new Error('Supabase URL and anon key belong to different projects.');
    }
  }
  return { url: parsed.origin, publishableKey, source: urlOverride ? 'environment' : 'public defaults' };
}
