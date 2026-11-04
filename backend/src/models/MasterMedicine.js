const mongoose = require('mongoose');

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 'Cream', 'Inhaler', 'Powder'];

/** Platform-wide medicine list maintained by admins. Pharmacies pick from this list when building their catalog. */
const masterMedicineSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true, maxlength: 100 },
    genericName: { type: String, required: true, trim: true, maxlength: 150 },
    manufacturer: { type: String, required: true, trim: true, maxlength: 100 },
    strength: { type: String, required: true, trim: true, maxlength: 50 },
    dosageForm: { type: String, required: true, enum: DOSAGE_FORMS },
    unit: { type: String, default: 'pc', enum: ['pc', 'bottle', 'vial', 'tube', 'pack'] },
    requiresPrescription: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

masterMedicineSchema.index({ brandName: 1, strength: 1, dosageForm: 1, manufacturer: 1 }, { unique: true });
masterMedicineSchema.index({ genericName: 1 });
masterMedicineSchema.index({ manufacturer: 1 });

masterMedicineSchema.virtual('displayName').get(function displayName() {
  return `${this.brandName} ${this.strength}`;
});

module.exports = mongoose.model('MasterMedicine', masterMedicineSchema);
module.exports.DOSAGE_FORMS = DOSAGE_FORMS;
