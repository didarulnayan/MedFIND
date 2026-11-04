const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // one review per collected reservation
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    text: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ pharmacy: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
