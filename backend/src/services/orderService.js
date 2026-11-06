const crypto = require('crypto');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { computeTotals } = require('./pricing');
const { canTransition, CUSTOMER_CANCELLABLE } = require('./orderStatus');
const stock = require('./stockService');
const coupons = require('./couponService');
const { sendMailSafe } = require('./mailer');
const { round2 } = require('../utils/money');

const newOrderNumber = () =>
  `GM${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

function resolveAddress(user, { addressId, address }) {
  if (addressId) {
    const a = user.addresses.id(addressId);
    if (!a) throw ApiError.badRequest('Address not found');
    const { fullName, phone, line1, line2, city, state, pincode, country } = a.toObject();
    return { fullName, phone, line1, line2, city, state, pincode, country };
  }
  return address;
}

async function createOrder(user, { addressId, address, paymentMethod, idempotencyKey, couponCode }) {
  if (idempotencyKey) {
    const existing = await Order.findOne({ user: user._id, idempotencyKey });
    if (existing) return { order: existing, replayed: true };
  }

  const cart = await Cart.findOne({ user: user._id });
  if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your cart is empty');

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const problems = [];
  for (const item of cart.items) {
    const p = byId.get(String(item.product));
    const v = p && p.variants.find((x) => x.sku === item.variantSku);
    if (!p || !p.isActive || !v || !v.isActive) problems.push({ sku: item.variantSku, issue: 'unavailable' });
    else if (v.stock < item.quantity) problems.push({ sku: item.variantSku, issue: 'insufficient_stock', available: v.stock });
    else {
      lines.push({
        product: p._id,
        name: p.name,
        image: p.images[0] || '',
        sku: v.sku,
        variantLabel: v.label,
        unitPrice: v.price, // server-side price, never from client
        quantity: item.quantity,
      });
    }
  }
  if (problems.length) throw new ApiError(409, 'Some cart items are unavailable', problems);

  const shippingAddress = resolveAddress(user, { addressId, address });
  let coupon = null;
  let discount = 0;
  if (couponCode) {
    ({ coupon, discount } = await coupons.evaluate(couponCode, computeTotals(lines).subtotal));
  }
  const totals = computeTotals(lines, { discount });

  const reserved = await stock.reserve(lines);
  if (!reserved.ok) throw new ApiError(409, 'Some cart items are unavailable', [{ sku: reserved.failedSku, issue: 'insufficient_stock' }]);
  const releaseStock = () => stock.release(lines.map((l) => ({ product: l.product, sku: l.sku, quantity: l.quantity })));

  if (coupon && !(await coupons.consume(coupon))) {
    await releaseStock();
    throw ApiError.badRequest('This coupon has been fully redeemed');
  }

  let order;
  try {
    order = await Order.create({
      orderNumber: newOrderNumber(),
      user: user._id,
      items: lines.map((l) => ({ ...l, sku: l.sku })),
      shippingAddress,
      ...totals,
      couponCode: coupon ? coupon.code : '',
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'cod_pending' : 'pending',
      orderStatus: 'placed',
      idempotencyKey,
    });
  } catch (err) {
    await releaseStock();
    if (coupon) await coupons.restore(coupon.code);
    if (err.code === 11000 && idempotencyKey) {
      const existing = await Order.findOne({ user: user._id, idempotencyKey });
      if (existing) return { order: existing, replayed: true };
    }
    throw err;
  }

  await Cart.updateOne({ _id: cart._id }, { $set: { items: [] } });
  sendMailSafe({
    to: user.email,
    subject: `Your Gemica order ${order.orderNumber}`,
    text: `Hi ${user.name},\n\nThank you for your order ${order.orderNumber}.\n\n${order.items.map((i) => `- ${i.name} (${i.variantLabel}) x ${i.quantity}: Rs. ${round2(i.unitPrice * i.quantity)}`).join('\n')}\n\nShipping: Rs. ${order.shippingFee}\n${order.discountAmount ? `Discount: -Rs. ${order.discountAmount}\n` : ''}Total: Rs. ${order.totalAmount}\nPayment: ${order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online'}\n\nWe will let you know when it ships.\n\n- Gemica`,
  });
  return { order, replayed: false };
}

// Atomic status transition. Restores stock on cancellation exactly once.
async function transition(order, to, { byAdmin }) {
  const from = order.orderStatus;
  if (!canTransition(from, to)) throw ApiError.badRequest(`Cannot change status from ${from} to ${to}`);
  if (!byAdmin && !(to === 'cancelled' && CUSTOMER_CANCELLABLE.includes(from))) {
    throw ApiError.badRequest('This order can no longer be cancelled');
  }
  if (order.paymentMethod === 'razorpay' && to !== 'cancelled' && order.paymentStatus !== 'paid') {
    throw ApiError.badRequest('Online-payment orders must be paid before they can progress');
  }

  const set = { orderStatus: to };
  if (to === 'cancelled' && order.paymentStatus === 'paid') set.paymentStatus = 'refund_pending';
  if (to === 'delivered' && order.paymentMethod === 'cod') set.paymentStatus = 'cod_collected';

  const updated = await Order.findOneAndUpdate({ _id: order._id, orderStatus: from }, { $set: set }, { returnDocument: 'after' });
  if (!updated) throw ApiError.conflict('Order was modified, please retry');

  if (to === 'cancelled') {
    await stock.release(updated.items.map((i) => ({ product: i.product, sku: i.sku, quantity: i.quantity })));
    await coupons.restore(updated.couponCode);
  }
  return updated;
}

// Cancels unpaid online orders older than `minutes`, releasing their stock. Returns how many were expired.
async function expireUnpaidOrders({ minutes, now = Date.now() }) {
  const stale = await Order.find({
    paymentMethod: 'razorpay',
    paymentStatus: { $in: ['pending', 'failed'] },
    orderStatus: 'placed',
    createdAt: { $lt: new Date(now - minutes * 60 * 1000) },
  });
  let count = 0;
  for (const order of stale) {
    try { await transition(order, 'cancelled', { byAdmin: true }); count += 1; } catch { /* changed meanwhile */ }
  }
  return count;
}

module.exports = { createOrder, transition, expireUnpaidOrders };
