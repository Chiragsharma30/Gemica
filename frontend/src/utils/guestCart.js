// Pure helpers for the guest (logged-out) cart. Prices here are for display only;
// the server re-prices everything after login and at checkout.
export const MAX_QTY = 10;
const KEY = 'gemica_guest_cart';
export const lineId = (productId, sku) => `${productId}:${sku}`;

export function load() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}
export function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
}
export const clear = () => save([]);

export function addItem(items, line) {
  const id = lineId(line.productId, line.sku);
  const qty = Math.max(1, Math.min(MAX_QTY, Number(line.quantity) || 1));
  const existing = items.find((i) => i.id === id);
  if (existing) {
    return items.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, Math.min(i.stock ?? MAX_QTY, i.quantity + qty)) } : i));
  }
  return [...items, { ...line, id, quantity: Math.min(qty, line.stock ?? MAX_QTY) }];
}

export function setQuantity(items, id, quantity) {
  const q = Math.floor(Number(quantity));
  if (!Number.isFinite(q) || q < 1) return items;
  return items.map((i) => (i.id === id ? { ...i, quantity: Math.min(q, MAX_QTY, i.stock ?? MAX_QTY) } : i));
}

export const removeItem = (items, id) => items.filter((i) => i.id !== id);
export const subtotal = (items) => Math.round(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) * 100) / 100;
export const count = (items) => items.reduce((s, i) => s + i.quantity, 0);
