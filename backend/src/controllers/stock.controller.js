/** Member 1 - Feature 2: Stock & Expiry Tracking */
const service = require('../services/stock.service');
const { ok, created } = require('../utils/helpers');

async function overview(req, res) {
  ok(res, await service.overview(req.pharmacy, req.validatedQuery), 'Stock overview');
}

async function addBatch(req, res) {
  created(res, await service.addBatch(req.pharmacy, req.body), 'Stock batch added');
}

async function listBatches(req, res) {
  ok(res, await service.listBatches(req.pharmacy, req.params.itemId, req.validatedQuery), 'Medicine batches');
}

async function updateBatch(req, res) {
  ok(res, await service.updateBatch(req.pharmacy, req.params.batchId, req.body), 'Batch updated');
}

async function deleteBatch(req, res) {
  ok(res, await service.deleteBatch(req.pharmacy, req.params.batchId), 'Batch removed');
}

async function expiryInventory(req, res) {
  ok(res, await service.expiryInventory(req.pharmacy, req.validatedQuery), 'Expiry inventory');
}

async function dispense(req, res) {
  ok(res, await service.dispense(req.pharmacy, req.params.itemId, req.body), 'Stock dispensed (earliest expiry first)');
}

module.exports = { overview, addBatch, listBatches, updateBatch, deleteBatch, expiryInventory, dispense };
