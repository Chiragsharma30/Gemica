const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/respond');

async function findProduct(idOrSlug) {
  const query = /^[a-f\d]{24}$/i.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug.toLowerCase() };
  const p = await Product.findOne({ ...query, isActive: true });
  if (!p) throw ApiError.notFound('Product not found');
  return p;
}

async function refreshRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg ? agg.count : 0 });
}

exports.list = async (req, res) => {
  const p = await findProduct(req.valid.params.id);
  const { page, limit } = req.valid.query;
  const [items, total] = await Promise.all([
    Review.find({ product: p._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name').lean(),
    Review.countDocuments({ product: p._id }),
  ]);
  ok(res, {
    items: items.map((r) => ({
      id: r._id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.createdAt,
      author: r.user ? r.user.name.split(' ')[0] : 'Customer', // first name only, for privacy
      verifiedPurchase: r.verifiedPurchase,
    })),
    page, limit, total, totalPages: Math.ceil(total / limit), ratingAvg: p.ratingAvg, ratingCount: p.ratingCount,
  });
};

// Only customers whose order containing this product was delivered can review it.
exports.create = async (req, res) => {
  const p = await findProduct(req.valid.params.id);
  const bought = await Order.exists({ user: req.user._id, orderStatus: 'delivered', 'items.product': p._id });
  if (!bought) throw ApiError.forbidden('Only customers who have received this product can review it');
  const { rating, title, comment } = req.valid.body;
  const existing = await Review.findOne({ product: p._id, user: req.user._id });
  const review = await Review.findOneAndUpdate(
    { product: p._id, user: req.user._id },
    { rating, title, comment, verifiedPurchase: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  await refreshRating(p._id);
  (existing ? ok : created)(res, { review }, existing ? 'Review updated' : 'Thanks for your review');
};
