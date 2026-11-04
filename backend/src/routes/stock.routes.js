/** Member 1 (Audrija Chowdhury, 22299421) - Feature 2: Stock & Expiry Tracking */
const { Router } = require('express');
const ctrl = require('../controllers/stock.controller');
const validate = require('../middleware/validate');
const { authenticate, authorize, loadOwnerPharmacy } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const v = require('../validators/member1.validators');

const router = Router();
const owner = [authenticate, authorize('owner'), loadOwnerPharmacy];

router.get('/owner/stock/overview', owner, validate(v.stockOverviewQuery, 'query'), ctrl.overview);
router.post('/owner/stock/batches', owner, validate(v.addBatch), ctrl.addBatch);
router.get('/owner/stock/items/:itemId/batches', owner, validate(idParam('itemId'), 'params'), validate(v.batchListQuery, 'query'), ctrl.listBatches);
router.patch('/owner/stock/batches/:batchId', owner, validate(idParam('batchId'), 'params'), validate(v.updateBatch), ctrl.updateBatch);
router.delete('/owner/stock/batches/:batchId', owner, validate(idParam('batchId'), 'params'), ctrl.deleteBatch);
router.get('/owner/stock/expiry', owner, validate(v.expiryQuery, 'query'), ctrl.expiryInventory);
router.post('/owner/stock/items/:itemId/dispense', owner, validate(idParam('itemId'), 'params'), validate(v.dispense), ctrl.dispense);

module.exports = router;
