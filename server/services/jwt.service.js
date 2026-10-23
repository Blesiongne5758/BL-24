// SPDX-License-Identifier: MIT
/**
 * JWT Token Service (Bursa Limbah / Circulink)
 * Menangani penandatanganan dan verifikasi token autentikasi JWT
 * dengan fallback aman dan standard RFC 7519.
 */

const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET wajib diset dan minimal 32 karakter pada production.');
}
// Random development fallback avoids a committed/static signing key; sessions reset on restart.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Menghasilkan Access Token JWT untuk pengguna
 * @param {Object} user Objek data pengguna
 * @returns {string} Token JWT
 */
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    tokenType: 'access',
    email: user.email,
    role: user.role,
    name: user.name,
    company: user.company || '',
    subscriptionTier: user.subscriptionTier || 'tier_starter',
    identityVerified: Boolean(user.identityVerified)
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Menghasilkan Refresh Token JWT
 * @param {Object} user Objek data pengguna
 * @returns {string} Token Refresh
 */
function generateRefreshToken(user) {
  return jwt.sign({ id: user.id, email: user.email, tokenType: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Verifikasi token JWT
 * @param {string} token Token JWT
 * @returns {Object|null} Payload jika valid, null jika invalid/expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  JWT_SECRET
};
