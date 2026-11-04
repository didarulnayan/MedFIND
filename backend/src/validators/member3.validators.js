/** Member 3: Medicine Search & Filter + Nearby Pharmacies & Sorting */
const { z, objectId, pagination, csvList, boolFlag } = require('./common');
const { DOSAGE_FORMS } = require('../models/MasterMedicine');

// ----- Feature 1 -----
const suggestionsQuery = z.object({
  q: z.string().trim().min(2, 'q must have at least 2 characters').max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const searchQuery = z
  .object({
    q: z.string().trim().max(100).optional(),
    dosageForm: csvList.refine((arr) => !arr || arr.every((f) => DOSAGE_FORMS.includes(f)), { message: `dosageForm must be among: ${DOSAGE_FORMS.join(', ')}` }),
    strength: csvList,
    manufacturer: csvList,
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: boolFlag,
    sort: z.enum(['relevance', 'name', 'price_asc', 'price_desc', 'pharmacies']).default('relevance'),
    ...pagination,
  })
  .refine((d) => d.minPrice === undefined || d.maxPrice === undefined || d.minPrice <= d.maxPrice, { message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'] });

const filtersQuery = z.object({ q: z.string().trim().max(100).optional() });
const popularQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).default(6) });

// ----- Feature 2 -----
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

const areasQuery = z.object({ city: z.string().trim().max(50).optional() });
const resolveQuery = z.object({ lat, lng });

const nearbyQuery = z
  .object({
    medicineId: objectId('medicineId').optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    areaId: objectId('areaId').optional(),
    radiusKm: z.coerce.number().min(0.5).max(50).default(5),
    sort: z.enum(['distance', 'price', 'rating', 'updated']).default('distance'),
    openNow: boolFlag,
    ...pagination,
  })
  .refine((d) => d.areaId || (d.lat !== undefined && d.lng !== undefined), { message: 'Provide lat and lng, or areaId', path: ['lat'] });

const pharmacySummaryQuery = z.object({ lat: lat.optional(), lng: lng.optional(), medicineId: objectId('medicineId').optional() });

module.exports = { suggestionsQuery, searchQuery, filtersQuery, popularQuery, areasQuery, resolveQuery, nearbyQuery, pharmacySummaryQuery };
