import { describe, expect, it, jest } from '@jest/globals';
const mockSign = jest.fn<(...args: unknown[]) => Promise<{ data?: { signedUrl: string }; error?: Error }>>();
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ createSignedUrl: mockSign }) },
} }));
// Load after registering the mock; this project's SWC transform does not hoist it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveCompanyAssetUrl } = require('./company-assets') as typeof import('./company-assets');

describe('private company image resolution', () => {
  it.each([
    'owner/signatures/image.png',
    'https://project.supabase.co/storage/v1/object/public/company-logos/owner/signatures/image.png',
    'https://project.supabase.co/storage/v1/object/sign/company-logos/owner/signatures/image.png?token=expired',
  ])('signs durable and legacy references: %s', async value => {
    mockSign.mockResolvedValue({ data: { signedUrl: 'https://project.supabase.co/signed' } });
    expect(await resolveCompanyAssetUrl(value)).toBe('https://project.supabase.co/signed');
    expect(mockSign).toHaveBeenLastCalledWith('owner/signatures/image.png', 3600);
  });
  it('preserves other buckets and local previews', async () => {
    for (const value of ['blob:preview', 'data:image/png;base64,test', 'https://example.com/image.png',
      'https://project.supabase.co/storage/v1/object/public/gallery-images/owner/image.png']) {
      expect(await resolveCompanyAssetUrl(value)).toBe(value);
    }
  });
  it('fails closed when storage denies access', async () => {
    mockSign.mockResolvedValue({ error: new Error('denied') });
    await expect(resolveCompanyAssetUrl('other/signatures/image.png')).rejects.toThrow('denied');
  });
});
