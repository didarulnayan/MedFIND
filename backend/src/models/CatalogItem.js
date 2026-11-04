const mongoose = require('mongoose');

/**
 * A medicine that a pharmacy sells (pharmacy catalog entry).
 * stockQuantity is the "reported stock" shown to customers. It is a cached value that always equals the
 * sum of the item's NON-EXPIRED inventory batches (see inventory.service.recalculateStock).
 */
const catalogItemSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterMedicine', required: true },
    price: { type: Number, required: true, min: [0.01, 'Price must be greater than 0'] },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    minStockLevel: { type: Number, min: 0, default: 10 },
    isActive: { type: Boolean, default: true },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

catalogItemSchema.index({ pharmacy: 1, medicine: 1 }, { unique: true });
catalogItemSchema.index({ medicine: 1, isActive: 1, stockQuantity: 1 });
catalogItemSchema.index({ pharmacy: 1, isActive: 1, lastUpdatedAt: -1 });

catalogItemSchema.virtual('stockStatus').get(function stockStatus() {
  if (this.stockQuantity <= 0) return 'Out of stock';
  if (this.stockQuantity <= this.minStockLevel) return 'Low stock';
  return 'In stock';
});

catalogItemSchema.set('toJSON', { virtuals: true, versionKey: false });
catalogItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CatalogItem', catalogItemSchema);
