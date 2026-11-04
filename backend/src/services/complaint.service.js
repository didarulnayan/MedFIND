/** Member 4 - Feature 2: Complaints & Disputes */
const { Complaint, Reservation, Pharmacy, Counter } = require('../models');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { pageMeta, addDays } = require('../utils/helpers');
const storage = require('./storage.service');
const { notify } = require('./notification.service');

const { COMPLAINT_STATUS_LABELS: LABELS, COMPLAINT_TRANSITIONS } = Complaint;

const PATIENT_TABS = {
  all: {},
  open: { status: 'Open' },
  under_review: { status: 'UnderReview' },
  closed: { status: { $in: ['Resolved', 'Dismissed'] } },
};

function latestUpdate(c) {
  if (['Resolved', 'Dismissed'].includes(c.status) && c.resolutionNote) return `Admin: ${c.resolutionNote}`;
  if (c.pharmacyResponse && c.pharmacyResponse.message) {
    return c.status === 'UnderReview' ? 'Pharmacy replied. Admin is reviewing.' : 'Pharmacy replied.';
  }
  return 'Waiting for the pharmacy to respond.';
}

function summary(c) {
  return {
    id: c._id,
    code: c.code,
    issueType: c.issueType,
    pharmacy: c.pharmacy && c.pharmacy.name ? c.pharmacy.name : c.pharmacy,
    reservation: c.reservation && c.reservation.code ? c.reservation.code : c.reservation || null,
    status: c.status,
    statusLabel: LABELS[c.status],
    latestUpdate: latestUpdate(c),
    createdAt: c.createdAt,
  };
}

function detail(c) {
  return {
    ...summary(c),
    targetType: c.targetType,
    description: c.description,
    evidence: c.evidence.map((e) => e.url),
    filedBy: c.patient && c.patient.name ? c.patient.name : undefined,
    pharmacyResponse: c.pharmacyResponse && c.pharmacyResponse.message ? c.pharmacyResponse : null,
    resolutionNote: c.resolutionNote || null,
    history: c.history.map((h) => ({ action: h.action, status: h.status, statusLabel: h.status ? LABELS[h.status] : undefined, note: h.note, at: h.at })),
  };
}

async function validComplaintCount(pharmacyId) {
  const since = addDays(new Date(), -env.suspension.windowDays);
  return Complaint.countDocuments({ pharmacy: pharmacyId, status: 'Resolved', resolvedAt: { $gte: since } });
}

// ---------- Patient ----------

async function fileComplaint(patient, { targetType, pharmacyId, reservationId, issueType, description }, files = []) {
  let pharmacy;
  let reservation = null;

  if (targetType === 'reservation') {
    if (!reservationId) throw ApiError.badRequest('reservationId is required for a reservation complaint');
    reservation = await Reservation.findById(reservationId);
    if (!reservation) throw ApiError.notFound('Reservation not found');
    if (!reservation.patient.equals(patient._id)) throw ApiError.forbidden('You can only complain about your own reservations');
    pharmacy = await Pharmacy.findById(reservation.pharmacy);
    const open = await Complaint.exists({ reservation: reservation._id, status: { $in: ['Open', 'UnderReview'] } });
    if (open) throw ApiError.conflict('You already have an open complaint for this reservation');
  } else {
    if (!pharmacyId) throw ApiError.badRequest('pharmacyId is required for a pharmacy complaint');
    pharmacy = await Pharmacy.findById(pharmacyId);
  }
  if (!pharmacy) throw ApiError.notFound('Pharmacy not found');

  const evidence = await storage.saveImages(files, 'evidence');
  const seq = await Counter.next('complaint', 200);
  const complaint = await Complaint.create({
    code: `C-${seq}`,
    patient: patient._id,
    pharmacy: pharmacy._id,
    targetType,
    reservation: reservation ? reservation._id : undefined,
    issueType,
    description,
    evidence,
    status: 'Open',
    history: [{ action: 'filed', status: 'Open', by: patient._id, note: issueType }],
  });

  notify(pharmacy.owner, {
    type: 'complaint_update',
    title: `New complaint ${complaint.code}`,
    message: `A patient filed a complaint (${issueType}) against ${pharmacy.name}. Please respond.`,
    data: { complaintId: complaint._id },
  });

  await complaint.populate([{ path: 'pharmacy', select: 'name' }, { path: 'reservation', select: 'code' }]);
  return detail(complaint);
}

