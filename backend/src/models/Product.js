const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  label: { type: String, trim: true, default: 'Standard' }, // e.g. "Size 7", "18 inch"
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 5000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    material: { type: String, default: '', trim: true },
    specifications: { type: Map, of: String, default: {} },
    images: { type: [String], default: [] },
    variants: {
      type: [variantSchema],
      validate: [(v) => v.length > 0, 'At least one variant is required'],
    },
    minPrice: { type: Number, default: 0, index: true }, // denormalised for sort/filter
    soldCount: { type: Number, default: 0, index: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1, category: 1, createdAt: -1 });

productSchema.pre('validate', async function setMinPrice() {
  const prices = this.variants.filter((v) => v.isActive).map((v) => v.price);
  this.minPrice = prices.length ? Math.min(...prices) : 0;
  const skus = this.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) {
    this.invalidate('variants', 'Variant SKUs must be unique within a product');
  }
});

module.exports = mongoose.model('Product', productSchema);
