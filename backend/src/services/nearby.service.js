/** Member 3 - Feature 2: Nearby Pharmacies & Sorting (MongoDB 2dsphere + $geoNear) */
const mongoose = require('mongoose');
const { Pharmacy, Area, MasterMedicine, CatalogItem } = require('../models');
const ApiError = require('../utils/ApiError');
const { isOpenAt, pageMeta } = require('../utils/helpers');

const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

async function listAreas(city) {
  const filter = city ? { city: new RegExp(`^${city}$`, 'i') } : {};
  const areas = await Area.find(filter).sort({ city: 1, name: 1 });
  const cities = {};
  for (const a of areas) {
    (cities[a.city] = cities[a.city] || []).push({ id: a._id, name: a.name, lat: a.location.coordinates[1], lng: a.location.coordinates[0] });
  }
  return { cities: Object.entries(cities).map(([name, list]) => ({ name, areas: list })), radiusOptionsKm: RADIUS_OPTIONS };
}

/** "Use my location": turns GPS coordinates into the nearest known area name. */
async function resolveLocation(lat, lng) {
  const area = await Area.findOne({
    location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 15000 } },
  });
  return {
    lat, lng,
    area: area ? { id: area._id, name: area.name, city: area.city, label: `${area.name}, ${area.city}` } : null,
    label: area ? `${area.name}, ${area.city}` : `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    privacy: 'Your exact location is only used to calculate distance and is not shared with pharmacies.',
  };
}

async function originFrom({ lat, lng, areaId }) {
  if (areaId) {
    const area = await Area.findById(areaId);
    if (!area) throw ApiError.notFound('Area not found');
    return { coordinates: area.location.coordinates, label: `${area.name}, ${area.city}` };
  }
  if (lat === undefined || lng === undefined) throw ApiError.badRequest('Provide either lat & lng (Use my location) or areaId (Select an area)');
  return { coordinates: [lng, lat], label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

function pharmacyCard(p, distanceMeters) {
  return {
    id: p._id,
    name: p.name,
    address: `${p.address.line}, ${p.address.area}, ${p.address.city}`,
    area: p.address.area,
    verified: p.verification.status === 'Verified',
    openNow: isOpenAt(p.openingHours),
    openingHours: p.openingHoursText,
    rating: p.ratingAverage,
    ratingCount: p.ratingCount,
    distanceKm: Number((distanceMeters / 1000).toFixed(2)),
    location: { lat: p.location.coordinates[1], lng: p.location.coordinates[0] },
  };
}

/**
 * Verified pharmacies within radiusKm of the user that stock the searched medicine.
 * sort: distance | price | rating | updated ; openNow=true keeps only pharmacies open at this moment.
 */
async function nearbyPharmacies({ medicineId, lat, lng, areaId, radiusKm = 5, sort = 'distance', openNow = false, page, limit, skip }) {
  const origin = await originFrom({ lat, lng, areaId });
  let medicine = null;
  if (medicineId) {
    medicine = await MasterMedicine.findOne({ _id: medicineId, isActive: true });
    if (!medicine) throw ApiError.notFound('Medicine not found');
  }

  const pipeline = [
    {
      $geoNear: {
        near: { type: 'Point', coordinates: origin.coordinates },
        distanceField: 'distance',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: Pharmacy.publicFilter(),
      },
    },
  ];
  if (medicine) {
    pipeline.push(
      {
        $lookup: {
          from: CatalogItem.collection.name,
          let: { pid: '$_id' },
          pipeline: [{
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$pharmacy', '$$pid'] },
                  { $eq: ['$medicine', new mongoose.Types.ObjectId(String(medicine._id))] },
                  { $eq: ['$isActive', true] },
                  { $gt: ['$stockQuantity', 0] },
                ],
              },
            },
          }],
          as: 'listing',
        },
      },
      { $unwind: '$listing' }
    );
  }

  const rows = await Pharmacy.aggregate(pipeline);
  let cards = rows.map((row) => {
    const p = Pharmacy.hydrate(row);
    const card = pharmacyCard(p, row.distance);
    if (row.listing) {
      const l = row.listing;
      card.listing = {
        catalogItemId: l._id,
        price: l.price,
        stock: l.stockQuantity,
        stockStatus: l.stockQuantity <= l.minStockLevel ? 'Low stock' : 'In stock',
        lastUpdatedAt: l.lastUpdatedAt,
      };
    }
    return card;
  });

  if (openNow) cards = cards.filter((c) => c.openNow);

  const sorters = {
    distance: (a, b) => a.distanceKm - b.distanceKm,
    price: (a, b) => (a.listing ? a.listing.price : Infinity) - (b.listing ? b.listing.price : Infinity) || a.distanceKm - b.distanceKm,
    rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
    updated: (a, b) => (b.listing ? +new Date(b.listing.lastUpdatedAt) : 0) - (a.listing ? +new Date(a.listing.lastUpdatedAt) : 0),
  };
  cards.sort(sorters[sort]);

  const total = cards.length;
  const medicineLabel = medicine ? `${medicine.brandName} ${medicine.strength}` : null;
  const result = {
    location: { label: origin.label, lat: origin.coordinates[1], lng: origin.coordinates[0] },
    medicine: medicine ? { id: medicine._id, label: medicineLabel, genericName: medicine.genericName } : null,
    radiusKm,
    sort,
    openNow,
    total,
    summary: medicine
      ? `${total} pharmac${total === 1 ? 'y' : 'ies'} within ${radiusKm} km that stock ${medicineLabel}`
      : `${total} pharmac${total === 1 ? 'y' : 'ies'} within ${radiusKm} km`,
    pharmacies: cards.slice(skip, skip + limit),
    pagination: pageMeta(page, limit, total),
  };

  if (total === 0) {
    result.emptyState = {
      message: medicine ? `No pharmacies within ${radiusKm} km stock ${medicineLabel}` : `No pharmacies within ${radiusKm} km`,
      suggestions: {
        largerRadiusKm: RADIUS_OPTIONS.filter((r) => r > radiusKm),
        turnOffOpenNow: openNow,
      },
    };
  }
  return result;
}

/** Map marker / "Details": one pharmacy's summary with distance and its stock of the searched medicine. */
async function pharmacySummary(pharmacyId, { lat, lng, medicineId }) {
  const p = await Pharmacy.findOne({ _id: pharmacyId, ...Pharmacy.publicFilter() });
  if (!p) throw ApiError.notFound('Pharmacy not found or not verified');
  let distanceMeters = null;
  if (lat !== undefined && lng !== undefined) {
    const [row] = await Pharmacy.aggregate([
      { $geoNear: { near: { type: 'Point', coordinates: [lng, lat] }, distanceField: 'distance', spherical: true, query: { _id: p._id } } },
    ]);
    distanceMeters = row ? row.distance : null;
  }
  const card = pharmacyCard(p, distanceMeters ?? 0);
  if (distanceMeters === null) card.distanceKm = null;
  card.phone = p.phone;
  card.directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.location.coordinates[1]},${p.location.coordinates[0]}`;
  if (medicineId) {
    const item = await CatalogItem.findOne({ pharmacy: p._id, medicine: medicineId, isActive: true }).populate('medicine');
    card.listing = item
      ? { medicine: `${item.medicine.brandName} ${item.medicine.strength}`, price: item.price, stock: item.stockQuantity, stockStatus: item.stockStatus, lastUpdatedAt: item.lastUpdatedAt }
      : null;
  }
  return card;
}

module.exports = { listAreas, resolveLocation, nearbyPharmacies, pharmacySummary, RADIUS_OPTIONS };
