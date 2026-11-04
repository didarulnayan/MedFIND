const mongoose = require('mongoose');

const COMPLAINT_STATUSES = ['Open', 'UnderReview', 'Resolved', 'Dismissed'];
const COMPLAINT_STATUS_LABELS = { Open: 'Open', UnderReview: 'Under Review', Resolved: 'Resolved', Dismissed: 'Dismissed' };
const ISSUE_TYPES = [
  'Medicine listed but unavailable',
  'Overcharging',
  'Rude behaviour',
  'Reservation not honoured',
  'Expired or damaged medicine',
  'Other',
];
// allowed admin status transitions; Resolved and Dismissed are final
const COMPLAINT_TRANSITIONS = {
  Open: ['UnderReview', 'Resolved', 'Dismissed'],
  UnderReview: ['Resolved', 'Dismissed'],
  Resolved: [],
  Dismissed: [],
};

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // filed | pharmacy_response | status_change
    status: { type: String, enum: COMPLAINT_STATUSES },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. C-212
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true, index: true },
    targetType: { type: String, enum: ['pharmacy', 'reservation'], required: true },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    issueType: { type: String, enum: ISSUE_TYPES, required: true },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    evidence: [{ _id: false, url: String, publicId: String }],
    status: { type: String, enum: COMPLAINT_STATUSES, default: 'Open', index: true },
    pharmacyResponse: {
      message: { type: String, maxlength: 2000 },
      respondedAt: Date,
      respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    resolutionNote: { type: String, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

complaintSchema.index({ pharmacy: 1, status: 1, resolvedAt: -1 });

complaintSchema.virtual('statusLabel').get(function statusLabel() {
  return COMPLAINT_STATUS_LABELS[this.status];
});
complaintSchema.set('toJSON', { virtuals: true, versionKey: false });

module.exports = mongoose.model('Complaint', complaintSchema);
Object.assign(module.exports, { COMPLAINT_STATUSES, COMPLAINT_STATUS_LABELS, ISSUE_TYPES, COMPLAINT_TRANSITIONS });
