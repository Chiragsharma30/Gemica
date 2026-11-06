import { describe, it, expect } from 'vitest';
import { isHttpsUrl } from './url';

describe('isHttpsUrl', () => {
  it('accepts https links', () => {
    expect(isHttpsUrl('https://example.com/photo.jpg')).toBe(true);
    expect(isHttpsUrl('  https://res.cloudinary.com/demo/image/upload/v1/a.png  ')).toBe(true);
  });
  it('rejects http, other schemes, relative paths and junk', () => {
    for (const bad of ['http://example.com/a.jpg', 'javascript:alert(1)', 'ftp://x.com/a', '/uploads/a.png', 'example.com/a.jpg', '', 'https://', 'https://localhost/a.jpg', null, undefined]) {
      expect(isHttpsUrl(bad)).toBe(false);
    }
  });
});
