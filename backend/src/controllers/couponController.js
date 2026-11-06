const cartService = require('../services/cartService');
const couponService = require('../services/couponService');
const { computeTotals } = require('../services/pricing');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');

// Previews a coupon against the signed-in customer's current cart. Nothing is consumed here.
exports.validate = async (req, res) => {
  const cart = await cartService.describeCart(await cartService.getOrCreateCart(req.user._id));
  if (!cart.items.length) throw ApiError.badRequest('Your cart is empty');
  const { coupon, discount } = await couponService.evaluate(req.valid.body.code, cart.subtotal);
  const lines = cart.items.filter((i) => !i.issue).map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity }));
  ok(res, { code: coupon.code, discount, ...computeTotals(lines, { discount }) });
};