async function myComplaints(patient, { tab = 'all', page, limit, skip }) {
  const base = { patient: patient._id };
  const filter = { ...base, ...PATIENT_TABS[tab] };
  const [total, list, counts] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter).populate('pharmacy', 'name').populate('reservation', 'code').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Promise.all(Object.values(PATIENT_TABS).map((f) => Complaint.countDocuments({ ...base, ...f }))),
  ]);
  return {
    counts: { all: counts[0], open: counts[1], underReview: counts[2], closed: counts[3] },
    complaints: list.map(summary),
    pagination: pageMeta(page, limit, total),
  };
}

/** Complaint detail: visible to the patient who filed it, the owner of the pharmacy, and admins. */
async function getComplaint(user, id) {
  const c = await Complaint.findById(id).populate('pharmacy', 'name owner').populate('reservation', 'code').populate('patient', 'name');
  if (!c) throw ApiError.notFound('Complaint not found');
  const isPatient = c.patient._id.equals(user._id);
  const isOwner = c.pharmacy.owner.equals(user._id);
  if (!isPatient && !isOwner && user.role !== 'admin') throw ApiError.forbidden('You cannot view this complaint');
  const data = detail(c);
  if (user.role === 'admin') {
    const valid = await validComplaintCount(c.pharmacy._id);
    data.pharmacyRecord = {
      validComplaintsLast30Days: valid,
      suspensionThreshold: env.suspension.minValidComplaints,
      canSuspend: valid >= env.suspension.minValidComplaints,
    };
  }
  return data;
}

// ---------- Pharmacy owner ----------

async function ownerComplaints(pharmacy, { status, page, limit, skip }) {
  const filter = { pharmacy: pharmacy._id, ...(status ? { status } : {}) };
  const [total, list] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter).populate('patient', 'name').populate('reservation', 'code').sort({ createdAt: -1 }).skip(skip).limit(limit),
  ]);
  return {
    complaints: list.map((c) => ({ ...summary(c), pharmacy: pharmacy.name, from: c.patient.name, description: c.description, evidence: c.evidence.map((e) => e.url), responded: Boolean(c.pharmacyResponse && c.pharmacyResponse.message) })),
    pagination: pageMeta(page, limit, total),
  };
}

async function respondToComplaint(owner, pharmacy, id, { message }) {
  const c = await Complaint.findById(id);
  if (!c) throw ApiError.notFound('Complaint not found');
  if (!c.pharmacy.equals(pharmacy._id)) throw ApiError.forbidden('This complaint is not about your pharmacy');
  if (['Resolved', 'Dismissed'].includes(c.status)) throw ApiError.conflict(`Complaint is already ${LABELS[c.status]}; responses are closed`);

  const isUpdate = Boolean(c.pharmacyResponse && c.pharmacyResponse.message);
  c.pharmacyResponse = { message, respondedAt: new Date(), respondedBy: owner._id };
  c.history.push({ action: 'pharmacy_response', status: c.status, by: owner._id, note: isUpdate ? 'Response updated' : 'Pharmacy responded' });
  await c.save();

  notify(c.patient, { type: 'complaint_update', title: `Pharmacy replied to ${c.code}`, message: `${pharmacy.name} responded to your complaint ${c.code}.`, data: { complaintId: c._id } });
  await c.populate([{ path: 'pharmacy', select: 'name' }, { path: 'reservation', select: 'code' }]);
  return detail(c);
}

// ---------- Admin ----------

async function adminComplaints({ status, page, limit, skip }) {
  const filter = status ? { status } : {};
  const [total, list, ...counts] = await Promise.all([
    Complaint.countDocuments(filter),
    Complaint.find(filter).populate('pharmacy', 'name').populate('patient', 'name').populate('reservation', 'code').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ...['Open', 'UnderReview', 'Resolved', 'Dismissed'].map((s) => Complaint.countDocuments({ status: s })),
  ]);
  return {
    counts: { open: counts[0], underReview: counts[1], resolved: counts[2], dismissed: counts[3] },
    complaints: list.map((c) => ({ ...summary(c), filedBy: c.patient.name })),
    pagination: pageMeta(page, limit, total),
  };
}

