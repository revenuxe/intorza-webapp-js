/** @jest-environment node */
import { protectAppRequest } from './request-protection.mjs';

const request = (path = '/auth') => new Request(`https://app.intorza.com${path}`, {
  headers: { 'CF-Connecting-IP': '192.0.2.1', 'X-Forwarded-For': 'fake' },
});
describe('Edge request protection', () => {
  it('shares one client budget across dynamic routes', async () => {
    const limit = jest.fn().mockResolvedValue({ success: true });
    expect(await protectAppRequest(request(), { APP_REQUEST_LIMITER: { limit } })).toBeNull();
    expect(limit).toHaveBeenCalledWith({ key: 'app:192.0.2.1' });
  });
  it('rejects bursts without caching the rejection', async () => {
    const response = await protectAppRequest(request(), { APP_REQUEST_LIMITER: {
      limit: jest.fn().mockResolvedValue({ success: false }),
    } });
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
  });
  it('keeps bootstrap scripts available when a client is limited', async () => {
    expect(await protectAppRequest(request('/_next/static/chunks/app.js'), {})).toBeNull();
  });
  it('does not trust forwarded headers on internal requests', async () => {
    expect(await protectAppRequest(new Request('https://app.intorza.com/auth', {
      headers: { 'X-Forwarded-For': '192.0.2.1' },
    }), {})).toBeNull();
  });
});
