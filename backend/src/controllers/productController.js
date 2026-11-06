const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const { ok } = require('../utils/respond');

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { minPrice: 1, _id: 1 },
  price_desc: { minPrice: -1, _id: 1 },
  popular: { soldCount: -1, _id: 1 },
};

const inStock = (p) => p.variants.some((v) => v.isActive && v.stock > 0);

const toListItem = (p) => ({
  id: p._id,
  name: p.name,
  slug: p.slug,
  image: p.images[0] || '',
  images: p.images,
  minPrice: p.minPrice,
  category: p.category,
  inStock: inStock(p),
  ratingAvg: p.ratingAvg || 0,
  ratingCount: p.ratingCount || 0,
});

const toDetail = (p) => ({
  ...toListItem(p),
  description: p.description,
  material: p.material,
  specifications: p.specifications instanceof Map ? Object.fromEntries(p.specifications) : p.specifications || {},
  variants: p.variants.filter((v) => v.isActive).map((v) => ({ sku: v.sku, label: v.label, price: v.price, stock: v.stock })),
});

exports.list = async (req, res) => {
  const { page, limit, category, minPrice, maxPrice, sort, q } = req.valid.query;
  const filter = { isActive: true };

  if (category) {
    const cat = /^[a-f\d]{24}$/i.test(category)
      ? await Category.findOne({ _id: category, isActive: true })
      : await Category.findOne({ slug: category.toLowerCase(), isActive: true });
    if (!cat) return ok(res, { items: [], page, limit, total: 0, totalPages: 0 });
    filter.category = cat._id;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.minPrice = {};
    if (minPrice !== undefined) filter.minPrice.$gte = minPrice;
    if (maxPrice !== undefined) filter.minPrice.$lte = maxPrice;
  }
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const [items, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, { items: items.map(toListItem), page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.getOne = async (req, res) => {
  const { id } = req.valid.params;
  const query = /^[a-f\d]{24}$/i.test(id) ? { _id: id } : { slug: id.toLowerCase() };
  const p = await Product.findOne({ ...query, isActive: true }).lean();
  if (!p) throw ApiError.notFound('Product not found');
  ok(res, { product: toDetail(p) });
};

exports.toListItem = toListItem;
exports.toDetail = toDetail;

exports.related = async (req, res) => {
  const { id } = req.valid.params;
  const query = /^[a-f\d]{24}$/i.test(id) ? { _id: id } : { slug: id.toLowerCase() };
  const p = await Product.findOne({ ...query, isActive: true }).lean();
  if (!p) throw ApiError.notFound('Product not found');
  const items = await Product.find({ category: p.category, isActive: true, _id: { $ne: p._id } }).sort({ soldCount: -1, _id: 1 }).limit(4).lean();
  ok(res, { items: items.map(toListItem) });
};
