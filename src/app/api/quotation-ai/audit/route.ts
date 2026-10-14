import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
const schema = z.object({ conversationId: z.string().uuid(), language: z.enum(['en-IN', 'hi-IN', 'hi-IN-native']), transcript: z.string().trim().min(1).max(3000), reply: z.string().trim().min(1).max(1500), focus: z.string().max(80).optional(), changed: z.boolean(), outcome: z.record(z.unknown()).optional() }).strict();
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return Response.json({ error: 'Sign in to save AI history.' }, { status: 401 });
  const auth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: user } = await auth.auth.getUser(token); if (!user.user) return Response.json({ error: 'Sign in again.' }, { status: 401 });
  const input = schema.safeParse(await request.json().catch(() => null)); if (!input.success) return Response.json({ error: 'Invalid AI history entry.' }, { status: 400 });
  const { error } = await (auth.from('quotation_ai_turns' as any) as any).insert({ user_id: user.user.id, conversation_id: input.data.conversationId, language: input.data.language, transcript: input.data.transcript, assistant_reply: input.data.reply, focus: input.data.focus || null, changed: input.data.changed, outcome: input.data.outcome || {} });
  return error ? Response.json({ error: 'Could not save AI history.' }, { status: 500 }) : new Response(null, { status: 204 });
}
