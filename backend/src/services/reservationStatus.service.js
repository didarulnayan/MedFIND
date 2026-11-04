/** Member 2 - Feature 2: Reservation Status Tracking */
const { Reservation, CatalogItem, Pharmacy } = require('../models');
const ApiError = require('../utils/ApiError');
const { pageMeta, startOfLocalDay } = require('../utils/helpers');
const { withTransaction } = require('./transaction');
const inventory = require('./inventory.service');
const { notify } = require('./notification.service');

const { STATUS_LABELS, ACTIVE_STATUSES } = Reservation;
const FLOW = ['Pending', 'Confirmed', 'ReadyForPickup', 'Collected'];
const OWNER_TRANSITIONS = { Pending: 'Confirmed', Confirmed: 'ReadyForPickup', ReadyForPickup: 'Collected' };
const CANCELLABLE = ['Pending', 'Confirmed']; // "You can cancel until the reservation is Ready for pickup"

const PATIENT_TABS = {
  all: {},
  active: { status: { $in: ACTIVE_STATUSES } },
  completed: { status: 'Collected' },
  cancelled: { status: { $in: ['Cancelled', 'Rejected', 'Expired'] } },
};

function summary(r) {
  return {
    id: r._id,
    code: r.code,
    medicine: `${r.medicineSnapshot.brandName} ${r.medicineSnapshot.strength} x ${r.quantity}`,
    pharmacy: r.pharmacySnapshot.name,
    quantity: r.quantity,
    totalPrice: r.totalPrice,
    pickupAt: r.pickupAt,
    status: r.status,
    statusLabel: STATUS_LABELS[r.status],
  };
}

/** Builds the 4-step timeline shown on the status page, plus any terminal state. */
function buildTimeline(r) {
  const reachedAt = {};
  for (const ev of r.statusHistory) if (!reachedAt[ev.status]) reachedAt[ev.status] = ev;
  const steps = FLOW.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    done: Boolean(reachedAt[status]),
    at: reachedAt[status] ? reachedAt[status].at : null,
    note: reachedAt[status] ? reachedAt[status].note : null,
  }));
  const terminal = ['Rejected', 'Cancelled', 'Expired'].includes(r.status)
    ? { status: r.status, label: STATUS_LABELS[r.status], at: reachedAt[r.status] && reachedAt[r.status].at }
    : null;
  return { steps, terminal };
}

async function loadForUser(user, id) {
  const r = await Reservation.findById(id).populate('patient', 'name phone email').populate('pharmacy', 'name owner address phone');
  if (!r) throw ApiError.notFound('Reservation not found');
  const isPatient = r.patient._id.equals(user._id);
  const isOwner = r.pharmacy.owner.equals(user._id);
  if (!isPatient && !isOwner && user.role !== 'admin') throw ApiError.forbidden('You cannot view this reservation');
  return { r, isPatient, isOwner };
}

async function myReservations(patient, { tab = 'all', page, limit, skip }) {
  const base = { patient: patient._id };
  const filter = { ...base, ...PATIENT_TABS[tab] };
  const [total, list, counts] = await Promise.all([
    Reservation.countDocuments(filter),
    Reservation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Promise.all(Object.values(PATIENT_TABS).map((f) => Reservation.countDocuments({ ...base, ...f }))),
  ]);
  return {
    counts: { all: counts[0], active: counts[1], completed: counts[2], cancelled: counts[3] },
    reservations: list.map(summary),
    pagination: pageMeta(page, limit, total),
  };
}

async function getReservation(user, id) {
  const { r, isOwner } = await loadForUser(user, id);
  const data = {
    ...summary(r),
    medicineDetails: r.medicineSnapshot,
    unitPrice: r.unitPrice,
    pickupDeadline: r.pickupDeadline,
    note: r.note || null,
    prescriptionUrl: r.prescription && r.prescription.url ? r.prescription.url : null,
    prescriptionRequired: Boolean(r.medicineSnapshot.requiresPrescription),
    rejection: r.status === 'Rejected' ? r.rejection : undefined,
    timeline: buildTimeline(r),
    history: r.statusHistory.map((h) => ({ status: h.status, label: STATUS_LABELS[h.status], at: h.at, note: h.note })),
    canCancel: CANCELLABLE.includes(r.status),
    pharmacyDetails: { name: r.pharmacy.name, address: `${r.pharmacy.address.line}, ${r.pharmacy.address.area}`, phone: r.pharmacy.phone },
  };
  if (isOwner || user.role === 'admin') {
    const item = await CatalogItem.findById(r.catalogItem);
    data.patient = { name: r.patient.name, phone: r.patient.phone };
    data.yourStock = item ? item.stockQuantity : 0;
    data.nextStatus = OWNER_TRANSITIONS[r.status] || null;
  }
  return data;
}

async function cancelReservation(patient, id, reason) {
  const r = await Reservation.findById(id);
  if (!r) throw ApiError.notFound('Reservation not found');
  if (!r.patient.equals(patient._id)) throw ApiError.forbidden('This reservation does not belong to you');
  if (!CANCELLABLE.includes(r.status)) {
    throw ApiError.conflict(`Cannot cancel a reservation that is ${STATUS_LABELS[r.status]}. Cancellation is allowed only before Ready for pickup.`);
  }
  r.status = 'Cancelled';
  r.statusHistory.push({ status: 'Cancelled', by: patient._id, note: reason || 'Cancelled by patient' });
  await r.save();
  const pharmacy = await Pharmacy.findById(r.pharmacy, 'owner');
  notify(pharmacy.owner, { type: 'reservation_status', title: `Reservation ${r.code} cancelled`, message: `${patient.name} cancelled reservation ${r.code}.`, data: { reservationId: r._id } });
  return summary(r);
}

