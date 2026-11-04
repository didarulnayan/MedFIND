const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['Pending', 'Confirmed', 'ReadyForPickup', 'Collected', 'Rejected', 'Cancelled', 'Expired'];
const ACTIVE_STATUSES = ['Pending', 'Confirmed', 'ReadyForPickup'];
const HOLDING_STATUSES = ['Confirmed', 'ReadyForPickup']; // stock is held for these
const STATUS_LABELS = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  ReadyForPickup: 'Ready for pickup',
  Collected: 'Collected',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
  Expired: 'Expired',
};
const REJECTION_REASONS = ['Out of stock', 'Prescription required', 'Invalid prescription', 'Pharmacy closed at pickup time', 'Other'];

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: RESERVATION_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. R-1042
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true, index: true },
    catalogItem: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterMedicine', required: true },
    // snapshot so history stays correct even if the catalog item is removed or the price changes
    medicineSnapshot: {
      brandName: String,
      genericName: String,
      strength: String,
      dosageForm: String,
      manufacturer: String,
      requiresPrescription: Boolean,
    },
    pharmacySnapshot: { name: String, area: String },
    quantity: { type: Number, required: true, min: 1, max: 500 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    pickupAt: { type: Date, required: true },
    pickupDeadline: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 500 },
    prescription: { url: String, publicId: String },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'Pending', index: true },
    rejection: {
      reason: { type: String, enum: REJECTION_REASONS },
      message: { type: String, maxlength: 500 },
    },
    statusHistory: { type: [statusEventSchema], default: [] },
    consumedBatches: [
      { _id: false, batch: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryBatch' }, batchNumber: String, quantity: Number },
    ],
    collectedAt: Date,
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reservationSchema.index({ pharmacy: 1, status: 1, pickupAt: 1 });
reservationSchema.index({ status: 1, pickupDeadline: 1 });
reservationSchema.index({ patient: 1, createdAt: -1 });

reservationSchema.virtual('statusLabel').get(function statusLabel() {
  return STATUS_LABELS[this.status];
});

reservationSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Reservation', reservationSchema);
Object.assign(module.exports, { RESERVATION_STATUSES, ACTIVE_STATUSES, HOLDING_STATUSES, STATUS_LABELS, REJECTION_REASONS });
