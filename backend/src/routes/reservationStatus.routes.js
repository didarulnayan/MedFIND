/** Member 2 (Abdullah Al Zahur Rafi, 22299050) - Feature 2: Reservation Status Tracking */
const { Router } = require('express');
const ctrl = require('../controllers/reservationStatus.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize, loadOwnerPharmacy } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const v = require('../validators/member2.validators');

const router = Router();
const patient = [authenticate, authorize('patient')];
const owner = [authenticate, authorize('owner'), loadOwnerPharmacy];

// patient side
router.get('/reservations/my', patient, validate(v.myReservationsQuery, 'query'), ctrl.myReservations);
router.get('/reservations/:id', authenticate, validate(idParam(), 'params'), ctrl.getReservation);
router.patch('/reservations/:id/cancel', patient, validate(idParam(), 'params'), validate(v.cancel), ctrl.cancelReservation);

// pharmacy owner side
router.get('/owner/reservations', owner, validate(v.inboxQuery, 'query'), ctrl.ownerInbox);
router.patch('/owner/reservations/:id/status', owner, validate(idParam(), 'params'), validate(v.advanceStatus), ctrl.advanceStatus);
router.patch('/owner/reservations/:id/reject', owner, validate(idParam(), 'params'), validate(v.reject), ctrl.rejectReservation);

// admin trigger for the node-cron expiry job
router.post('/admin/reservations/expire-overdue', authenticate, authorize('admin'), ctrl.expireOverdue);

module.exports = router;
