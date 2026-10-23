// SPDX-License-Identifier: MIT
/**
 * Middleware Autentikasi & Otorisasi Berbasis Peran (RBAC)
 * Memverifikasi token JWT dan menegakkan hak akses pengguna.
 */

const { verifyToken } = require('../services/jwt.service');
const { pool } = require('../db');

/**
 * Middleware Autentikasi Wajib
 * Memeriksa header Authorization: Bearer <token>
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Akses ditolak. Token otentikasi tidak ditemukan.'
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || payload.tokenType !== 'access') {
    return res.status(401).json({
      success: false,
      message: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.'
    });
  }

  try {
    // Ambil data user terkini dari database
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna yang terkait dengan token tidak ditemukan.'
      });
    }

    const user = rows[0];
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || '',
      subscriptionTier: user.subscription_tier || 'tier_starter',
      subscriptionActive: Boolean(user.subscription_active),
      identityVerified: Boolean(user.identity_verified || user.verified),
      balance: parseFloat(user.balance) || 0
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan sistem saat memvalidasi sesi pengguna.'
    });
  }
}

/**
 * Middleware Autentikasi Opsional (misal untuk endpoint yang dapat diakses publik atau member)
 */
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (payload && payload.tokenType === 'access') {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id]);
      if (rows.length > 0) {
        const user = rows[0];
        req.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company || '',
          subscriptionTier: user.subscription_tier || 'tier_starter',
          identityVerified: Boolean(user.identity_verified || user.verified)
        };
      }
    } catch (_) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * Middleware Otorisasi Berbasis Peran (RBAC)
 * @param  {...string} allowedRoles Daftar role yang diizinkan ('admin', 'seller', 'buyer')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Akses memerlukan login terlebih dahulu.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Fitur ini hanya untuk pengguna dengan hak akses: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

/**
 * Middleware Pemeriksaan Verifikasi Identitas Resmi (KTP/NPWP/NIB)
 * Diperlukan untuk komoditas limbah berbahaya (B3) atau transaksi kuota besar.
 */
function requireVerified(req, res, next) {
  if (!req.user || !req.user.identityVerified) {
    return res.status(403).json({
      success: false,
      message: 'Aksi ini memerlukan akun Mitra Terverifikasi (KTP/NPWP). Silakan unggah berkas verifikasi identitas Anda terlebih dahulu.'
    });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireVerified
};
