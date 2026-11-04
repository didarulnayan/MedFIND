/** Member 2 - Feature 1: Medicine Details & Reservation Request */
const { MasterMedicine, CatalogItem, Pharmacy, Reservation, Counter } = require('../models');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { localDateTime, isOpenAt, addDays } = require('../utils/helpers');
const inventory = require('./inventory.service');
const storage = require('./storage.service');
const { notify } = require('./notification.service');

const DISCLAIMER = 'Used for general medicine information only. Ask your pharmacist or doctor for medical advice.';

function medicineInfo(m) {
  return {
    id: m._id, brandName: m.brandName, genericName: m.genericName, manufacturer: m.manufacturer,
    strength: m.strength, dosageForm: m.dosageForm, unit: m.unit, requiresPrescription: m.requiresPrescription,
  };
}

function pharmacyInfo(p) {
  return {
    id: p._id, name: p.name, area: p.address.area, address: `${p.address.line}, ${p.address.area}, ${p.address.city}`,
    verified: p.verification.status === 'Verified', rating: p.ratingAverage, ratingCount: p.ratingCount,
    openNow: isOpenAt(p.openingHours), openingHours: p.openingHoursText,
  };
}

async function findPublicMedicine(medicineId) {
  const medicine = await MasterMedicine.findOne({ _id: medicineId, isActive: true });
  if (!medicine) throw ApiError.notFound('Medicine not found');
  return medicine;
}

/** Medicine details page: which verified pharmacies list it, at what price, with what stock and when updated. */
async function getMedicineDetails(medicineId, { sort = 'price', inStockOnly = false } = {}) {
  const medicine = await findPublicMedicine(medicineId);
  const items = await CatalogItem.find({ medicine: medicine._id, isActive: true })
    .populate({ path: 'pharmacy', match: Pharmacy.publicFilter() });

  let listings = items
    .filter((i) => i.pharmacy)
    .map((i) => ({
      catalogItemId: i._id,
      pharmacy: pharmacyInfo(i.pharmacy),
      price: i.price,
      reportedStock: i.stockQuantity,
      stockStatus: i.stockStatus,
      lastUpdatedAt: i.lastUpdatedAt,
      canReserve: i.stockQuantity > 0,
    }));
  if (inStockOnly) listings = listings.filter((l) => l.reportedStock > 0);

  const sorters = {
    price: (a, b) => a.price - b.price,
    rating: (a, b) => b.pharmacy.rating - a.pharmacy.rating,
    updated: (a, b) => b.lastUpdatedAt - a.lastUpdatedAt,
    stock: (a, b) => b.reportedStock - a.reportedStock,
  };
  listings.sort(sorters[sort] || sorters.price);

  const prices = listings.map((l) => l.price);
  return {
    medicine: medicineInfo(medicine),
    prescription: medicine.requiresPrescription ? 'Prescription required' : 'Prescription: not required',
    disclaimer: DISCLAIMER,
    priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices), unit: medicine.unit } : null,
    pharmacyCount: listings.length,
    pharmacies: listings,
    note: 'Prices and stock are reported by pharmacies. Pharmacies must confirm availability before you travel.',
  };
}

async function findListing(medicineId, pharmacyId) {
  const medicine = await findPublicMedicine(medicineId);
  const pharmacy = await Pharmacy.findOne({ _id: pharmacyId, ...Pharmacy.publicFilter() });
  if (!pharmacy) throw ApiError.notFound('Pharmacy not found or not verified');
  const item = await CatalogItem.findOne({ pharmacy: pharmacy._id, medicine: medicine._id, isActive: true });
  if (!item) throw ApiError.notFound('This pharmacy does not list this medicine');
  return { medicine, pharmacy, item };
}

/** Reservation form summary: price, reported stock, how many units can still be reserved, estimated total. */
async function getAvailability(medicineId, pharmacyId, quantity = 1) {
  const { medicine, pharmacy, item } = await findListing(medicineId, pharmacyId);
  const reservable = await inventory.reservableQuantity(item);
  return {
    medicine: medicineInfo(medicine),
    pharmacy: pharmacyInfo(pharmacy),
    catalogItemId: item._id,
    pricePerUnit: item.price,
    reportedStock: item.stockQuantity,
    lastUpdatedAt: item.lastUpdatedAt,
    reservableQuantity: reservable,
    quantity,
    estimatedTotal: Number((item.price * quantity).toFixed(2)),
    canReserve: reservable >= quantity,
    prescriptionRequired: medicine.requiresPrescription,
    pickupRules: {
      minLeadMinutes: env.reservation.minLeadMinutes,
      maxDaysAhead: env.reservation.maxDaysAhead,
      openingHours: pharmacy.openingHoursText,
    },
    note: 'Final price is confirmed by the pharmacy.',
  };
}

