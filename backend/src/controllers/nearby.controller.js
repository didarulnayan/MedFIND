/** Member 3 - Feature 2: Nearby Pharmacies & Sorting */
const service = require('../services/nearby.service');
const { ok, getPagination } = require('../utils/helpers');

async function areas(req, res) {
  ok(res, await service.listAreas(req.validatedQuery.city), 'Areas');
}

async function resolve(req, res) {
  const { lat, lng } = req.validatedQuery;
  ok(res, await service.resolveLocation(lat, lng), 'Location resolved');
}

async function nearby(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.nearbyPharmacies({ ...q, ...getPagination(q, { limit: 10 }) }), 'Nearby pharmacies');
}

async function pharmacySummary(req, res) {
  ok(res, await service.pharmacySummary(req.params.pharmacyId, req.validatedQuery), 'Pharmacy summary');
}

module.exports = { areas, resolve, nearby, pharmacySummary };
