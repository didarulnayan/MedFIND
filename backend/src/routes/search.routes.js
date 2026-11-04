/** Member 3 (Abdullah Al Muqit, 22201783) - Feature 1: Medicine Search & Filter (public) */
const { Router } = require('express');
const ctrl = require('../controllers/search.controller');
const validate = require('../middleware/validate');
const v = require('../validators/member3.validators');

const router = Router();

router.get('/search/suggestions', validate(v.suggestionsQuery, 'query'), ctrl.suggestions);
router.get('/search/medicines', validate(v.searchQuery, 'query'), ctrl.searchMedicines);
router.get('/search/filters', validate(v.filtersQuery, 'query'), ctrl.filterOptions);
router.get('/search/popular', validate(v.popularQuery, 'query'), ctrl.popular);

module.exports = router;
