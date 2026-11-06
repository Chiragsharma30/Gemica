const env = require('../config/env');
const { round2 } = require('../utils/money');

// Pure: computes order totals from priced lines. Prices tax-inclusive; no discounts in MVP.
function computeTotals(lines, opts = {}) {
  const flat = opts.shippingFlatFee ?? env.shippingFlatFee;
  const threshold = opts.freeShippingThreshold ?? env.freeShippingThreshold;
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const shippingFee = subtotal === 0 || subtotal >= threshold ? 0 : flat;
  const discountAmount = Math.min(subtotal, round2(opts.discount || 0));
  const taxAmount = 0;
  const totalAmount = round2(subtotal + shippingFee - discountAmount + taxAmount);
  return { subtotal, shippingFee, discountAmount, taxAmount, totalAmount };
}

module.exports = { computeTotals };
