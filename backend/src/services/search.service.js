/** Member 3 - Feature 1: Medicine Search & Filter */
const { MasterMedicine, Pharmacy, SearchLog, CatalogItem } = require('../models');
const { escapeRegex, pageMeta } = require('../utils/helpers');

const DISCLAIMER = 'Availability and prices are reported by pharmacies. Please confirm with the pharmacy before travelling. MedFind BD does not give medical advice.';

async function publicPharmacyIds() {
  const docs = await Pharmacy.find(Pharmacy.publicFilter(), '_id');
  return docs.map((d) => d._id);
}

function textMatch(q) {
  if (!q) return {};
  const rx = new RegExp(escapeRegex(q.trim()), 'i');
  return { $or: [{ brandName: rx }, { genericName: rx }] };
}

/** Partial-match suggestions while typing: matching generic names (with brand counts) and brand names. */
async function suggestions(q, limit = 8) {
  const rx = new RegExp(escapeRegex(q.trim()), 'i');
  const prefix = new RegExp(`^${escapeRegex(q.trim())}`, 'i');

  const [generics, brands] = await Promise.all([
    MasterMedicine.aggregate([
      { $match: { isActive: true, genericName: rx } },
      { $group: { _id: '$genericName', brands: { $addToSet: '$brandName' } } },
      { $project: { _id: 0, name: '$_id', brandCount: { $size: '$brands' } } },
      { $sort: { brandCount: -1, name: 1 } },
      { $limit: 4 },
    ]),
    MasterMedicine.find({ isActive: true, brandName: rx }).limit(30),
  ]);

  // brands that start with the query come first
  const sortedBrands = brands.sort((a, b) => Number(prefix.test(b.brandName)) - Number(prefix.test(a.brandName)) || a.brandName.localeCompare(b.brandName));
  const items = [
    ...generics.map((g) => ({ type: 'Generic', name: g.name, subtitle: `${g.brandCount} brand${g.brandCount === 1 ? '' : 's'}` })),
    ...sortedBrands.map((m) => ({ type: 'Brand', id: m._id, name: m.brandName, subtitle: `${m.manufacturer} · ${m.dosageForm} ${m.strength}`, genericName: m.genericName })),
  ].slice(0, limit);

  return { query: q, suggestions: items };
}

/**
 * Search results with filters. Each result shows the per-unit price range and how many verified pharmacies list it.
 * Filters: dosageForm, strength, manufacturer (comma separated = OR), minPrice/maxPrice (pharmacy price), inStock.
 */
async function searchMedicines({ q, dosageForm, strength, manufacturer, minPrice, maxPrice, inStock, sort, page, limit, skip }) {
  const pharmacyIds = await publicPharmacyIds();
  const match = { isActive: true, ...textMatch(q) };
  if (dosageForm && dosageForm.length) match.dosageForm = { $in: dosageForm };
  if (strength && strength.length) match.strength = { $in: strength };
  if (manufacturer && manufacturer.length) match.manufacturer = { $in: manufacturer };

  const listingMatch = [{ $eq: ['$medicine', '$$mid'] }, { $eq: ['$isActive', true] }, { $in: ['$pharmacy', pharmacyIds] }];
  if (minPrice !== undefined) listingMatch.push({ $gte: ['$price', minPrice] });
  if (maxPrice !== undefined) listingMatch.push({ $lte: ['$price', maxPrice] });
  if (inStock) listingMatch.push({ $gt: ['$stockQuantity', 0] });
  const needsListing = inStock || minPrice !== undefined || maxPrice !== undefined;

  const sortStage = {
    relevance: { startsWithQuery: -1, pharmacyCount: -1, brandName: 1 },
    name: { brandName: 1, strength: 1 },
    price_asc: { hasListing: -1, minPrice: 1, brandName: 1 },
    price_desc: { maxPrice: -1, brandName: 1 },
    pharmacies: { pharmacyCount: -1, brandName: 1 },
  }[sort || 'relevance'];

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: CatalogItem.collection.name,
        let: { mid: '$_id' },
        pipeline: [{ $match: { $expr: { $and: listingMatch } } }, { $project: { price: 1, stockQuantity: 1 } }],
        as: 'listings',
      },
    },
    ...(needsListing ? [{ $match: { 'listings.0': { $exists: true } } }] : []),
    {
      $addFields: {
        pharmacyCount: { $size: '$listings' },
        inStockPharmacyCount: { $size: { $filter: { input: '$listings', cond: { $gt: ['$$this.stockQuantity', 0] } } } },
        minPrice: { $min: '$listings.price' },
        maxPrice: { $max: '$listings.price' },
        hasListing: { $gt: [{ $size: '$listings' }, 0] },
        startsWithQuery: q ? { $regexMatch: { input: '$brandName', regex: `^${escapeRegex(q.trim())}`, options: 'i' } } : true,
      },
    },
    { $sort: sortStage },
    {
      $facet: {
        total: [{ $count: 'n' }],
        results: [
          { $skip: skip },
          { $limit: limit },
          { $project: { listings: 0, startsWithQuery: 0, hasListing: 0, __v: 0, createdAt: 0, updatedAt: 0, isActive: 0 } },
        ],
      },
    },
  ];

  const [out] = await MasterMedicine.aggregate(pipeline);
  const total = out.total[0] ? out.total[0].n : 0;

  if (q && page === 1) await logSearch(q);

  return {
    query: q || '',
    appliedFilters: { dosageForm, strength, manufacturer, minPrice, maxPrice, inStock: Boolean(inStock) },
    total,
    results: out.results.map((m) => ({
      id: m._id,
      brandName: m.brandName,
      genericName: m.genericName,
      manufacturer: m.manufacturer,
      dosageForm: m.dosageForm,
      strength: m.strength,
      unit: m.unit,
      requiresPrescription: m.requiresPrescription,
      priceRange: m.pharmacyCount ? { min: m.minPrice, max: m.maxPrice } : null,
      pharmacyCount: m.pharmacyCount,
      inStockPharmacyCount: m.inStockPharmacyCount,
    })),
    pagination: pageMeta(page, limit, total),
    message: total === 0 ? `No medicines found for "${q || ''}". Check the spelling or try a generic name. You can also clear some filters.` : undefined,
    disclaimer: DISCLAIMER,
  };
}

