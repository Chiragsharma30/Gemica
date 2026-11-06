const multer = require('multer');
const ApiError = require('../utils/ApiError');
const { UPLOAD_DIR } = require('../services/imageStore');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Files are held in memory (max 2 MB) so their real content can be checked before anything is stored.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(ApiError.badRequest('Only JPG, PNG or WebP images are allowed')),
});

module.exports = { uploadImage: upload.single('image'), UPLOAD_DIR };
