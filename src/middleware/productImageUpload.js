const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const multer = require('multer');

const HttpError = require('../utils/httpError');

const PRODUCT_IMAGE_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PRODUCT_IMAGE_MAX_FILES = 5;
const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PRODUCT_IMAGE_EXTENSIONS_BY_MIME_TYPE = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
};
const PRODUCT_IMAGE_CANONICAL_EXTENSION_BY_MIME_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function ensureUploadDirExists() {
  fs.mkdirSync(PRODUCT_IMAGE_UPLOAD_DIR, { recursive: true });
}

function getFileExtension(file) {
  return PRODUCT_IMAGE_CANONICAL_EXTENSION_BY_MIME_TYPE[file.mimetype];
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    ensureUploadDirExists();
    callback(null, PRODUCT_IMAGE_UPLOAD_DIR);
  },
  filename(_req, file, callback) {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${getFileExtension(file)}`;
    callback(null, uniqueName);
  },
});

function productImageFileFilter(_req, file, callback) {
  const originalExtension = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = PRODUCT_IMAGE_EXTENSIONS_BY_MIME_TYPE[file.mimetype];

  if (!allowedExtensions || !allowedExtensions.has(originalExtension)) {
    callback(new HttpError(400, 'Product images must be JPEG, PNG, or WebP files.'));
    return;
  }

  callback(null, true);
}

const productImageUpload = multer({
  storage,
  fileFilter: productImageFileFilter,
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_SIZE_BYTES,
    files: PRODUCT_IMAGE_MAX_FILES,
  },
});

module.exports = {
  ALLOWED_PRODUCT_IMAGE_MIME_TYPES,
  PRODUCT_IMAGE_EXTENSIONS_BY_MIME_TYPE,
  PRODUCT_IMAGE_MAX_FILES,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
  productImageUpload,
  productImageFileFilter,
};
