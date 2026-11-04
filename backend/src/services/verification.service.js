/** Member 4 - Feature 1: Pharmacy Verification & Reviews */
const mongoose = require('mongoose');
const { Pharmacy, Review, Reservation, User } = require('../models');
const ApiError = require('../utils/ApiError');
const { isOpenAt, pageMeta, escapeRegex } = require('../utils/helpers');
const { withTransaction } = require('./transaction');
const storage = require('./storage.service');
const { notify } = require('./notification.service');

const CHECKLIST_KEYS = ['tradeLicenceMatches', 'drugLicenceValid', 'contactComplete', 'noDuplicate'];

function verificationView(p) {
  return {
    pharmacyId: p._id,
    name: p.name,
    status: p.verification.status,
    verifiedBadge: p.verification.status === 'Verified',
    visibleInSearch: p.verification.status === 'Verified' && !p.isSuspended,
    isSuspended: p.isSuspended,
    note: p.verification.note || null,
    checklist: p.verification.checklist,
    licence: p.licence,
    reviewedAt: p.verification.reviewedAt || null,
    history: p.verification.history,
  };
}

// ---------- Pharmacy registration & licence submission (owner) ----------

async function registerPharmacy(owner, data, licenceFile) {
  if (await Pharmacy.exists({ owner: owner._id })) throw ApiError.conflict('You have already registered a pharmacy');
  const tradeNo = data.tradeLicenceNo.toUpperCase();
  const drugNo = data.drugLicenceNo.toUpperCase();
  const dup = await Pharmacy.findOne({ $or: [{ 'licence.tradeLicenceNo': tradeNo }, { 'licence.drugLicenceNo': drugNo }] });
  if (dup) throw ApiError.conflict('A pharmacy with this trade or drug licence number is already registered');

  const doc = licenceFile ? await storage.saveImage(licenceFile, 'licences') : null;
  const pharmacy = await Pharmacy.create({
    owner: owner._id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    address: { line: data.addressLine, area: data.area, city: data.city },
    location: { type: 'Point', coordinates: [data.lng, data.lat] },
    openingHours: data.openingHours,
    openingHoursText: data.openingHoursText,
    licence: { tradeLicenceNo: tradeNo, drugLicenceNo: drugNo, documentUrl: doc ? doc.url : undefined, submittedAt: new Date() },
    verification: { status: 'Pending', history: [{ status: 'Pending', by: owner._id, note: 'Registration submitted' }] },
  });

  const admins = await User.find({ role: 'admin', isActive: true }, '_id');
  for (const a of admins) {
    notify(a._id, { type: 'verification', title: 'New pharmacy to verify', message: `${pharmacy.name} submitted licence details for verification.`, data: { pharmacyId: pharmacy._id } }, { email: false });
  }
  return verificationView(pharmacy);
}

async function myVerification(owner) {
  const p = await Pharmacy.findOne({ owner: owner._id });
  if (!p) throw ApiError.notFound('You have not registered a pharmacy yet');
  return verificationView(p);
}

/** Resubmit licence details (e.g. after a rejection). Moves the pharmacy back to Pending. */
async function resubmitLicence(owner, { tradeLicenceNo, drugLicenceNo }, licenceFile) {
  const p = await Pharmacy.findOne({ owner: owner._id });
  if (!p) throw ApiError.notFound('You have not registered a pharmacy yet');
  if (p.verification.status === 'Verified') throw ApiError.conflict('Your pharmacy is already verified');

  const dup = await Pharmacy.findOne({
    _id: { $ne: p._id },
    $or: [{ 'licence.tradeLicenceNo': tradeLicenceNo.toUpperCase() }, { 'licence.drugLicenceNo': drugLicenceNo.toUpperCase() }],
  });
  if (dup) throw ApiError.conflict('These licence numbers belong to another registered pharmacy');

  const doc = licenceFile ? await storage.saveImage(licenceFile, 'licences') : null;
  p.licence.tradeLicenceNo = tradeLicenceNo;
  p.licence.drugLicenceNo = drugLicenceNo;
  if (doc) p.licence.documentUrl = doc.url;
  p.licence.submittedAt = new Date();
  p.verification.status = 'Pending';
  p.verification.note = undefined;
  p.verification.checklist = {};
  p.verification.history.push({ status: 'Pending', by: owner._id, note: 'Licence details resubmitted' });
  await p.save();
  return verificationView(p);
}

// ---------- Admin verification ----------

