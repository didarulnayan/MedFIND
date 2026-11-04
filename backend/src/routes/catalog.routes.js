/** Member 1 (Audrija Chowdhury, 22299421) - Feature 1: Medicine Catalog Management */
const { Router } = require('express');
const ctrl = require('../controllers/catalog.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize, loadOwnerPharmacy } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const v = require('../validators/member1.validators');

const router = Router();
const owner = [authenticate, authorize('owner'), loadOwnerPharmacy];

router.get('/master-medicines', owner, validate(v.masterListQuery, 'query'), ctrl.searchMasterList);
router.get('/owner/catalog', owner, validate(v.catalogListQuery, 'query'), ctrl.listCatalog);
router.post('/owner/catalog', owner, validate(v.addCatalogItem), ctrl.addToCatalog);
router.get('/owner/catalog/:itemId', owner, validate(idParam('itemId'), 'params'), ctrl.getCatalogItem);
router.patch('/owner/catalog/:itemId', owner, validate(idParam('itemId'), 'params'), validate(v.updateCatalogItem), ctrl.updateCatalogItem);
router.delete('/owner/catalog/:itemId', owner, validate(idParam('itemId'), 'params'), ctrl.removeCatalogItem);
// Integration endpoint (price history is recorded by every price change above)
router.get('/owner/catalog/:itemId/price-history', owner, validate(idParam('itemId'), 'params'), ctrl.priceHistory);

module.exports = router;
