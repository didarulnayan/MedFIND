/** Member 4: Pharmacy Verification & Reviews + Complaints & Disputes */
const { z, objectId, pagination } = require('./common');
const { ISSUE_TYPES } = require('../models/Complaint');

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm');
const openingSlot = z.object({ day: z.coerce.number().int().min(0).max(6), open: time, close: time });

/** Opening hours arrive as JSON text when the form is sent as multipart/form-data. */
const openingHours = z.preprocess((v) => {
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}, z.array(openingSlot, { error: 'openingHours must be a JSON array of {day, open, close}' }).min(1, 'at least one opening slot is required').max(14, 'at most 14 opening slots'));

const licenceNo = (label) => z.string().trim().min(5, `${label} is too short`).max(40).regex(/^[A-Za-z0-9-]+$/, `${label} may contain letters, numbers and dashes only`);

// ----- Feature 1: verification & reviews -----
const registerPharmacy = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^01\d{9}$/, 'phone must be an 11-digit Bangladeshi mobile number'),
  email: z.string().trim().email(),
  addressLine: z.string().trim().min(3).max(200),
  area: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80).default('Dhaka'),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  openingHours,
  openingHoursText: z.string().trim().max(100).optional(),
  tradeLicenceNo: licenceNo('tradeLicenceNo'),
  drugLicenceNo: licenceNo('drugLicenceNo'),
});

const resubmitLicence = z.object({ tradeLicenceNo: licenceNo('tradeLicenceNo'), drugLicenceNo: licenceNo('drugLicenceNo') });

const adminPharmacyQuery = z.object({
  status: z.enum(['Pending', 'Verified', 'Rejected', 'Suspended']).optional(),
  search: z.string().trim().max(100).optional(),
  ...pagination,
});

const decision = z.object({
  status: z.enum(['Pending', 'Verified', 'Rejected']),
  note: z.string().trim().max(500).optional(),
  checklist: z
    .object({
      tradeLicenceMatches: z.boolean().optional(),
      drugLicenceValid: z.boolean().optional(),
      contactComplete: z.boolean().optional(),
      noDuplicate: z.boolean().optional(),
    })
    .strict()
    .optional(),
});

const reviewsQuery = z.object({ ...pagination });
const createReview = z.object({
  reservationId: objectId('reservationId'),
  rating: z.coerce.number().int('rating must be a whole number').min(1, 'rating must be between 1 and 5').max(5, 'rating must be between 1 and 5'),
  text: z.string().trim().max(1000).optional(),
});

// ----- Feature 2: complaints -----
const fileComplaint = z
  .object({
    targetType: z.enum(['pharmacy', 'reservation']),
    pharmacyId: objectId('pharmacyId').optional(),
    reservationId: objectId('reservationId').optional(),
    issueType: z.enum(ISSUE_TYPES, { error: `issueType must be one of: ${ISSUE_TYPES.join(', ')}` }),
    description: z.string().trim().min(10, 'description must have at least 10 characters').max(2000),
  })
  .refine((d) => (d.targetType === 'pharmacy' ? Boolean(d.pharmacyId) : Boolean(d.reservationId)), {
    message: 'pharmacyId is required for a pharmacy complaint; reservationId is required for a reservation complaint',
    path: ['targetType'],
  });

const myComplaintsQuery = z.object({ tab: z.enum(['all', 'open', 'under_review', 'closed']).default('all'), ...pagination });
const statusQuery = z.object({ status: z.enum(['Open', 'UnderReview', 'Resolved', 'Dismissed']).optional(), ...pagination });
const respond = z.object({ message: z.string().trim().min(5, 'message must have at least 5 characters').max(2000) });
const complaintStatus = z.object({
  status: z.enum(['UnderReview', 'Resolved', 'Dismissed'], { error: 'status must be one of UnderReview, Resolved, Dismissed' }),
  resolutionNote: z.string().trim().max(1000).optional(),
});
const suspend = z.object({ reason: z.string().trim().min(5, 'reason must have at least 5 characters').max(500) });
const reinstate = z.object({ note: z.string().trim().max(500).optional() });

module.exports = {
  registerPharmacy, resubmitLicence, adminPharmacyQuery, decision, reviewsQuery, createReview,
  fileComplaint, myComplaintsQuery, statusQuery, respond, complaintStatus, suspend, reinstate,
};