async function adminListPharmacies({ status, search, page, limit, skip }) {
  const filter = {};
  if (status === 'Suspended') filter.isSuspended = true;
  else if (status) filter['verification.status'] = status;
  if (search) filter.name = new RegExp(escapeRegex(search), 'i');

  const [total, list, pending, verified, rejected, suspended] = await Promise.all([
    Pharmacy.countDocuments(filter),
    Pharmacy.find(filter).populate('owner', 'name').sort({ 'licence.submittedAt': 1 }).skip(skip).limit(limit),
    Pharmacy.countDocuments({ 'verification.status': 'Pending' }),
    Pharmacy.countDocuments({ 'verification.status': 'Verified' }),
    Pharmacy.countDocuments({ 'verification.status': 'Rejected' }),
    Pharmacy.countDocuments({ isSuspended: true }),
  ]);
  return {
    counts: { pending, verified, rejected, suspended },
    pharmacies: list.map((p) => ({
      id: p._id,
      name: p.name,
      area: `${p.address.area}, ${p.address.city}`,
      owner: p.owner ? p.owner.name : null,
      tradeLicenceNo: p.licence.tradeLicenceNo,
      drugLicenceNo: p.licence.drugLicenceNo,
      status: p.verification.status,
      isSuspended: p.isSuspended,
      submittedAt: p.licence.submittedAt,
    })),
    pagination: pageMeta(page, limit, total),
  };
}

async function adminPharmacyDetail(id) {
  const p = await Pharmacy.findById(id).populate('owner', 'name phone email');
  if (!p) throw ApiError.notFound('Pharmacy not found');
  const possibleDuplicates = await Pharmacy.find({
    _id: { $ne: p._id },
    $or: [{ phone: p.phone }, { name: new RegExp(`^${escapeRegex(p.name)}$`, 'i'), 'address.area': p.address.area }],
  }, 'name address.area phone verification.status');

  return {
    id: p._id,
    name: p.name,
    status: p.verification.status,
    submitted: {
      owner: p.owner ? p.owner.name : null,
      phone: p.phone,
      email: p.email,
      tradeLicenceNo: p.licence.tradeLicenceNo,
      drugLicenceNo: p.licence.drugLicenceNo,
      licenceDocumentUrl: p.licence.documentUrl || null,
      address: `${p.address.line}, ${p.address.area}, ${p.address.city}`,
      openingHours: p.openingHoursText,
      location: { lat: p.location.coordinates[1], lng: p.location.coordinates[0] },
      submittedAt: p.licence.submittedAt,
    },
    checklist: p.verification.checklist,
    automatedChecks: {
      contactComplete: Boolean(p.phone && p.email && p.address.line && p.address.area),
      noDuplicate: possibleDuplicates.length === 0,
      possibleDuplicates,
    },
    note: p.verification.note || null,
    history: p.verification.history,
    isSuspended: p.isSuspended,
  };
}

/** Admin decision: Verified (badge + appears in search), Rejected (note required) or back to Pending. */
async function decideVerification(admin, id, { status, note, checklist = {} }) {
  const p = await Pharmacy.findById(id);
  if (!p) throw ApiError.notFound('Pharmacy not found');
  if (p.verification.status === status) throw ApiError.conflict(`Pharmacy is already ${status}`);
  if (status === 'Rejected' && !note) throw ApiError.badRequest('A note to the owner is required when rejecting');
  if (status === 'Verified') {
    const missing = CHECKLIST_KEYS.filter((k) => checklist[k] !== true);
    if (missing.length) throw ApiError.badRequest(`All checklist items must be confirmed before verifying. Missing: ${missing.join(', ')}`);
  }

  p.verification.status = status;
  p.verification.note = note;
  const currentChecklist = JSON.parse(JSON.stringify(p.verification.checklist || {}));
  p.verification.checklist = { ...currentChecklist, ...checklist };
  p.verification.reviewedBy = admin._id;
  p.verification.reviewedAt = new Date();
  p.verification.history.push({ status, by: admin._id, note });
  await p.save();

  notify(p.owner, {
    type: 'verification',
    title: `Pharmacy ${status.toLowerCase()}`,
    message: status === 'Verified'
      ? `${p.name} is now verified and visible in search results with a Verified badge.`
      : `${p.name} verification status: ${status}.${note ? ` Note: ${note}` : ''}`,
    data: { pharmacyId: p._id },
  });
  return verificationView(p);
}

// ---------- Public profile & reviews ----------

async function findPublicPharmacy(id) {
  const p = await Pharmacy.findOne({ _id: id, ...Pharmacy.publicFilter() });
  if (!p) throw ApiError.notFound('Pharmacy not found or not verified');
  return p;
}

