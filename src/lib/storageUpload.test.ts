import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUpload = jest.fn<(...args: any[]) => Promise<any>>();
const mockRemove = jest.fn<(...args: any[]) => Promise<any>>();
const mockSign = jest.fn<(...args: any[]) => Promise<any>>();
const mockBuckets: string[] = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-id' } } } }) },
  storage: { from: (bucket: string) => {
    mockBuckets.push(bucket);
    return { upload: mockUpload, remove: mockRemove, createSignedUrl: mockSign,
      getPublicUrl: (key: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${key}` } }) };
  } },
} }));
const { uploadToStorage, uploadAndSave } = require('./storageUpload') as typeof import('./storageUpload');

describe('Supabase uploads and database references', () => {
  beforeEach(() => {
    mockBuckets.length = 0; jest.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null }); mockRemove.mockResolvedValue({ error: null });
    mockSign.mockResolvedValue({ data: { signedUrl: 'https://project.supabase.co/signed' }, error: null });
    Object.assign(globalThis, { createImageBitmap: async () => ({ width: 10, height: 10 }) });
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  it.each([['logo','company-logos'],['signature','company-logos'],['qr','company-logos'],['hero','company-logos'],['gallery','gallery-images'],['room','room-photos']] as const)('routes %s to its correct Supabase bucket', async (kind, bucket) => {
    const result = await uploadToStorage(new File(['image'], 'test.png', { type: 'image/png' }), kind);
    expect(result.bucket).toBe(bucket);
    expect(result.key.startsWith('owner-id/')).toBe(true);
    expect(mockUpload.mock.calls[0][2]).toMatchObject({ upsert: false });
  });
  it('removes an uploaded object when saving its DB reference fails', async () => {
    await expect(uploadAndSave(new File(['image'], 'test.png', { type: 'image/png' }), 'logo', async () => { throw new Error('Database unavailable'); })).rejects.toThrow('Database unavailable');
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
  it('rejects empty or unsupported uploads before storage access', async () => {
    await expect(uploadToStorage(new File([], 'empty.png', { type: 'image/png' }), 'logo')).rejects.toThrow('empty');
    await expect(uploadToStorage(new File(['svg'], 'test.svg', { type: 'image/svg+xml' }), 'logo')).rejects.toThrow('choose');
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