async function updateComplaintStatus(admin, id, { status, resolutionNote }) {
  const c = await Complaint.findById(id);
  if (!c) throw ApiError.notFound('Complaint not found');
  if (!COMPLAINT_TRANSITIONS[c.status].includes(status)) {
    throw ApiError.conflict(`Invalid status change ${LABELS[c.status]} -> ${LABELS[status]}. Allowed: ${COMPLAINT_TRANSITIONS[c.status].map((s) => LABELS[s]).join(', ') || 'none (final state)'}`);
  }
  if (['Resolved', 'Dismissed'].includes(status) && !resolutionNote) {
    throw ApiError.badRequest('A resolution note is required to resolve or dismiss a complaint');
  }
  c.status = status;
  if (resolutionNote) c.resolutionNote = resolutionNote;
  c.reviewedBy = admin._id;
  if (['Resolved', 'Dismissed'].includes(status)) c.resolvedAt = new Date();
  c.history.push({ action: 'status_change', status, by: admin._id, note: resolutionNote });
  await c.save();

  const pharmacy = await Pharmacy.findById(c.pharmacy, 'name owner');
  const msg = `Complaint ${c.code} is now ${LABELS[status]}.${resolutionNote ? ` Note: ${resolutionNote}` : ''}`;
  notify(c.patient, { type: 'complaint_update', title: `Complaint ${c.code} updated`, message: msg, data: { complaintId: c._id } });
  notify(pharmacy.owner, { type: 'complaint_update', title: `Complaint ${c.code} updated`, message: msg, data: { complaintId: c._id } });

  const valid = await validComplaintCount(c.pharmacy);
  await c.populate([{ path: 'pharmacy', select: 'name' }, { path: 'reservation', select: 'code' }]);
  return {
    complaint: detail(c),
    pharmacyRecord: { validComplaintsLast30Days: valid, suspensionThreshold: env.suspension.minValidComplaints, canSuspend: valid >= env.suspension.minValidComplaints },
  };
}

/** Suspend a pharmacy that received repeated valid (Resolved) complaints in the last N days. */
async function suspendPharmacy(admin, pharmacyId, { reason }) {
  const p = await Pharmacy.findById(pharmacyId);
  if (!p) throw ApiError.notFound('Pharmacy not found');
  if (p.isSuspended) throw ApiError.conflict('Pharmacy is already suspended');
  const valid = await validComplaintCount(p._id);
  if (valid < env.suspension.minValidComplaints) {
    throw ApiError.conflict(`Suspension requires at least ${env.suspension.minValidComplaints} valid complaints in the last ${env.suspension.windowDays} days (this pharmacy has ${valid})`);
  }
  p.isSuspended = true;
  p.suspension = { reason, at: new Date(), by: admin._id };
  await p.save();
  notify(p.owner, { type: 'complaint_update', title: 'Pharmacy suspended', message: `${p.name} has been suspended and hidden from search. Reason: ${reason}`, data: { pharmacyId: p._id } });
  return { id: p._id, name: p.name, isSuspended: true, suspension: p.suspension, validComplaintsLast30Days: valid, visibleInSearch: false };
}

async function reinstatePharmacy(admin, pharmacyId, { note }) {
  const p = await Pharmacy.findById(pharmacyId);
  if (!p) throw ApiError.notFound('Pharmacy not found');
  if (!p.isSuspended) throw ApiError.conflict('Pharmacy is not suspended');
  p.isSuspended = false;
  p.suspension = { reason: `Reinstated: ${note || 'by admin'}`, at: new Date(), by: admin._id };
  await p.save();
  notify(p.owner, { type: 'complaint_update', title: 'Pharmacy reinstated', message: `${p.name} has been reinstated and is visible again.`, data: { pharmacyId: p._id } });
  return { id: p._id, name: p.name, isSuspended: false, visibleInSearch: p.verification.status === 'Verified' };
}

module.exports = {
  fileComplaint, myComplaints, getComplaint, ownerComplaints, respondToComplaint, adminComplaints,
  updateComplaintStatus, suspendPharmacy, reinstatePharmacy, validComplaintCount,
};
