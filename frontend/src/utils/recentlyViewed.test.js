import { describe, it, expect, beforeEach } from 'vitest';
import { getRecent, pushRecent } from './recentlyViewed';

const p = (n) => ({ id: `p${n}`, slug: `s${n}`, name: `P${n}`, image: '', minPrice: n, inStock: true });

describe('recentlyViewed', () => {
  beforeEach(() => localStorage.clear());
  it('puts the newest first and removes duplicates', () => {
    pushRecent(p(1)); pushRecent(p(2)); pushRecent(p(1));
    expect(getRecent().map((x) => x.id)).toEqual(['p1', 'p2']);
  });
  it('keeps at most 6', () => {
    for (let i = 1; i <= 9; i += 1) pushRecent(p(i));
    expect(getRecent()).toHaveLength(6);
    expect(getRecent()[0].id).toBe('p9');
  });
  it('survives corrupted storage', () => {
    localStorage.setItem('gemica_recent', 'nope');
    expect(getRecent()).toEqual([]);
  });
});
