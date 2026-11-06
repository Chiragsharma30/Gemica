const payments = require('../services/paymentService');
const { ok } = require('../utils/respond');
const ApiError = require('../utils/ApiError');

exports.create = async (req, res) => ok(res, await payments.createPayment(req.user, req.valid.body.orderId));

exports.verify = async (req, res) => {
  const order = await payments.verifyPayment(req.user, req.valid.body);
  ok(res, { order }, 'Payment verified');
};

exports.webhook = async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw ApiError.badRequest('Invalid webhook body');
  await payments.handleWebhook(req.body, req.get('x-razorpay-signature'));
  res.status(200).json({ success: true });
};
