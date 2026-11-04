const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    catalogItem: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true, index: true },
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    oldPrice: { type: Number, default: null },
    newPrice: { type: Number, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, enum: ['catalog-add', 'catalog-edit', 'bulk-import'], default: 'catalog-edit' },
  },
  { timestamps: { createdAt: 'changedAt', updatedAt: false } }
);

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
