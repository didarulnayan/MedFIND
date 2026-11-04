const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const env = require('../config/env');

const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

/**
 * Stores an uploaded image (multer memory file).
 * - Cloudinary when CLOUDINARY_* variables are set (production).
 * - Local disk under backend/uploads otherwise (development fallback), served at /uploads/...
 */
async function saveImage(file, folder) {
  if (!file) return null;

  if (isConfigured) {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `medfind/${folder}`, resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(file.buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }

  const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), file.buffer);
  const relative = `/uploads/${folder}/${name}`;
  return { url: env.publicBaseUrl ? `${env.publicBaseUrl}${relative}` : relative, publicId: `local:${folder}/${name}` };
}

async function saveImages(files = [], folder) {
  return Promise.all(files.map((f) => saveImage(f, folder)));
}

module.exports = { saveImage, saveImages, UPLOAD_ROOT, storageMode: isConfigured ? 'cloudinary' : 'local' };
