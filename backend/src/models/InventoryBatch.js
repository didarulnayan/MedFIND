const mongoose = require('mongoose');

/**
 * One delivery of a catalog medicine. quantity = units remaining in this batch.
 * Batches with source "adjustment" are created by quick stock edits in the catalog and have no expiry date;
 * they are consumed after all dated batches.
 */
const inventoryBatchSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true, index: true },
    catalogItem: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    batchNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    quantity: { type: Number, required: true, min: 0 },
    initialQuantity: { type: Number, required: true, min: 0 },
    manufacturingDate: Date,
    expiryDate: { type: Date, default: null },
    purchasePrice: { type: Number, min: 0 },
    source: { type: String, enum: ['delivery', 'adjustment'], default: 'delivery' },
  },
  { timestamps: true }
);

inventoryBatchSchema.index({ catalogItem: 1, batchNumber: 1 }, { unique: true });
inventoryBatchSchema.index({ catalogItem: 1, expiryDate: 1 });
inventoryBatchSchema.index({ pharmacy: 1, expiryDate: 1 });

inventoryBatchSchema.virtual('isExpired').get(function isExpired() {
  return Boolean(this.expiryDate) && this.expiryDate <= new Date();
});

inventoryBatchSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('InventoryBatch', inventoryBatchSchema);