function validatePickup(pharmacy, pickupDate, pickupTime) {
  const pickupAt = localDateTime(pickupDate, pickupTime);
  if (!pickupAt) throw ApiError.badRequest('Invalid pickup date or time');
  const now = new Date();
  const earliest = new Date(now.getTime() + env.reservation.minLeadMinutes * 60000);
  if (pickupAt < earliest) {
    throw ApiError.badRequest(`Pickup time must be at least ${env.reservation.minLeadMinutes} minutes from now`);
  }
  if (pickupAt > addDays(now, env.reservation.maxDaysAhead)) {
    throw ApiError.badRequest(`Pickup must be within ${env.reservation.maxDaysAhead} days`);
  }
  if (pharmacy.openingHours.length && !isOpenAt(pharmacy.openingHours, pickupAt)) {
    throw ApiError.badRequest(`The pharmacy is closed at the selected pickup time (${pharmacy.openingHoursText || 'see opening hours'})`);
  }
  return pickupAt;
}

async function createReservation(patient, { medicineId, pharmacyId, quantity, pickupDate, pickupTime, note }, prescriptionFile) {
  const { medicine, pharmacy, item } = await findListing(medicineId, pharmacyId);

  if (medicine.requiresPrescription && !prescriptionFile) {
    throw ApiError.badRequest(`${medicine.brandName} is a prescription-only medicine. Please upload a prescription image.`);
  }

  const pickupAt = validatePickup(pharmacy, pickupDate, pickupTime);

  const duplicate = await Reservation.exists({
    patient: patient._id, catalogItem: item._id, status: { $in: Reservation.ACTIVE_STATUSES },
  });
  if (duplicate) throw ApiError.conflict('You already have an active reservation for this medicine at this pharmacy');

  const reservable = await inventory.reservableQuantity(item);
  if (quantity > reservable) {
    throw ApiError.conflict(`Only ${reservable} unit(s) can be reserved at this pharmacy right now`);
  }

  const prescription = prescriptionFile ? await storage.saveImage(prescriptionFile, 'prescriptions') : undefined;
  const seq = await Counter.next('reservation', 1000);

  const reservation = await Reservation.create({
    code: `R-${seq}`,
    patient: patient._id,
    pharmacy: pharmacy._id,
    catalogItem: item._id,
    medicine: medicine._id,
    medicineSnapshot: {
      brandName: medicine.brandName, genericName: medicine.genericName, strength: medicine.strength,
      dosageForm: medicine.dosageForm, manufacturer: medicine.manufacturer, requiresPrescription: medicine.requiresPrescription,
    },
    pharmacySnapshot: { name: pharmacy.name, area: pharmacy.address.area },
    quantity,
    unitPrice: item.price,
    totalPrice: Number((item.price * quantity).toFixed(2)),
    pickupAt,
    pickupDeadline: new Date(pickupAt.getTime() + env.reservation.graceMinutes * 60000),
    note,
    prescription,
    status: 'Pending',
    statusHistory: [{ status: 'Pending', by: patient._id, note: 'Request sent' }],
  });

  notify(pharmacy.owner, {
    type: 'new_reservation',
    title: `New reservation ${reservation.code}`,
    message: `${patient.name} requested ${medicine.brandName} ${medicine.strength} x ${quantity} for pickup at ${pickupAt.toISOString()}.`,
    data: { reservationId: reservation._id },
  });

  return {
    reservation: {
      id: reservation._id,
      code: reservation.code,
      status: reservation.status,
      statusLabel: reservation.statusLabel,
      medicine: `${medicine.brandName} ${medicine.strength} x ${quantity}`,
      pharmacy: `${pharmacy.name}, ${pharmacy.address.area}`,
      quantity,
      unitPrice: reservation.unitPrice,
      estimatedTotal: reservation.totalPrice,
      pickupAt: reservation.pickupAt,
      pickupDeadline: reservation.pickupDeadline,
      prescriptionUrl: prescription ? prescription.url : null,
    },
    message: `${pharmacy.name} will confirm your reservation soon.`,
  };
}

/** Attach or replace the prescription image while the request is still Pending. */
async function uploadPrescription(patient, reservationId, file) {
  if (!file) throw ApiError.badRequest('Prescription image is required (form-data field "prescription")');
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw ApiError.notFound('Reservation not found');
  if (!reservation.patient.equals(patient._id)) throw ApiError.forbidden('This reservation does not belong to you');
  if (reservation.status !== 'Pending') {
    throw ApiError.conflict(`Prescription can only be changed while the reservation is Pending (current: ${reservation.statusLabel})`);
  }
  reservation.prescription = await storage.saveImage(file, 'prescriptions');
  reservation.statusHistory.push({ status: 'Pending', by: patient._id, note: 'Prescription uploaded' });
  await reservation.save();
  return { id: reservation._id, code: reservation.code, prescriptionUrl: reservation.prescription.url };
}

module.exports = { getMedicineDetails, getAvailability, createReservation, uploadPrescription, validatePickup };
