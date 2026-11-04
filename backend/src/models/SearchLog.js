const mongoose = require('mongoose');

/** Counts how often each search term is used; drives the "Popular searches" chips. */
const searchLogSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayTerm: { type: String, required: true },
    count: { type: Number, default: 0 },
    lastSearchedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

searchLogSchema.index({ count: -1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
