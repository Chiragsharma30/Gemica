const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const imageStore = require('../services/imageStore');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const slugify = require('../utils/slugify');
const escapeRegex = require('../utils/escapeRegex');
const { ok, created } = require('../utils/respond');

const LOW_STOCK = 3;

exports.dashboard = async (req, res) => {
  const [orders, revenueAgg, products, customers, lowStock, recent] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'cod_collected'] }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
    ]),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer' }),
    Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$variants' },
      { $match: { 'variants.isActive': true, 'variants.stock': { $lte: LOW_STOCK } } },
      { $project: { name: 1, sku: '$variants.sku', stock: '$variants.stock' } },
      { $limit: 20 },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const since = new Date(Date.now() - 13 * 86400000);
  since.setHours(0, 0, 0, 0);
  const [byDay, top] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } } } },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
  ]);
  const dayMap = new Map(byDay.map((d) => [d._id, d]));
  const salesByDay = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(since.getTime() + i * 86400000);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const row = dayMap.get(key);
    return { date: key, sales: row ? row.sales : 0, orders: row ? row.orders : 0 };
  });
  const byStatus = Object.fromEntries(orders.map((o) => [o._id, o.count]));
  ok(res, {
    ordersByStatus: byStatus,
    totalOrders: orders.reduce((s, o) => s + o.count, 0),
    revenue: revenueAgg[0] ? revenueAgg[0].revenue : 0,
    activeProducts: products,
    customers,
    lowStock,
    recentOrders: recent,
    salesByDay,
    topProducts: top.map((t) => ({ id: t._id, name: t.name, units: t.units, revenue: t.revenue })),
  });
};

// ---- Products ----
async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await Product.exists({ slug }); i += 1) slug = `${base}-${i}`;
  return slug;
}

async function assertCategory(id) {
  if (!(await Category.exists({ _id: id }))) throw ApiError.badRequest('Category does not exist');
}

exports.listProducts = async (req, res) => {
  const { page, limit, q, includeArchived } = req.valid.query;
  const filter = {};
  if (includeArchived === 'false') filter.isActive = true;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.valid.params.id).lean();
  if (!product) throw ApiError.notFound('Product not found');
  ok(res, { product });
};

exports.createProduct = async (req, res) => {
  const body = req.valid.body;
  await assertCategory(body.category);
  const product = await Product.create({ ...body, slug: await uniqueSlug(body.name) });
  created(res, { product }, 'Product created');
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findById(req.valid.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const body = req.valid.body;
  if (body.category) await assertCategory(body.category);
  Object.assign(product, body); // slug is intentionally stable
  await product.save();
  ok(res, { product }, 'Product updated');
};

exports.archiveProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.valid.params.id, { isActive: false }, { returnDocument: 'after' });
  if (!product) throw ApiError.notFound('Product not found');
  ok(res, { product }, 'Product archived');
};

exports.setStock = async (req, res) => {
  const { sku, stock } = req.valid.body;
  const result = await Product.findOneAndUpdate(
    { _id: req.valid.params.id, 'variants.sku': sku },
    { $set: { 'variants.$.stock': stock } },
    { returnDocument: 'after' }
  );
  if (!result) throw ApiError.notFound('Product or variant not found');
  ok(res, { product: result }, 'Stock updated');
};

exports.createCategory = async (req, res) => {
  const name = req.valid.body.name;
  const slug = slugify(name);
  if (await Category.exists({ slug })) throw ApiError.conflict('Category already exists');
  created(res, { category: await Category.create({ name, slug }) }, 'Category created');
};

// ---- Orders ----
exports.listOrders = async (req, res) => {
  const { page, limit, status, q } = req.valid.query;
  const filter = {};
  if (status) filter.orderStatus = status;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    const users = await User.find({ $or: [{ email: rx }, { name: rx }] }).select('_id').lean();
    filter.$or = [{ orderNumber: rx }, { user: { $in: users.map((u) => u._id) } }];
  }
  const [items, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  ok(res, { items, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  ok(res, { order: await orderService.transition(order, req.valid.body.status, { byAdmin: true }) }, 'Order updated');
};

exports.uploadImage = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Image file is required (field name: image)');
  created(res, { url: await imageStore.saveImage(req.file) }, 'Uploaded');
};

// ---- Coupons ----
exports.listCoupons = async (req, res) => ok(res, { coupons: await Coupon.find().sort({ createdAt: -1 }).lean() });

exports.createCoupon = async (req, res) => {
  const body = req.valid.body;
  if (await Coupon.exists({ code: body.code.toUpperCase() })) throw ApiError.conflict('A coupon with this code already exists');
  created(res, { coupon: await Coupon.create(body) }, 'Coupon created');
};

exports.updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.valid.params.id, { $set: req.valid.body }, { returnDocument: 'after' });
  if (!coupon) throw ApiError.notFound('Coupon not found');
  ok(res, { coupon }, 'Coupon updated');
};

exports.refundOrder = async (req, res) => {
  const order = await Order.findById(req.valid.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  ok(res, { order: await paymentService.refundOrder(order) }, 'Refund issued');
};