async function ratingSummary(pharmacyId) {
  const rows = await Review.aggregate([
    { $match: { pharmacy: new mongoose.Types.ObjectId(String(pharmacyId)) } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const sum = rows.reduce((s, r) => s + r._id * r.count, 0);
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = (rows.find((r) => r._id === stars) || { count: 0 }).count;
    return { stars, count, percent: total ? Math.round((count / total) * 100) : 0 };
  });
  return { average: total ? Number((sum / total).toFixed(1)) : 0, count: total, distribution };
}

async function publicProfile(id) {
  const p = await findPublicPharmacy(id);
  return {
    id: p._id,
    name: p.name,
    verifiedBadge: true,
    openNow: isOpenAt(p.openingHours),
    address: `${p.address.line}, ${p.address.area}, ${p.address.city}`,
    openingHours: p.openingHoursText,
    phone: p.phone,
    location: { lat: p.location.coordinates[1], lng: p.location.coordinates[0] },
    rating: await ratingSummary(p._id),
    reviewPolicy: 'Only patients who collected a reservation can review.',
  };
}

async function listReviews(id, { page, limit, skip }) {
  const p = await findPublicPharmacy(id);
  const [total, reviews] = await Promise.all([
    Review.countDocuments({ pharmacy: p._id }),
    Review.find({ pharmacy: p._id }).populate('patient', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return {
    pharmacy: { id: p._id, name: p.name, ratingAverage: p.ratingAverage, ratingCount: p.ratingCount },
    reviews: reviews.map((r) => ({
      id: r._id,
      author: r.patient ? shortName(r.patient.name) : 'Patient',
      rating: r.rating,
      text: r.text || '',
      verifiedPurchase: true,
      createdAt: r.createdAt,
    })),
    pagination: pageMeta(page, limit, total),
  };
}

function shortName(name) {
  const [first, last] = name.split(' ');
  return last ? `${first} ${last[0]}.` : first;
}

/** Reservation dropdown on "Write a review": the patient's collected, not-yet-reviewed reservations here. */
async function reviewableReservations(patient, pharmacyId) {
  const list = await Reservation.find({ patient: patient._id, pharmacy: pharmacyId, status: 'Collected', reviewed: false }).sort({ collectedAt: -1 });
  return {
    reservations: list.map((r) => ({
      id: r._id,
      code: r.code,
      label: `#${r.code} ${r.medicineSnapshot.brandName} x ${r.quantity} (Collected)`,
      collectedAt: r.collectedAt,
    })),
  };
}

async function recalculateRating(pharmacyId, session) {
  const [row] = await Review.aggregate([
    { $match: { pharmacy: new mongoose.Types.ObjectId(String(pharmacyId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]).session(session || null);
  const ratingAverage = row ? Number(row.avg.toFixed(2)) : 0;
  const ratingCount = row ? row.count : 0;
  await Pharmacy.updateOne({ _id: pharmacyId }, { ratingAverage, ratingCount }, { session });
  return { ratingAverage, ratingCount };
}

async function createReview(patient, pharmacyId, { reservationId, rating, text }) {
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) throw ApiError.notFound('Pharmacy not found');
  const r = await Reservation.findById(reservationId);
  if (!r) throw ApiError.notFound('Reservation not found');
  if (!r.patient.equals(patient._id)) throw ApiError.forbidden('You can only review your own reservations');
  if (!r.pharmacy.equals(pharmacy._id)) throw ApiError.badRequest('This reservation was not made at this pharmacy');
  if (r.status !== 'Collected') throw ApiError.forbidden(`Only collected reservations can be reviewed (this one is ${Reservation.STATUS_LABELS[r.status]})`);
  if (r.reviewed || (await Review.exists({ reservation: r._id }))) throw ApiError.conflict('You have already reviewed this reservation');

  const result = await withTransaction(async (session) => {
    const [review] = await Review.create([{ pharmacy: pharmacy._id, patient: patient._id, reservation: r._id, rating, text }], { session });
    await Reservation.updateOne({ _id: r._id }, { reviewed: true }, { session });
    const pharmacyRating = await recalculateRating(pharmacy._id, session);
    return { review, pharmacyRating };
  });

  return {
    review: { id: result.review._id, rating, text: text || '', reservation: r.code, createdAt: result.review.createdAt },
    pharmacyRating: result.pharmacyRating,
  };
}

module.exports = {
  registerPharmacy, myVerification, resubmitLicence, adminListPharmacies, adminPharmacyDetail, decideVerification,
  publicProfile, listReviews, reviewableReservations, createReview, ratingSummary, recalculateRating,
};
