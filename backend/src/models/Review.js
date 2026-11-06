const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: '', maxlength: 100 },
    comment: { type: String, required: true, maxlength: 1000 },
    verifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // one review per customer per product

module.exports = mongoose.model('Review', reviewSchema);
