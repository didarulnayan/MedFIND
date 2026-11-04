/** Member 1: Medicine Catalog Management + Stock & Expiry Tracking */
const { z, objectId, pagination, dateString, boolFlag } = require('./common');

const price = z.coerce.number({ error: 'price must be a number' }).positive('price must be greater than 0').max(100000);
const qty = (label) => z.coerce.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`).min(0, `${label} cannot be negative`).max(1000000);

// ----- Feature 1: catalog -----
const masterListQuery = z.object({ search: z.string().trim().max(100).optional(), ...pagination });

const catalogListQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional(),
  ...pagination,
});

const addCatalogItem = z.object({
  masterMedicineId: objectId('masterMedicineId'),
  price,
  stockQuantity: qty('stockQuantity'),
  minStockLevel: qty('minStockLevel').default(10),
});

const updateCatalogItem = z
  .object({ price: price.optional(), stockQuantity: qty('stockQuantity').optional(), minStockLevel: qty('minStockLevel').optional() })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one of price, stockQuantity, minStockLevel' });

// ----- Feature 2: stock & expiry -----
const addBatch = z.object({
  catalogItemId: objectId('catalogItemId'),
  batchNumber: z.string().trim().min(1, 'batchNumber is required').max(40).regex(/^[A-Za-z0-9-]+$/, 'batchNumber may contain letters, numbers and dashes only'),
  quantity: qty('quantity').refine((n) => n > 0, 'quantity must be at least 1'),
  manufacturingDate: dateString('manufacturingDate').optional(),
  expiryDate: dateString('expiryDate'),
  purchasePrice: z.coerce.number().min(0).optional(),
});

const updateBatch = z
  .object({
    batchNumber: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9-]+$/).optional(),
    quantity: qty('quantity').optional(),
    manufacturingDate: dateString('manufacturingDate').optional(),
    expiryDate: dateString('expiryDate').optional(),
    purchasePrice: z.coerce.number().min(0).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

const stockOverviewQuery = z.object({ search: z.string().trim().max(100).optional() });
const batchListQuery = z.object({ includeDepleted: boolFlag });
const expiryQuery = z.object({ window: z.enum(['30', '60', '90', 'expired']).default('30') });
const dispense = z.object({
  quantity: qty('quantity').refine((n) => n > 0, 'quantity must be at least 1'),
  note: z.string().trim().max(200).optional(),
});

module.exports = {
  masterListQuery, catalogListQuery, addCatalogItem, updateCatalogItem,
  addBatch, updateBatch, stockOverviewQuery, batchListQuery, expiryQuery, dispense,
};
