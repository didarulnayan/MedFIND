/** Low-stock & expiry alerts (integration with the scheduled stock job). */
const { CatalogItem, InventoryBatch, Alert, Pharmacy } = require('../models');
const ApiError = require('../utils/ApiError');
const { addDays } = require('../utils/helpers');
const { notify } = require('./notification.service');

async function upsertAlert(filter, message, pharmacyOwner) {
  const res = await Alert.updateOne(
    { ...filter, resolved: false },
    { $setOnInsert: { message } },
    { upsert: true }
  );
  if (res.upsertedCount && pharmacyOwner) {
    notify(pharmacyOwner, { type: 'stock_alert', title: `${filter.type} alert`, message }, { email: true });
  }
  return res.upsertedCount;
}

async function generateAlerts() {
  const now = new Date();
  let created = 0;
  const owners = new Map((await Pharmacy.find({}, 'owner')).map((p) => [String(p._id), p.owner]));

  const items = await CatalogItem.find({ isActive: true }).populate('medicine', 'brandName strength');
  for (const item of items) {
    const label = `${item.medicine.brandName} ${item.medicine.strength}`;
    if (item.stockQuantity <= item.minStockLevel) {
      created += await upsertAlert(
        { pharmacy: item.pharmacy, catalogItem: item._id, batch: null, type: 'LowStock' },
        `${label} is low on stock (${item.stockQuantity} left, minimum ${item.minStockLevel})`,
        owners.get(String(item.pharmacy))
      );
    }
  }

  const batches = await InventoryBatch.find({ quantity: { $gt: 0 }, expiryDate: { $ne: null, $lte: addDays(now, 30) } })
    .populate({ path: 'catalogItem', populate: { path: 'medicine', select: 'brandName strength' } });
  for (const b of batches) {
    if (!b.catalogItem || !b.catalogItem.isActive) continue;
    const label = `${b.catalogItem.medicine.brandName} ${b.catalogItem.medicine.strength} batch ${b.batchNumber}`;
    const expired = b.expiryDate <= now;
    created += await upsertAlert(
      { pharmacy: b.pharmacy, catalogItem: b.catalogItem._id, batch: b._id, type: expired ? 'Expired' : 'NearExpiry' },
      expired ? `${label} has expired (${b.quantity} units)` : `${label} expires on ${b.expiryDate.toISOString().slice(0, 10)}`,
      owners.get(String(b.pharmacy))
    );
  }
  return { created };
}

async function listAlerts(pharmacy, { resolved = false } = {}) {
  return Alert.find({ pharmacy: pharmacy._id, resolved }).sort({ createdAt: -1 }).limit(100);
}

async function resolveAlert(pharmacy, id) {
  const alert = await Alert.findOne({ _id: id, pharmacy: pharmacy._id });
  if (!alert) throw ApiError.notFound('Alert not found');
  if (alert.resolved) throw ApiError.conflict('Alert already resolved');
  alert.resolved = true;
  alert.resolvedAt = new Date();
  await alert.save();
  return alert;
}

module.exports = { generateAlerts, listAlerts, resolveAlert };
