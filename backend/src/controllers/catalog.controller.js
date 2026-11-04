/** Member 1 - Feature 1: Medicine Catalog Management */
const service = require('../services/catalog.service');
const { ok, created, getPagination } = require('../utils/helpers');

async function searchMasterList(req, res) {
  const q = req.validatedQuery;
  const data = await service.searchMasterList(req.pharmacy, { search: q.search, ...getPagination(q, { limit: 10 }) });
  ok(res, data, 'Master medicine list');
}

async function listCatalog(req, res) {
  const q = req.validatedQuery;
  const data = await service.listCatalog(req.pharmacy, { search: q.search, status: q.status, ...getPagination(q, { limit: 10 }) });
  ok(res, data, 'Medicine catalog');
}

async function getCatalogItem(req, res) {
  ok(res, await service.getCatalogItem(req.pharmacy, req.params.itemId), 'Catalog medicine');
}

async function addToCatalog(req, res) {
  created(res, await service.addToCatalog(req.pharmacy, req.user, req.body), 'Medicine added to catalog');
}

async function updateCatalogItem(req, res) {
  ok(res, await service.updateCatalogItem(req.pharmacy, req.user, req.params.itemId, req.body), 'Catalog medicine updated');
}

async function removeCatalogItem(req, res) {
  ok(res, await service.removeCatalogItem(req.pharmacy, req.params.itemId), 'Medicine removed from catalog');
}

async function priceHistory(req, res) {
  ok(res, await service.priceHistory(req.pharmacy, req.params.itemId), 'Price history');
}

module.exports = { searchMasterList, listCatalog, getCatalogItem, addToCatalog, updateCatalogItem, removeCatalogItem, priceHistory };
