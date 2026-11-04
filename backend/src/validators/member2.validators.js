/** Member 2: Medicine Details & Reservation Request + Reservation Status Tracking */
const { z, objectId, pagination, boolFlag } = require('./common');
const { REJECTION_REASONS } = require('../models/Reservation');

// ----- Feature 1 -----
const detailsQuery = z.object({
  sort: z.enum(['price', 'rating', 'updated', 'stock']).default('price'),
  inStockOnly: boolFlag,
});

const availabilityQuery = z.object({ quantity: z.coerce.number().int().min(1).max(500).default(1) });

const createReservation = z.object({
  medicineId: objectId('medicineId'),
  pharmacyId: objectId('pharmacyId'),
  quantity: z.coerce.number({ error: 'quantity must be a number' }).int('quantity must be a whole number').min(1, 'quantity must be at least 1').max(500, 'quantity cannot exceed 500'),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pickupDate must be YYYY-MM-DD'),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'pickupTime must be HH:mm (24-hour)'),
  note: z.string().trim().max(500).optional(),
});

// ----- Feature 2 -----
const myReservationsQuery = z.object({ tab: z.enum(['all', 'active', 'completed', 'cancelled']).default('all'), ...pagination });
const cancel = z.object({ reason: z.string().trim().max(200).optional() });
const inboxQuery = z.object({
  status: z.enum(['Pending', 'Confirmed', 'ReadyForPickup', 'Collected', 'Rejected', 'Cancelled', 'Expired']).optional(),
  ...pagination,
});
const advanceStatus = z.object({
  status: z.enum(['Confirmed', 'ReadyForPickup', 'Collected'], { error: 'status must be one of Confirmed, ReadyForPickup, Collected' }),
  note: z.string().trim().max(200).optional(),
});
const reject = z.object({
  reason: z.enum(REJECTION_REASONS, { error: `reason must be one of: ${REJECTION_REASONS.join(', ')}` }),
  message: z.string().trim().max(500).optional(),
});

module.exports = { detailsQuery, availabilityQuery, createReservation, myReservationsQuery, cancel, inboxQuery, advanceStatus, reject, objectId };
