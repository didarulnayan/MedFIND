/** Member 4 (Md Didarul Islam Nayan, 23301274) - Feature 2: Complaints & Disputes */
const { Router } = require('express');
const ctrl = require('../controllers/complaint.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize, loadOwnerPharmacy } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { idParam } = require('../validators/common');
const v = require('../validators/member4.validators');

const router = Router();
const patient = [authenticate, authorize('patient')];
const owner = [authenticate, authorize('owner'), loadOwnerPharmacy];
const admin = [authenticate, authorize('admin')];

// patient
router.post('/complaints', patient, imageUpload.array('evidence', 3), validate(v.fileComplaint), ctrl.fileComplaint);
router.get('/complaints/my', patient, validate(v.myComplaintsQuery, 'query'), ctrl.myComplaints);
router.get('/complaints/:id', authenticate, validate(idParam(), 'params'), ctrl.getComplaint);

// pharmacy owner
router.get('/owner/complaints', owner, validate(v.statusQuery, 'query'), ctrl.ownerComplaints);
router.patch('/owner/complaints/:id/response', owner, validate(idParam(), 'params'), validate(v.respond), ctrl.respond);

// admin
router.get('/admin/complaints', admin, validate(v.statusQuery, 'query'), ctrl.adminComplaints);
router.patch('/admin/complaints/:id/status', admin, validate(idParam(), 'params'), validate(v.complaintStatus), ctrl.updateStatus);
router.patch('/admin/pharmacies/:id/suspend', admin, validate(idParam(), 'params'), validate(v.suspend), ctrl.suspend);
router.patch('/admin/pharmacies/:id/reinstate', admin, validate(idParam(), 'params'), validate(v.reinstate), ctrl.reinstate);

module.exports = router;
