/** Member 3 (Abdullah Al Muqit, 22201783) - Feature 2: Nearby Pharmacies & Sorting (public) */
const { Router } = require('express');
const ctrl = require('../controllers/nearby.controller');
const validate = require('../middleware/validate');
const { idParam } = require('../validators/common');
const v = require('../validators/member3.validators');

const router = Router();

router.get('/locations/areas', validate(v.areasQuery, 'query'), ctrl.areas);
router.get('/locations/resolve', validate(v.resolveQuery, 'query'), ctrl.resolve);
router.get('/nearby/pharmacies', validate(v.nearbyQuery, 'query'), ctrl.nearby);
router.get('/nearby/pharmacies/:pharmacyId', validate(idParam('pharmacyId'), 'params'), validate(v.pharmacySummaryQuery, 'query'), ctrl.pharmacySummary);

module.exports = router;
