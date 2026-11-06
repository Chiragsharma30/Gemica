const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/money');

// Validates a code against a subtotal. Returns { coupon, discount } or throws a 400 with the reason.
async function evaluate(code, subtotal) {
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase(), isActive: true });
  if (!coupon) throw ApiError.badRequest('This coupon code is not valid');
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest('This coupon has expired');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('This coupon has been fully redeemed');
  if (subtotal < coupon.minOrder) throw ApiError.badRequest(`Add items worth ₹${coupon.minOrder} or more to use this coupon`);

  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return { coupon, discount: round2(Math.min(discount, subtotal)) };
}

// Atomically claim one use (respects the usage limit under concurrency).
async function consume(coupon) {
  const claimed = await Coupon.findOneAndUpdate(
    { _id: coupon._id, isActive: true, $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } },
    { returnDocument: 'after' }
  );
  return !!claimed;
}

const restore = (code) => (code ? Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }) : null);

module.exports = { evaluate, consume, restore };
