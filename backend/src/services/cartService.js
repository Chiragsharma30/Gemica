const Cart = require('../models/Cart');
const Product = require('../models/Product');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/money');
const { computeTotals } = require('./pricing');

async function getOrCreateCart(userId) {
  return (await Cart.findOne({ user: userId })) || Cart.create({ user: userId, items: [] });
}

// Builds a priced view of the cart from CURRENT product data. Flags problems per line.
async function describeCart(cart) {
  const ids = cart.items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = cart.items.map((item) => {
    const p = byId.get(String(item.product));
    const v = p && p.variants.find((x) => x.sku === item.variantSku);
    const available = !!(p && p.isActive && v && v.isActive && v.stock > 0);
    const issue = !p || !p.isActive || !v || !v.isActive ? 'unavailable' : v.stock < item.quantity ? 'insufficient_stock' : null;
    return {
      itemId: item._id,
      product: item.product,
      productName: p ? p.name : 'Unavailable product',
      slug: p ? p.slug : null,
      image: p && p.images[0] ? p.images[0] : '',
      sku: item.variantSku,
      variantLabel: v ? v.label : '',
      unitPrice: v ? v.price : 0,
      quantity: item.quantity,
      stock: v ? v.stock : 0,
      available,
      issue,
      lineTotal: v ? round2(v.price * item.quantity) : 0,
    };
  });

  const payable = lines.filter((l) => !l.issue);
  const totals = computeTotals(payable);
  return { items: lines, hasIssues: lines.some((l) => l.issue), ...totals };
}

function assertQuantity(q) {
  if (!Number.isInteger(q) || q < 1 || q > env.maxQtyPerItem) {
    throw ApiError.badRequest(`Quantity must be between 1 and ${env.maxQtyPerItem}`);
  }
}

async function loadSellable(productId, sku) {
  const p = await Product.findOne({ _id: productId, isActive: true });
  const v = p && p.variants.find((x) => x.sku === sku && x.isActive);
  if (!p || !v) throw ApiError.notFound('Product or variant not available');
  return { p, v };
}

async function addItem(userId, { productId, variantSku, quantity }) {
  assertQuantity(quantity);
  const { v } = await loadSellable(productId, variantSku);
  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((i) => String(i.product) === String(productId) && i.variantSku === variantSku);
  const newQty = (existing ? existing.quantity : 0) + quantity;
  if (newQty > env.maxQtyPerItem) throw ApiError.badRequest(`Maximum ${env.maxQtyPerItem} per item`);
  if (newQty > v.stock) throw ApiError.conflict(`Only ${v.stock} in stock`);
  if (existing) existing.quantity = newQty;
  else cart.items.push({ product: productId, variantSku, quantity });
  await cart.save();
  return cart;
}

async function setQuantity(userId, itemId, quantity) {
  assertQuantity(quantity);
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found');
  const { v } = await loadSellable(item.product, item.variantSku);
  if (quantity > v.stock) throw ApiError.conflict(`Only ${v.stock} in stock`);
  item.quantity = quantity;
  await cart.save();
  return cart;
}

async function removeItem(userId, itemId) {
  const cart = await getOrCreateCart(userId);
  const item = cart.items.id(itemId);
  if (!item) throw ApiError.notFound('Cart item not found');
  item.deleteOne();
  await cart.save();
  return cart;
}

// Merge guest items after login. Invalid/unavailable lines are skipped, quantities are clamped.
async function mergeItems(userId, items) {
  const cart = await getOrCreateCart(userId);
  for (const { productId, variantSku, quantity } of items) {
    const p = await Product.findOne({ _id: productId, isActive: true });
    const v = p && p.variants.find((x) => x.sku === variantSku && x.isActive && x.stock > 0);
    if (!v) continue;
    const existing = cart.items.find((i) => String(i.product) === String(productId) && i.variantSku === variantSku);
    const cap = Math.min(env.maxQtyPerItem, v.stock);
    const newQty = Math.min(cap, (existing ? existing.quantity : 0) + quantity);
    if (existing) existing.quantity = newQty;
    else cart.items.push({ product: productId, variantSku, quantity: newQty });
  }
  await cart.save();
  return cart;
}

module.exports = { getOrCreateCart, describeCart, addItem, setQuantity, removeItem, mergeItems };
