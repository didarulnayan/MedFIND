const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = (label = 'id') =>
  z.string({ error: `${label} is required` }).refine((v) => mongoose.isValidObjectId(v), { message: `${label} must be a valid id` });

const idParam = (name = 'id') => z.object({ [name]: objectId(name) });

const pagination = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
};

/** "Tablet,Capsule" or ["Tablet","Capsule"] -> ["Tablet","Capsule"] */
const csvList = z.preprocess((v) => {
  if (v === undefined || v === '') return undefined;
  const arr = Array.isArray(v) ? v : String(v).split(',');
  return arr.map((s) => String(s).trim()).filter(Boolean);
}, z.array(z.string().max(100)).max(20, "at most 20 values").optional());

const boolFlag = z.preprocess((v) => (v === undefined ? undefined : ['true', '1', 'yes', true].includes(v)), z.boolean().optional());

const dateString = (label) =>
  z.coerce.date({ error: `${label} must be a valid date (YYYY-MM-DD)` });

module.exports = { z, objectId, idParam, pagination, csvList, boolFlag, dateString };
