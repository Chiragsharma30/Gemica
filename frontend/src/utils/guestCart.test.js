import { describe, it, expect, beforeEach } from 'vitest';
import * as gc from './guestCart';

const line = { productId: 'p1', sku: 'S1', name: 'Ring', unitPrice: 500, stock: 4, quantity: 1 };

describe('guestCart', () => {
  beforeEach(() => localStorage.clear());

  it('adds a new line and merges the same variant', () => {
    let items = gc.addItem([], line);
    items = gc.addItem(items, { ...line, quantity: 2 });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('never exceeds stock or the per-item maximum', () => {
    let items = gc.addItem([], { ...line, quantity: 99 });
    expect(items[0].quantity).toBe(4);
    items = gc.addItem(items, { ...line, quantity: 5 });
    expect(items[0].quantity).toBe(4);
    items = gc.setQuantity(items, items[0].id, 50);
    expect(items[0].quantity).toBe(4);
  });

  it('ignores invalid quantities', () => {
    const items = gc.addItem([], line);
    expect(gc.setQuantity(items, items[0].id, 0)).toEqual(items);
    expect(gc.setQuantity(items, items[0].id, -2)).toEqual(items);
    expect(gc.setQuantity(items, items[0].id, 'abc')).toEqual(items);
  });

  it('computes subtotal and count', () => {
    const items = gc.addItem(gc.addItem([], line), { ...line, sku: 'S2', unitPrice: 250.5, quantity: 2 });
    expect(gc.subtotal(items)).toBe(1001);
    expect(gc.count(items)).toBe(3);
  });

  it('removes lines and persists safely', () => {
    const items = gc.addItem([], line);
    gc.save(items);
    expect(gc.load()).toHaveLength(1);
    expect(gc.removeItem(items, items[0].id)).toEqual([]);
    gc.clear();
    expect(gc.load()).toEqual([]);
  });

  it('survives corrupted storage', () => {
    localStorage.setItem('gemica_guest_cart', '{not json');
    expect(gc.load()).toEqual([]);
  });
});
