/** Member 4 (Md Didarul Islam Nayan, 23301274) - Feature 1: Pharmacy Verification & Reviews */
const { Router } = require('express');
const ctrl = require('../controllers/verification.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { idParam } = require('../validators/common');
const v = require('../validators/member4.validators');

const router = Router();
const owner = [authenticate, authorize('owner')];
const admin = [authenticate, authorize('admin')];
const patient = [authenticate, authorize('patient')];

// pharmacy owner: registration + licence submission
router.post('/pharmacies/register', owner, imageUpload.single('licenceDocument'), validate(v.registerPharmacy), ctrl.registerPharmacy);
router.get('/pharmacies/mine/verification', owner, ctrl.myVerification);
router.put('/pharmacies/mine/licence', owner, imageUpload.single('licenceDocument'), validate(v.resubmitLicence), ctrl.resubmitLicence);

// admin verification
router.get('/admin/pharmacies', admin, validate(v.adminPharmacyQuery, 'query'), ctrl.adminList);
router.get('/admin/pharmacies/:id', admin, validate(idParam(), 'params'), ctrl.adminDetail);
router.patch('/admin/pharmacies/:id/verification', admin, validate(idParam(), 'params'), validate(v.decision), ctrl.decide);

// public profile + reviews
router.get('/pharmacies/:id', validate(idParam(), 'params'), ctrl.publicProfile);
router.get('/pharmacies/:id/reviews', validate(idParam(), 'params'), validate(v.reviewsQuery, 'query'), ctrl.listReviews);
router.get('/pharmacies/:id/reviewable-reservations', patient, validate(idParam(), 'params'), ctrl.reviewableReservations);
router.post('/pharmacies/:id/reviews', patient, validate(idParam(), 'params'), validate(v.createReview), ctrl.createReview);

module.exports = router;
