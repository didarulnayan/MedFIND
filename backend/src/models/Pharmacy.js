const mongoose = require('mongoose');

const VERIFICATION_STATUSES = ['Pending', 'Verified', 'Rejected'];

const openingSlotSchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    open: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    close: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false }
);

const verificationEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: VERIFICATION_STATUSES, required: true },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pharmacySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, match: [/^01\d{9}$/, 'Phone must be an 11-digit Bangladeshi mobile number'] },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: {
      line: { type: String, required: true, trim: true },
      area: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true, default: 'Dhaka' },
    },
    // GeoJSON point: coordinates = [longitude, latitude]
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (c) => c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90,
          message: 'coordinates must be [longitude, latitude]',
        },
      },
    },
    openingHours: { type: [openingSlotSchema], default: [] },
    openingHoursText: { type: String, trim: true },
    licence: {
      tradeLicenceNo: { type: String, required: true, trim: true, uppercase: true },
      drugLicenceNo: { type: String, required: true, trim: true, uppercase: true },
      documentUrl: String,
      submittedAt: { type: Date, default: Date.now },
    },
    verification: {
      status: { type: String, enum: VERIFICATION_STATUSES, default: 'Pending', index: true },
      note: String,
      checklist: {
        tradeLicenceMatches: { type: Boolean, default: false },
        drugLicenceValid: { type: Boolean, default: false },
        contactComplete: { type: Boolean, default: false },
        noDuplicate: { type: Boolean, default: false },
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      history: { type: [verificationEventSchema], default: [] },
    },
    isSuspended: { type: Boolean, default: false, index: true },
    suspension: {
      reason: String,
      at: Date,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

pharmacySchema.index({ location: '2dsphere' });
pharmacySchema.index({ 'licence.tradeLicenceNo': 1 }, { unique: true });
pharmacySchema.index({ 'licence.drugLicenceNo': 1 }, { unique: true });

/** Public = verified and not suspended. Used by search, details and nearby queries. */
pharmacySchema.statics.publicFilter = function publicFilter() {
  return { 'verification.status': 'Verified', isSuspended: false };
};

pharmacySchema.virtual('isPublic').get(function isPublic() {
  return this.verification.status === 'Verified' && !this.isSuspended;
});

module.exports = mongoose.model('Pharmacy', pharmacySchema);
module.exports.VERIFICATION_STATUSES = VERIFICATION_STATUSES;
