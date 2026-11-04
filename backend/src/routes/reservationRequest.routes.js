/** Member 2 (Abdullah Al Zahur Rafi, 22299050) - Feature 1: Medicine Details & Reservation Request */
const { Router } = require('express');
const ctrl = require('../controllers/reservationRequest.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { z, objectId, idParam } = require('../validators/common');
const v = require('../validators/member2.validators');

const router = Router();
const patient = [authenticate, authorize('patient')];
const listingParams = z.object({ medicineId: objectId('medicineId'), pharmacyId: objectId('pharmacyId') });

router.get('/medicines/:medicineId', validate(idParam('medicineId'), 'params'), validate(v.detailsQuery, 'query'), ctrl.medicineDetails);
router.get('/medicines/:medicineId/pharmacies/:pharmacyId/availability', validate(listingParams, 'params'), validate(v.availabilityQuery, 'query'), ctrl.availability);
router.post('/reservations', patient, imageUpload.single('prescription'), validate(v.createReservation), ctrl.createReservation);
router.put('/reservations/:id/prescription', patient, validate(idParam(), 'params'), imageUpload.single('prescription'), ctrl.uploadPrescription);

module.exports = router;
