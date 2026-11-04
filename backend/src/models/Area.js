const mongoose = require('mongoose');

/** Selectable areas for the "Choose your location" dialog (city > area), each with a centre point. */
const areaSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { versionKey: false }
);

areaSchema.index({ city: 1, name: 1 }, { unique: true });
areaSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Area', areaSchema);
