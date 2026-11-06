const Category = require('../models/Category');
const { ok } = require('../utils/respond');

exports.list = async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  ok(res, { categories: categories.map((c) => ({ id: c._id, name: c.name, slug: c.slug })) });
};
