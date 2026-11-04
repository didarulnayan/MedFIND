/** Member 1 - Feature 2: Stock & Expiry Tracking */
const { CatalogItem, InventoryBatch, MasterMedicine } = require('../models');
const ApiError = require('../utils/ApiError');
const { addDays, daysUntil, timeLeftLabel, escapeRegex, startOfLocalDay } = require('../utils/helpers');
const { withTransaction } = require('./transaction');
const inventory = require('./inventory.service');

const EXPIRING_SOON_DAYS = 60;

function batchStatus(batch, now = new Date()) {
  if (batch.quantity <= 0) return 'Depleted';
  if (!batch.expiryDate) return 'No expiry';
  const days = daysUntil(batch.expiryDate, now);
  if (days <= 0) return 'Expired';
  if (days <= EXPIRING_SOON_DAYS) return 'Expiring soon';
  return 'Good';
}

function formatBatch(batch, now = new Date()) {
  return {
    id: batch._id,
    batchNumber: batch.batchNumber,
    quantity: batch.quantity,
    initialQuantity: batch.initialQuantity,
    manufacturingDate: batch.manufacturingDate,
    expiryDate: batch.expiryDate,
    purchasePrice: batch.purchasePrice,
    source: batch.source,
    timeLeft: timeLeftLabel(batch.expiryDate, now),
    daysLeft: batch.expiryDate ? daysUntil(batch.expiryDate, now) : null,
    status: batchStatus(batch, now),
  };
}

function medicineLabel(m) {
  return { id: m._id, brandName: m.brandName, genericName: m.genericName, strength: m.strength, dosageForm: m.dosageForm };
}

async function findOwnedItem(pharmacy, itemId) {
  const item = await CatalogItem.findOne({ _id: itemId, pharmacy: pharmacy._id, isActive: true }).populate('medicine');
  if (!item) throw ApiError.notFound('Catalog medicine not found in your pharmacy');
  return item;
}

async function findOwnedBatch(pharmacy, batchId) {
  const batch = await InventoryBatch.findOne({ _id: batchId, pharmacy: pharmacy._id });
  if (!batch) throw ApiError.notFound('Batch not found in your pharmacy');
  return batch;
}

/** Stock overview page: summary cards + one row per catalog medicine. */
async function overview(pharmacy, { search } = {}) {
  const now = new Date();
  const itemFilter = { pharmacy: pharmacy._id, isActive: true };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const ids = await MasterMedicine.find({ $or: [{ brandName: rx }, { genericName: rx }] }, '_id');
    itemFilter.medicine = { $in: ids.map((d) => d._id) };
  }
  const items = await CatalogItem.find(itemFilter).populate('medicine').sort({ lastUpdatedAt: -1 });
  const batches = await InventoryBatch.find({ catalogItem: { $in: items.map((i) => i._id) }, quantity: { $gt: 0 } });

  const byItem = new Map();
  for (const b of batches) {
    const key = String(b.catalogItem);
    if (!byItem.has(key)) byItem.set(key, []);
    byItem.get(key).push(b);
  }

  const in30 = addDays(now, 30);
  const summary = { medicinesTracked: items.length, availableUnits: 0, expiringIn30Days: 0, expiredBatches: 0 };
  const rows = items.map((item) => {
    const list = byItem.get(String(item._id)) || [];
    const live = list.filter((b) => !b.expiryDate || b.expiryDate > now);
    const expired = list.filter((b) => b.expiryDate && b.expiryDate <= now);
    const available = live.reduce((s, b) => s + b.quantity, 0);
    const dated = live.filter((b) => b.expiryDate).sort(inventory.fefoSort);

    summary.availableUnits += available;
    summary.expiringIn30Days += dated.filter((b) => b.expiryDate <= in30).length;
    summary.expiredBatches += expired.length;

    let status = item.stockStatus;
    if (available === 0 && expired.length > 0) status = 'Expired';
    return {
      catalogItemId: item._id,
      medicine: medicineLabel(item.medicine),
      availableStock: available,
      batches: list.length,
      expiredBatches: expired.length,
      earliestExpiry: dated[0] ? dated[0].expiryDate : null,
      minStockLevel: item.minStockLevel,
      status,
    };
  });

  return { summary, items: rows };
}

async function addBatch(pharmacy, { catalogItemId, batchNumber, quantity, manufacturingDate, expiryDate, purchasePrice }) {
  const item = await findOwnedItem(pharmacy, catalogItemId);
  if (expiryDate <= startOfLocalDay()) throw ApiError.badRequest('Expiry date must be in the future; expired stock cannot be added');
  if (manufacturingDate && manufacturingDate >= expiryDate) throw ApiError.badRequest('Manufacturing date must be before the expiry date');
  if (manufacturingDate && manufacturingDate > new Date()) throw ApiError.badRequest('Manufacturing date cannot be in the future');

  const duplicate = await InventoryBatch.exists({ catalogItem: item._id, batchNumber: batchNumber.toUpperCase() });
  if (duplicate) throw ApiError.conflict(`Batch ${batchNumber.toUpperCase()} already exists for this medicine`);

  const result = await withTransaction(async (session) => {
    const [batch] = await InventoryBatch.create(
      [{ pharmacy: pharmacy._id, catalogItem: item._id, batchNumber, quantity, initialQuantity: quantity, manufacturingDate, expiryDate, purchasePrice, source: 'delivery' }],
      { session }
    );
    const availableStock = await inventory.recalculateStock(item._id, { session });
    return { batch, availableStock };
  });

  return {
    medicine: medicineLabel(item.medicine),
    batch: formatBatch(result.batch),
    availableStock: result.availableStock,
  };
}

