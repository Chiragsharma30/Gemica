const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const { toListItem } = require('./productController');

const view = async (userId) => {
  const w = await Wishlist.findOne({ user: userId }).populate({ path: 'products', match: { isActive: true } }).lean();
  const items = w ? w.products.filter(Boolean).map(toListItem) : [];
  return { items };
};

exports.get = async (req, res) => ok(res, await view(req.user._id));

exports.add = async (req, res) => {
  const { productId } = req.valid.body;
  if (!(await Product.exists({ _id: productId, isActive: true }))) throw ApiError.notFound('Product not found');
  await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: productId } }, { upsert: true });
  ok(res, await view(req.user._id), 'Added to wishlist');
};

exports.remove = async (req, res) => {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.valid.params.productId } });
  ok(res, await view(req.user._id), 'Removed from wishlist');
};
