const KEY = 'gemica_recent';
const MAX = 6;

export function getRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Most recent first, de-duplicated, capped.
export function pushRecent(product) {
  const item = { id: product.id, slug: product.slug, name: product.name, image: product.image, minPrice: product.minPrice, inStock: product.inStock };
  const next = [item, ...getRecent().filter((p) => p.id !== item.id)].slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}
