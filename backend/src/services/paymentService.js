const crypto = require('crypto');
const env = require('../config/env');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const { toPaise } = require('../utils/money');

let client = null;
function getClient() {
  if (client) return client;
  if (!env.razorpay.keyId || !env.razorpay.keySecret) throw new ApiError(503, 'Online payments are not configured');
  const Razorpay = require('razorpay');
  client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  return client;
}
const setClient = (c) => { client = c; }; // test seam

const hmac = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('hex');
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function createPayment(user, orderId) {
  const order = await Order.findOne({ _id: orderId, user: user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentMethod !== 'razorpay') throw ApiError.badRequest('This order is not an online-payment order');
  if (order.orderStatus === 'cancelled') throw ApiError.badRequest('Order is cancelled');
  if (order.paymentStatus === 'paid') throw ApiError.conflict('Order is already paid');

  let payment = await Payment.findOne({ order: order._id, status: 'created' });
  if (!payment) {
    const rzp = await getClient().orders.create({
      amount: toPaise(order.totalAmount), // computed on the server at order time
      currency: env.currency,
      receipt: order.orderNumber,
    });
    payment = await Payment.create({
      order: order._id, providerOrderId: rzp.id, amount: order.totalAmount, currency: env.currency,
    });
  }
  return {
    providerOrderId: payment.providerOrderId,
    amount: toPaise(payment.amount),
    currency: payment.currency,
    keyId: env.razorpay.keyId,
    orderNumber: order.orderNumber,
  };
}

// Idempotent: a second call for an already-paid payment is a no-op.
async function markPaid(payment, providerPaymentId) {
  const first = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid', providerPaymentId } }
  );
  if (!first) return false;
  const order = await Order.findById(payment.order);
  if (order.orderStatus === 'cancelled') {
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refund_pending' } });
  } else {
    await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['pending', 'failed'] } }, { $set: { paymentStatus: 'paid' } });
  }
  return true;
}

async function verifyPayment(user, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const payment = await Payment.findOne({ providerOrderId: razorpay_order_id });
  if (!payment) throw ApiError.notFound('Payment not found');
  const order = await Order.findOne({ _id: payment.order, user: user._id });
  if (!order) throw ApiError.notFound('Payment not found');

  const expected = hmac(`${razorpay_order_id}|${razorpay_payment_id}`, env.razorpay.keySecret);
  if (!safeEqual(expected, razorpay_signature)) throw ApiError.badRequest('Invalid payment signature');

  await markPaid(payment, razorpay_payment_id);
  return Order.findById(order._id);
}

async function handleWebhook(rawBody, signature) {
  const expected = hmac(rawBody, env.razorpay.webhookSecret);
  if (!safeEqual(expected, signature)) throw ApiError.badRequest('Invalid webhook signature');

  let event;
  try { event = JSON.parse(rawBody.toString('utf8')); } catch { throw ApiError.badRequest('Malformed webhook body'); }

  const entity = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!entity || !entity.order_id) return { handled: false };
  const payment = await Payment.findOne({ providerOrderId: entity.order_id });
  if (!payment) return { handled: false };

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    return { handled: await markPaid(payment, entity.id) };
  }
  if (event.event === 'payment.failed' && payment.status === 'created') {
    await Order.updateOne({ _id: payment.order, paymentStatus: 'pending' }, { $set: { paymentStatus: 'failed' } });
    return { handled: true };
  }
  return { handled: false };
}

// Refund a cancelled, paid online order through Razorpay. Claims the order first so a double click cannot refund twice.
async function refundOrder(order) {
  if (order.paymentMethod !== 'razorpay' || order.paymentStatus !== 'refund_pending') throw ApiError.badRequest('This order is not awaiting a refund');
  const payment = await Payment.findOne({ order: order._id, status: 'paid' });
  if (!payment || !payment.providerPaymentId) throw ApiError.badRequest('No captured payment was found for this order');
  const claimed = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'refund_pending' }, { $set: { paymentStatus: 'refunded' } }, { returnDocument: 'after' });
  if (!claimed) throw ApiError.conflict('Refund already processed');
  try {
    await getClient().payments.refund(payment.providerPaymentId, { amount: toPaise(payment.amount), notes: { order: order.orderNumber } });
  } catch (err) {
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refund_pending' } });
    throw new ApiError(502, `Refund failed: ${(err && (err.error?.description || err.message)) || 'provider error'}`);
  }
  return claimed;
}

module.exports = { createPayment, verifyPayment, handleWebhook, refundOrder, setClient, hmac };
