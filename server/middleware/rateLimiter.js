// SPDX-License-Identifier: MIT
/**
 * In-Memory Sliding Window Rate Limiter
 * Melindungi endpoint API dari serangan brute force login dan DoS.
 */

const requestCounts = new Map();

/**
 * Pembersihan memori berkala untuk entri IP yang sudah kedaluwarsa.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.startTime > data.windowMs) {
      requestCounts.delete(key);
    }
  }
}, 60000);

/**
 * Factory untuk membuat middleware rate limit dengan ambang batas kustom
 * @param {Object} options { windowMs: number, maxRequests: number, message: string }
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
  const maxRequests = options.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 300;
  const message = options.message || 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba lagi beberapa saat.';

  return (req, res, next) => {
    // Lewatkan rate limit jika dalam testing unit lokal
    if (process.env.NODE_ENV === 'test') return next();

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const key = `${clientIp}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = requestCounts.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now, windowMs };
      requestCounts.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: `${retryAfterSec} detik`
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
  authRateLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30, // 30 percobaan per 15 menit untuk auth login/register
    message: 'Terlalu banyak percobaan autentikasi dari IP ini. Demi keamanan akun, coba lagi dalam 15 menit.'
  }),
  apiRateLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
    message: 'Batas kuota request API terlampaui. Silakan perlambat frekuensi panggilan API Anda.'
  })
};