async function ownerInbox(pharmacy, { status, page, limit, skip }) {
  const base = { pharmacy: pharmacy._id };
  const filter = status ? { ...base, status } : { ...base, status: { $in: ACTIVE_STATUSES } };
  const [total, list, pending, confirmed, ready, collectedToday] = await Promise.all([
    Reservation.countDocuments(filter),
    Reservation.find(filter).populate('patient', 'name phone').sort({ pickupAt: 1 }).skip(skip).limit(limit),
    Reservation.countDocuments({ ...base, status: 'Pending' }),
    Reservation.countDocuments({ ...base, status: 'Confirmed' }),
    Reservation.countDocuments({ ...base, status: 'ReadyForPickup' }),
    Reservation.countDocuments({ ...base, status: 'Collected', collectedAt: { $gte: startOfLocalDay() } }),
  ]);
  return {
    counts: { pending, confirmed, readyForPickup: ready, collectedToday },
    reservations: list.map((r) => ({ ...summary(r), patient: { name: r.patient.name, phone: r.patient.phone } })),
    pagination: pageMeta(page, limit, total),
  };
}

async function loadOwnedReservation(pharmacy, id) {
  const r = await Reservation.findOne({ _id: id, pharmacy: pharmacy._id });
  if (!r) throw ApiError.notFound('Reservation not found in your pharmacy');
  return r;
}

async function markExpired(r, session) {
  r.status = 'Expired';
  r.statusHistory.push({ status: 'Expired', note: 'Pickup deadline passed' });
  await r.save({ session });
  notify(r.patient, { type: 'reservation_status', title: `Reservation ${r.code} expired`, message: `Reservation ${r.code} expired because it was not collected before the pickup deadline.`, data: { reservationId: r._id } });
}

/** Owner moves a reservation one step forward: Pending -> Confirmed -> ReadyForPickup -> Collected. */
async function advanceStatus(owner, pharmacy, id, { status: requested, note }) {
  const r = await loadOwnedReservation(pharmacy, id);
  const expected = OWNER_TRANSITIONS[r.status];
  if (!expected) throw ApiError.conflict(`Reservation is ${STATUS_LABELS[r.status]}; no further status changes are allowed`);
  if (requested !== expected) {
    throw ApiError.conflict(`Invalid status transition ${STATUS_LABELS[r.status]} -> ${STATUS_LABELS[requested]}. Next allowed: ${STATUS_LABELS[expected]}`);
  }
  if (r.pickupDeadline < new Date()) {
    await markExpired(r);
    throw ApiError.conflict(`Reservation ${r.code} has expired (pickup deadline passed)`);
  }

  if (requested === 'Confirmed') {
    const item = await CatalogItem.findById(r.catalogItem);
    if (!item || !item.isActive) throw ApiError.conflict('This medicine is no longer in your catalog');
    const reservable = await inventory.reservableQuantity(item, { excludeReservationId: r._id });
    if (r.quantity > reservable) throw ApiError.conflict(`Insufficient stock to confirm: ${r.quantity} requested, ${reservable} reservable`);
  }

  await withTransaction(async (session) => {
    if (requested === 'Collected') {
      // stock reduces automatically on collection, earliest-expiring batch first
      r.consumedBatches = await inventory.consumeFEFO(r.catalogItem, r.quantity, session);
      r.collectedAt = new Date();
    }
    r.status = requested;
    r.statusHistory.push({ status: requested, by: owner._id, note: note || defaultNote(requested) });
    await r.save({ session });
  });

  notify(r.patient, {
    type: 'reservation_status',
    title: `Reservation ${r.code} is ${STATUS_LABELS[requested]}`,
    message: `Your reservation ${r.code} at ${r.pharmacySnapshot.name} is now ${STATUS_LABELS[requested]}.`,
    data: { reservationId: r._id },
  });

  const item = await CatalogItem.findById(r.catalogItem);
  return { ...summary(r), consumedBatches: requested === 'Collected' ? r.consumedBatches : undefined, remainingStock: item ? item.stockQuantity : undefined, nextStatus: OWNER_TRANSITIONS[r.status] || null };
}

function defaultNote(status) {
  return { Confirmed: 'Availability confirmed', ReadyForPickup: 'Ready for pickup', Collected: 'Collected by patient' }[status];
}

async function rejectReservation(owner, pharmacy, id, { reason, message }) {
  const r = await loadOwnedReservation(pharmacy, id);
  if (!['Pending', 'Confirmed'].includes(r.status)) {
    throw ApiError.conflict(`Only Pending or Confirmed reservations can be rejected (current: ${STATUS_LABELS[r.status]})`);
  }
  r.status = 'Rejected';
  r.rejection = { reason, message };
  r.statusHistory.push({ status: 'Rejected', by: owner._id, note: message ? `${reason}: ${message}` : reason });
  await r.save();
  notify(r.patient, {
    type: 'reservation_status',
    title: `Reservation ${r.code} rejected`,
    message: `${r.pharmacySnapshot.name} rejected reservation ${r.code}. Reason: ${reason}.${message ? ` ${message}` : ''}`,
    data: { reservationId: r._id },
  });
  return { ...summary(r), rejection: r.rejection };
}

/** Scheduled job (node-cron) and admin trigger: expire active reservations whose pickup deadline has passed. */
async function expireOverdueReservations() {
  const overdue = await Reservation.find({ status: { $in: ACTIVE_STATUSES }, pickupDeadline: { $lt: new Date() } });
  for (const r of overdue) await markExpired(r);
  return { expiredCount: overdue.length, codes: overdue.map((r) => r.code) };
}

module.exports = {
  myReservations, getReservation, cancelReservation, ownerInbox, advanceStatus, rejectReservation,
  expireOverdueReservations, buildTimeline, OWNER_TRANSITIONS,
};
