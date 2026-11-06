const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const EXT = { png: '.png', jpg: '.jpg', webp: '.webp' };
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

// Identifies the real image type from the file's first bytes (the declared MIME type can be faked).
function sniff(buf) {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

let fetchImpl = (...args) => fetch(...args); // test seam
const setFetch = (f) => { fetchImpl = f; };

// Signed upload straight to Cloudinary's REST API (no SDK needed). Returns a permanent https URL.
async function toCloudinary(buf, kind) {
  const { cloudName, apiKey, apiSecret, folder } = env.cloudinary;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const toSign = Object.entries({ folder, timestamp }).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buf], { type: MIME[kind] }), `upload${EXT[kind]}`);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('folder', folder);
  form.append('signature', signature);

  let res;
  try {
    res = await fetchImpl(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  } catch {
    throw new ApiError(502, 'Could not reach the image host. Please try again.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.secure_url) {
    throw new ApiError(502, `The image host rejected the upload: ${(json && json.error && json.error.message) || res.status}`);
  }
  return json.secure_url;
}

// Cloudinary when configured (survives redeploys); otherwise the local uploads/ folder.
async function saveImage(file) {
  const kind = sniff(file.buffer);
  if (!kind) throw ApiError.badRequest('File content is not a valid JPG, PNG or WebP image');
  if (env.cloudinary.enabled) return toCloudinary(file.buffer, kind);
  const name = `${crypto.randomUUID()}${EXT[kind]}`;
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer, { flag: 'wx' });
  return `/uploads/${name}`;
}

module.exports = { saveImage, sniff, setFetch, UPLOAD_DIR };
