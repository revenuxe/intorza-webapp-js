export async function POST() {
  return Response.json({ error: 'Gemini Live is disabled. Use the OpenAI quotation assistant.', code: 'AI_PROVIDER_DISABLED' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
