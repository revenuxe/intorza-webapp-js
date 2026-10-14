/** @jest-environment node */
import { POST } from './route';
it('disables Gemini token issuance', async () => { const response = await POST(); expect(response.status).toBe(410); expect((await response.json()).code).toBe('AI_PROVIDER_DISABLED'); });