/** All batches of one medicine, in the order they will be used (FEFO). */
async function listBatches(pharmacy, itemId, { includeDepleted = false } = {}) {
  const now = new Date();
  const item = await findOwnedItem(pharmacy, itemId);
  const filter = { catalogItem: item._id, ...(includeDepleted ? {} : { quantity: { $gt: 0 } }) };
  const batches = (await InventoryBatch.find(filter)).sort(inventory.fefoSort);

  const live = batches.filter((b) => b.quantity > 0 && (!b.expiryDate || b.expiryDate > now));
  const expired = batches.filter((b) => b.quantity > 0 && b.expiryDate && b.expiryDate <= now);
  const next = live[0];

  return {
    medicine: medicineLabel(item.medicine),
    availableStock: live.reduce((s, b) => s + b.quantity, 0),
    expiredUnits: expired.reduce((s, b) => s + b.quantity, 0),
    nextBatchToUse: next ? { id: next._id, batchNumber: next.batchNumber, expiryDate: next.expiryDate } : null,
    batches: batches.map((b) => formatBatch(b, now)),
  };
}

async function updateBatch(pharmacy, batchId, changes) {
  const batch = await findOwnedBatch(pharmacy, batchId);
  if (batch.source === 'adjustment' && (changes.expiryDate || changes.batchNumber)) {
    throw ApiError.badRequest('The stock adjustment batch only supports quantity changes');
  }

  const nextMfg = changes.manufacturingDate ?? batch.manufacturingDate;
  const nextExp = changes.expiryDate ?? batch.expiryDate;
  if (nextMfg && nextExp && nextMfg >= nextExp) throw ApiError.badRequest('Manufacturing date must be before the expiry date');

  if (changes.batchNumber && changes.batchNumber.toUpperCase() !== batch.batchNumber) {
    const dup = await InventoryBatch.exists({ catalogItem: batch.catalogItem, batchNumber: changes.batchNumber.toUpperCase() });
    if (dup) throw ApiError.conflict(`Batch ${changes.batchNumber.toUpperCase()} already exists for this medicine`);
  }

  if (changes.quantity !== undefined) {
    // keep initialQuantity >= quantity so "received" never looks smaller than "remaining"
    batch.initialQuantity = Math.max(batch.initialQuantity, changes.quantity);
  }
  batch.set(changes);

  const availableStock = await withTransaction(async (session) => {
    await batch.save({ session });
    return inventory.recalculateStock(batch.catalogItem, { session });
  });
  return { batch: formatBatch(batch), availableStock };
}

async function deleteBatch(pharmacy, batchId) {
  const batch = await findOwnedBatch(pharmacy, batchId);
  const availableStock = await withTransaction(async (session) => {
    await InventoryBatch.deleteOne({ _id: batch._id }, { session });
    return inventory.recalculateStock(batch.catalogItem, { session });
  });
  return { deletedBatch: batch.batchNumber, availableStock };
}

/** Expiry inventory: batches expiring within 30/60/90 days, or already expired. */
async function expiryInventory(pharmacy, { window }) {
  const now = new Date();
  const base = { pharmacy: pharmacy._id, quantity: { $gt: 0 }, expiryDate: { $ne: null } };
  const within = (days) => ({ ...base, expiryDate: { $gt: now, $lte: addDays(now, days) } });
  const expiredFilter = { ...base, expiryDate: { $ne: null, $lte: now } };

  const [c30, c60, c90, cExpired] = await Promise.all([
    InventoryBatch.countDocuments(within(30)),
    InventoryBatch.countDocuments(within(60)),
    InventoryBatch.countDocuments(within(90)),
    InventoryBatch.countDocuments(expiredFilter),
  ]);

  const filter = window === 'expired' ? expiredFilter : within(Number(window));
  const batches = await InventoryBatch.find(filter)
    .populate({ path: 'catalogItem', populate: { path: 'medicine' } })
    .sort({ expiryDate: 1 });

  return {
    window: window === 'expired' ? 'expired' : `${window} days`,
    counts: { within30Days: c30, within60Days: c60, within90Days: c90, expired: cExpired },
    batches: batches
      .filter((b) => b.catalogItem && b.catalogItem.isActive)
      .map((b) => ({
        catalogItemId: b.catalogItem._id,
        medicine: medicineLabel(b.catalogItem.medicine),
        ...formatBatch(b, now),
        warning: batchStatus(b, now) === 'Expired' ? 'Expired - remove from shelf' : `Expires in ${timeLeftLabel(b.expiryDate, now)}`,
      })),
  };
}

/** Counter sale / dispense: removes stock using earliest-expiring batch first. */
async function dispense(pharmacy, itemId, { quantity, note }) {
  const item = await findOwnedItem(pharmacy, itemId);
  const consumed = await withTransaction((session) => inventory.consumeFEFO(item._id, quantity, session));
  const fresh = await CatalogItem.findById(item._id);
  return { medicine: medicineLabel(item.medicine), dispensed: quantity, note, consumedBatches: consumed, availableStock: fresh.stockQuantity };
}

module.exports = { overview, addBatch, listBatches, updateBatch, deleteBatch, expiryInventory, dispense, formatBatch, batchStatus };
