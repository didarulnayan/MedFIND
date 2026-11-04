const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, as stated on the Figma upload fields
const ALLOWED = ['image/png', 'image/jpeg'];

/** Images are kept in memory and handed to storage.service (Cloudinary or local disk). */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Only PNG or JPG images are allowed (${file.fieldname})`));
    }
    cb(null, true);
  },
});

module.exports = { imageUpload, MAX_BYTES };