/** Filter options with counts for the current query (left sidebar of the results page). */
async function filterOptions(q) {
  const pharmacyIds = await publicPharmacyIds();
  const match = { isActive: true, ...textMatch(q) };
  const [facets] = await MasterMedicine.aggregate([
    { $match: match },
    {
      $facet: {
        dosageForms: [{ $group: { _id: '$dosageForm', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        strengths: [{ $group: { _id: '$strength', count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
        manufacturers: [{ $group: { _id: '$manufacturer', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        ids: [{ $project: { _id: 1 } }],
      },
    },
  ]);
  const ids = facets.ids.map((d) => d._id);
  const [price] = await CatalogItem.aggregate([
    { $match: { medicine: { $in: ids }, isActive: true, pharmacy: { $in: pharmacyIds } } },
    { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
  ]);
  const toList = (arr) => arr.map((f) => ({ value: f._id, count: f.count }));
  return {
    query: q || '',
    dosageForms: toList(facets.dosageForms),
    strengths: toList(facets.strengths),
    manufacturers: toList(facets.manufacturers),
    priceRange: price ? { min: price.min, max: price.max } : null,
  };
}

async function logSearch(q) {
  const term = q.trim().toLowerCase();
  if (term.length < 2) return;
  await SearchLog.updateOne(
    { term },
    { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() }, $setOnInsert: { displayTerm: q.trim() } },
    { upsert: true }
  );
}

/** Popular searches; falls back to the most widely listed medicines when nobody has searched yet. */
async function popularSearches(limit = 6) {
  const logs = await SearchLog.find().sort({ count: -1, lastSearchedAt: -1 }).limit(limit);
  if (logs.length >= limit) return { source: 'search-log', popular: logs.map((l) => ({ term: l.displayTerm, searches: l.count })) };

  const pharmacyIds = await publicPharmacyIds();
  const top = await CatalogItem.aggregate([
    { $match: { isActive: true, pharmacy: { $in: pharmacyIds } } },
    { $group: { _id: '$medicine', listings: { $sum: 1 } } },
    { $sort: { listings: -1 } },
    { $limit: limit * 2 },
    { $lookup: { from: MasterMedicine.collection.name, localField: '_id', foreignField: '_id', as: 'm' } },
    { $unwind: '$m' },
  ]);
  const seen = new Set(logs.map((l) => l.term));
  const popular = logs.map((l) => ({ term: l.displayTerm, searches: l.count }));
  for (const t of top) {
    if (popular.length >= limit) break;
    if (seen.has(t.m.brandName.toLowerCase())) continue;
    seen.add(t.m.brandName.toLowerCase());
    popular.push({ term: t.m.brandName, listings: t.listings });
  }
  return { source: logs.length ? 'search-log+listings' : 'listings', popular };
}

module.exports = { suggestions, searchMedicines, filterOptions, popularSearches };
