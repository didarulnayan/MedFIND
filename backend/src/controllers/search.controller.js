/** Member 3 - Feature 1: Medicine Search & Filter */
const service = require('../services/search.service');
const { ok, getPagination } = require('../utils/helpers');

async function suggestions(req, res) {
  const { q, limit } = req.validatedQuery;
  ok(res, await service.suggestions(q, limit), 'Suggestions');
}

async function searchMedicines(req, res) {
  const q = req.validatedQuery;
  ok(res, await service.searchMedicines({ ...q, ...getPagination(q, { limit: 10 }) }), 'Search results');
}

async function filterOptions(req, res) {
  ok(res, await service.filterOptions(req.validatedQuery.q), 'Filter options');
}

async function popular(req, res) {
  ok(res, await service.popularSearches(req.validatedQuery.limit), 'Popular searches');
}

module.exports = { suggestions, searchMedicines, filterOptions, popular };
