import { request } from './client';

const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const auth = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  updateProfile: (name) => request('/auth/me', { method: 'PATCH', body: { name } }),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
};

export const catalogue = {
  products: (params) => request(`/products${qs(params)}`),
  product: (idOrSlug) => request(`/products/${encodeURIComponent(idOrSlug)}`),
  categories: () => request('/categories'),
  related: (idOrSlug) => request(`/products/${encodeURIComponent(idOrSlug)}/related`),
  reviews: (idOrSlug, params) => request(`/products/${encodeURIComponent(idOrSlug)}/reviews${qs(params)}`),
  addReview: (idOrSlug, body) => request(`/products/${encodeURIComponent(idOrSlug)}/reviews`, { method: 'POST', body }),
};

export const coupons = {
  validate: (code) => request('/coupons/validate', { method: 'POST', body: { code } }),
};

export const cart = {
  get: () => request('/cart'),
  add: (body) => request('/cart/items', { method: 'POST', body }),
  update: (itemId, quantity) => request(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }),
  remove: (itemId) => request(`/cart/items/${itemId}`, { method: 'DELETE' }),
  merge: (items) => request('/cart/merge', { method: 'POST', body: { items } }),
};

export const wishlist = {
  get: () => request('/wishlist'),
  add: (productId) => request('/wishlist/items', { method: 'POST', body: { productId } }),
  remove: (productId) => request(`/wishlist/items/${productId}`, { method: 'DELETE' }),
};

export const addresses = {
  list: () => request('/addresses'),
  create: (body) => request('/addresses', { method: 'POST', body }),
};

export const orders = {
  create: (body, idempotencyKey) => request('/orders', { method: 'POST', body, headers: { 'Idempotency-Key': idempotencyKey } }),
  mine: (params) => request(`/orders/my-orders${qs(params)}`),
  get: (id) => request(`/orders/${id}`),
  cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
};

export const payments = {
  create: (orderId) => request('/payments/create', { method: 'POST', body: { orderId } }),
  verify: (body) => request('/payments/verify', { method: 'POST', body }),
};

export const admin = {
  dashboard: () => request('/admin/dashboard'),
  products: (params) => request(`/admin/products${qs(params)}`),
  product: (id) => request(`/admin/products/${id}`),
  createProduct: (body) => request('/admin/products', { method: 'POST', body }),
  updateProduct: (id, body) => request(`/admin/products/${id}`, { method: 'PATCH', body }),
  archiveProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
  setStock: (id, sku, stock) => request(`/admin/products/${id}/stock`, { method: 'PATCH', body: { sku, stock } }),
  createCategory: (name) => request('/admin/categories', { method: 'POST', body: { name } }),
  upload: (file) => { const f = new FormData(); f.append('image', file); return request('/admin/uploads', { method: 'POST', body: f }); },
  orders: (params) => request(`/admin/orders${qs(params)}`),
  refundOrder: (id) => request(`/admin/orders/${id}/refund`, { method: 'POST' }),
  coupons: () => request('/admin/coupons'),
  createCoupon: (body) => request('/admin/coupons', { method: 'POST', body }),
  updateCoupon: (id, body) => request(`/admin/coupons/${id}`, { method: 'PATCH', body }),
  setOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
};
