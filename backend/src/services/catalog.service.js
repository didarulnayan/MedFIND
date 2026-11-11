/** Member 1 - Feature 1: Medicine Catalog Management */
const { CatalogItem, MasterMedicine, PriceHistory } = require('../models');
const ApiError = require('../utils/ApiError');
const { escapeRegex, pageMeta, medicineName } = require('../utils/helpers');
const { withTransaction } = require('./transaction');
const inventory = require('./inventory.service');

const STATUS_FILTERS = {
  in_stock: { $expr: { $gt: ['$stockQuantity', '$minStockLevel'] } },
  low_stock: { $expr: { $and: [{ $gt: ['$stockQuantity', 0] }, { $lte: ['$stockQuantity', '$minStockLevel'] }] } },
  out_of_stock: { stockQuantity: { $lte: 0 } },
};

async function masterIdsMatching(search) {
  const rx = new RegExp(escapeRegex(search), 'i');
  const docs = await MasterMedicine.find({ $or: [{ brandName: rx }, { genericName: rx }] }, '_id');
  return docs.map((d) => d._id);
}

function formatItem(item) {
  const m = item.medicine;
  return {
    id: item._id,
    medicine: m && {
      id: m._id, brandName: m.brandName, genericName: m.genericName, manufacturer: m.manufacturer,
      strength: m.strength, dosageForm: m.dosageForm, requiresPrescription: m.requiresPrescription,
    },
    price: item.price,
    stockQuantity: item.stockQuantity,
    minStockLevel: item.minStockLevel,
    stockStatus: item.stockStatus,
    lastUpdatedAt: item.lastUpdatedAt,
  };
}

/** Step 1 of "Add medicine": browse the master list, flagging medicines already in this pharmacy's catalog. */
async function searchMasterList(pharmacy, { search, page, limit, skip }) {
  const filter = { isActive: true };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ brandName: rx }, { genericName: rx }, { manufacturer: rx }];
  }
  const [total, docs] = await Promise.all([
    MasterMedicine.countDocuments(filter),
    MasterMedicine.find(filter).sort({ brandName: 1, strength: 1 }).skip(skip).limit(limit),
  ]);
  const inCatalog = await CatalogItem.find(
    { pharmacy: pharmacy._id, isActive: true, medicine: { $in: docs.map((d) => d._id) } }, 'medicine'
  );
  const inCatalogSet = new Set(inCatalog.map((c) => String(c.medicine)));
  return {
    medicines: docs.map((d) => ({
      id: d._id, brandName: d.brandName, genericName: d.genericName, manufacturer: d.manufacturer,
      strength: d.strength, dosageForm: d.dosageForm, requiresPrescription: d.requiresPrescription,
      alreadyInCatalog: inCatalogSet.has(String(d._id)),
    })),
    pagination: pageMeta(page, limit, total),
  };
}

async function listCatalog(pharmacy, { search, status, page, limit, skip }) {
  const base = { pharmacy: pharmacy._id, isActive: true };
  if (search) base.medicine = { $in: await masterIdsMatching(search) };
  const filter = status && status !== 'all' ? { ...base, ...STATUS_FILTERS[status] } : base;

  const [total, items, counts] = await Promise.all([
    CatalogItem.countDocuments(filter),
    CatalogItem.find(filter).populate('medicine').sort({ lastUpdatedAt: -1 }).skip(skip).limit(limit),
    Promise.all([
      CatalogItem.countDocuments(base),
      CatalogItem.countDocuments({ ...base, ...STATUS_FILTERS.in_stock }),
      CatalogItem.countDocuments({ ...base, ...STATUS_FILTERS.low_stock }),
      CatalogItem.countDocuments({ ...base, ...STATUS_FILTERS.out_of_stock }),
    ]),
  ]);

  return {
    counts: { all: counts[0], inStock: counts[1], lowStock: counts[2], outOfStock: counts[3] },
    items: items.map(formatItem),
    pagination: pageMeta(page, limit, total),
  };
}

async function findOwnedItem(pharmacy, itemId, { session } = {}) {
  const item = await CatalogItem.findOne({ _id: itemId, pharmacy: pharmacy._id, isActive: true })
    .populate('medicine').session(session || null);
  if (!item) throw ApiError.notFound('Catalog medicine not found in your pharmacy');
  return item;
}

async function getCatalogItem(pharmacy, itemId) {
  return formatItem(await findOwnedItem(pharmacy, itemId));
}

async function addToCatalog(pharmacy, user, { masterMedicineId, price, stockQuantity, minStockLevel }) {
  const medicine = await MasterMedicine.findOne({ _id: masterMedicineId, isActive: true });
  if (!medicine) throw ApiError.notFound('Medicine not found in the master list');

  const existing = await CatalogItem.findOne({ pharmacy: pharmacy._id, medicine: medicine._id });
  if (existing && existing.isActive) {
    throw ApiError.conflict(`${medicineName(medicine)} is already in your catalog`);
  }

  const itemId = await withTransaction(async (session) => {
    let item;
    if (existing) {
      // re-adding a previously removed medicine reactivates the same catalog entry
      existing.set({ isActive: true, price, minStockLevel, lastUpdatedAt: new Date() });
      item = await existing.save({ session });
    } else {
      [item] = await CatalogItem.create(
        [{ pharmacy: pharmacy._id, medicine: medicine._id, price, minStockLevel, stockQuantity: 0 }],
        { session }
      );
    }
    await inventory.setStockLevel(item, stockQuantity, session);
    await PriceHistory.create(
      [{ catalogItem: item._id, pharmacy: pharmacy._id, oldPrice: null, newPrice: price, changedBy: user._id, source: 'catalog-add' }],
      { session }
    );
    return item._id;
  });

  return getCatalogItem(pharmacy, itemId);
}

async function updateCatalogItem(pharmacy, user, itemId, { price, stockQuantity, minStockLevel }) {
  await withTransaction(async (session) => {
    const item = await findOwnedItem(pharmacy, itemId, { session });
    if (price !== undefined && price !== item.price) {
      await PriceHistory.create(
        [{ catalogItem: item._id, pharmacy: pharmacy._id, oldPrice: item.price, newPrice: price, changedBy: user._id, source: 'catalog-edit' }],
        { session }
      );
      item.price = price;
    }
    if (minStockLevel !== undefined) item.minStockLevel = minStockLevel;
    item.lastUpdatedAt = new Date();
    await item.save({ session });
    if (stockQuantity !== undefined) await inventory.setStockLevel(item, stockQuantity, session);
  });
  return getCatalogItem(pharmacy, itemId);
}

/** Soft delete: customers stop seeing it; existing reservations keep their snapshot and are not affected. */
async function removeCatalogItem(pharmacy, itemId) {
  const item = await findOwnedItem(pharmacy, itemId);
  item.isActive = false;
  item.lastUpdatedAt = new Date();
  await item.save();
  return { id: item._id, medicine: `${medicineName(item.medicine)}`, removed: true };
}

async function priceHistory(pharmacy, itemId) {
  const item = await findOwnedItem(pharmacy, itemId);
  const history = await PriceHistory.find({ catalogItem: item._id }).sort({ changedAt: -1 });
  return { item: formatItem(item), history };
}

module.exports = { searchMasterList, listCatalog, getCatalogItem, addToCatalog, updateCatalogItem, removeCatalogItem, priceHistory, formatItem };
