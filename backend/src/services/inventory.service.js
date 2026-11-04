/**
 * Shared stock engine (owned by Member 1, used by catalog, stock and reservation features).
 *
 * Rules (from the requirements and the Stock & Expiry Figma screens):
 *  1. Available stock counts only NON-EXPIRED batches.
 *  2. Stock is consumed earliest-expiring batch first (FEFO). Undated "adjustment" batches are used last.
 *  3. CatalogItem.stockQuantity is a cached copy of rule 1, refreshed after every change and nightly.
 */
const { CatalogItem, InventoryBatch, Reservation } = require('../models');
const ApiError = require('../utils/ApiError');

const ADJUSTMENT_BATCH = 'ADJ-STOCK';

function nonExpiredFilter(now = new Date()) {
  return { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] };
}

/** Earliest expiry first; undated batches last (oldest first). */
function fefoSort(a, b) {
  if (a.expiryDate && b.expiryDate) return a.expiryDate - b.expiryDate;
  if (a.expiryDate) return -1;
  if (b.expiryDate) return 1;
  return a.createdAt - b.createdAt;
}

async function availableBatches(catalogItemId, session) {
  const batches = await InventoryBatch.find({ catalogItem: catalogItemId, quantity: { $gt: 0 }, ...nonExpiredFilter() })
    .session(session || null);
  return batches.sort(fefoSort);
}

/** Recomputes CatalogItem.stockQuantity from non-expired batches. touch=true also updates "last updated". */
async function recalculateStock(catalogItemId, { session, touch = true } = {}) {
  const batches = await availableBatches(catalogItemId, session);
  const available = batches.reduce((sum, b) => sum + b.quantity, 0);
  const update = { stockQuantity: available, ...(touch ? { lastUpdatedAt: new Date() } : {}) };
  await CatalogItem.updateOne({ _id: catalogItemId }, update, { session });
  return available;
}

/**
 * Removes `quantity` units using FEFO. Returns [{ batch, batchNumber, quantity }].
 * Throws 409 when non-expired stock is insufficient.
 */
async function consumeFEFO(catalogItemId, quantity, session) {
  const batches = await availableBatches(catalogItemId, session);
  const available = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (available < quantity) {
    throw ApiError.conflict(`Insufficient non-expired stock: requested ${quantity}, available ${available}`);
  }

  const consumed = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining === 0) break;
    const take = Math.min(batch.quantity, remaining);
    // conditional update guards against concurrent consumption of the same batch
    const res = await InventoryBatch.updateOne(
      { _id: batch._id, quantity: { $gte: take } },
      { $inc: { quantity: -take } },
      { session }
    );
    if (res.modifiedCount !== 1) throw ApiError.conflict('Stock changed while processing, please retry');
    consumed.push({ batch: batch._id, batchNumber: batch.batchNumber, quantity: take });
    remaining -= take;
  }
  await recalculateStock(catalogItemId, { session });
  return consumed;
}

/** Adds units to the item's undated adjustment batch (used by quick stock edits in the catalog). */
async function addAdjustmentStock(item, quantity, session) {
  await InventoryBatch.updateOne(
    { catalogItem: item._id, batchNumber: ADJUSTMENT_BATCH },
    {
      $inc: { quantity, initialQuantity: quantity },
      $setOnInsert: { pharmacy: item.pharmacy, source: 'adjustment', expiryDate: null },
    },
    { upsert: true, session }
  );
}

/**
 * Sets the item's available stock to `target` (catalog "Stock quantity" field).
 * Increase -> adjustment batch; decrease -> FEFO consumption.
 */
async function setStockLevel(item, target, session) {
  const current = await recalculateStock(item._id, { session, touch: false });
  const diff = target - current;
  if (diff > 0) await addAdjustmentStock(item, diff, session);
  if (diff < 0) await consumeFEFO(item._id, -diff, session);
  return recalculateStock(item._id, { session });
}

/** Units already promised to Confirmed / Ready-for-pickup reservations. */
async function heldQuantity(catalogItemId, { excludeReservationId, session } = {}) {
  const match = { catalogItem: catalogItemId, status: { $in: Reservation.HOLDING_STATUSES } };
  if (excludeReservationId) match._id = { $ne: excludeReservationId };
  const [row] = await Reservation.aggregate([{ $match: match }, { $group: { _id: null, qty: { $sum: '$quantity' } } }]).session(session || null);
  return row ? row.qty : 0;
}

/** Stock that can still be promised to a new reservation. */
async function reservableQuantity(item, options = {}) {
  const held = await heldQuantity(item._id, options);
  return Math.max(item.stockQuantity - held, 0);
}

/** Nightly refresh so batches that expired overnight stop counting as stock. */
async function refreshAllStock() {
  const items = await CatalogItem.find({}, '_id');
  for (const item of items) await recalculateStock(item._id, { touch: false });
  return items.length;
}

module.exports = {
  ADJUSTMENT_BATCH, nonExpiredFilter, fefoSort, availableBatches, recalculateStock, consumeFEFO,
  addAdjustmentStock, setStockLevel, heldQuantity, reservableQuantity, refreshAllStock,
};
