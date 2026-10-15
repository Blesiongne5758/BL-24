// SPDX-License-Identifier: MIT
/**
 * Request Input Sanitization Middleware
 * Menyaring payload JSON untuk mencegah serangan XSS dan injeksi payload berbahaya
 * sebelum data masuk ke logika bisnis atau disimpan di database.
 */

function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/data\s*:\s*text\/html/gi, '')
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const cleanObj = {};
    for (const [key, val] of Object.entries(value)) {
      cleanObj[key] = sanitizeValue(val);
    }
    return cleanObj;
  }
  return value;
}

function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

module.exports = {
  sanitizeInput,
  sanitizeValue
};
