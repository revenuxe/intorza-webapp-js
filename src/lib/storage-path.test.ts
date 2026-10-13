import { describe, expect, it } from '@jest/globals';
import { storageObjectPath } from './storage-path';

describe('Supabase object references', () => {
  it('accepts durable keys and extracts keys from legacy signed URLs', () => {
    expect(storageObjectPath('user/rooms/photo.jpg', 'room-photos')).toBe('user/rooms/photo.jpg');
    expect(storageObjectPath('https://project.supabase.co/storage/v1/object/sign/room-photos/user/rooms/photo.jpg?token=old', 'room-photos')).toBe('user/rooms/photo.jpg');
  });
  it.each(['https://example.com/file.jpg', 'user/../secret.jpg', '/user/file.jpg', 'user/file.jpg?token=x', 'user\\file.jpg'])('rejects invalid reference %s', value => {
    expect(storageObjectPath(value, 'room-photos')).toBeNull();
  });
});
