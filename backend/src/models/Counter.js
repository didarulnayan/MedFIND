const mongoose = require('mongoose');

/** Sequential human-readable codes such as R-1042 (reservations) and C-212 (complaints). */
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

counterSchema.statics.next = async function next(name, start = 1000, session) {
  // first call seeds the counter at `start`, so the first code is start + 1
  await this.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true, session });
  const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, session });
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
