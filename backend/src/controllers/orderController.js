const Order = require('../models/Order');
const orderService = require('../services/orderService');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');

exports.create = async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key && key.length > 100) throw ApiError.badRequest('Idempotency-Key too long');
  const { order, replayed } = await orderService.createOrder(req.user, { ...req.valid.body, idempotencyKey: key || undefined });
  (replayed ? ok : created)(res, { order }, replayed ? 'Order already placed' : 'Order placed');
};

exports.myOrders = async (req, res) => {
  const { page, limit } = req.valid.query;
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
};

async function ownOrder(req) {
  const order = await Order.findOne({ _id: req.valid.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found'); // 404 (not 403) so ids cannot be probed
  return order;
}

exports.getOne = async (req, res) => ok(res, { order: await ownOrder(req) });

exports.cancel = async (req, res) => {
  const order = await ownOrder(req);
  ok(res, { order: await orderService.transition(order, 'cancelled', { byAdmin: false }) }, 'Order cancelled');
};
