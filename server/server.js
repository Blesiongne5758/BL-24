// SPDX-License-Identifier: MIT
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');

// Database & Services
const { pool, testConnection, ping } = require('./db');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('./services/jwt.service');
const { authenticate, optionalAuth, requireRole } = require('./middleware/auth');
const { authRateLimiter, apiRateLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/sanitizer');
const { calculateEscrowBreakdown } = require('./services/escrow.service');
const { validateTierBookingRules, DEFAULT_TIERS } = require('./services/tierRules.service');
const { calculateCO2Reduction } = require('./services/esg.service');
const { runBackup, BACKUP_DIR } = require('./scripts/backup');
const { runMigrations } = require('./database/migrate');
const storageService = require('./services/storage.service');
const mediaOptimizer = require('./services/mediaOptimization.service');

const app = express();
const PORT = process.env.PORT || 5000;
const MARKET_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const MARKET_RATE_CACHE_MS = 10 * 60 * 1000;
let marketRateCache = null;

// =================================================================
// 1. KEAMANAN & OPTIMASI KINERJA (MIDDLEWARE)
// =================================================================
// Pengaturan Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,       // Mengizinkan CDN eksternal (Tailwind, Leaflet, FontAwesome)
  crossOriginEmbedderPolicy: false
}));

// Optimasi Kinerja: Kompresi Gzip/Deflate
app.use(compression());

// Pengukuran Waktu Respons Kinerja API
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // `finish` fires after headers are sent; never mutate headers at this point.
    if (!res.headersSent) res.setHeader('X-Response-Time', `${duration}ms`);
  });
  next();
});

// Konfigurasi CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000,http://127.0.0.1:5000,http://localhost:5500,http://127.0.0.1:5500')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Same-origin/non-browser requests have no Origin and remain compatible.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parser & Anti-XSS Sanitizer
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(sanitizeInput);

// Rate Limiting untuk proteksi API
app.use('/api/', apiRateLimiter);

// Helper pencatatan Audit Log Keamanan
async function logAudit(userId, action, targetType = null, targetId = null, details = null, req = null) {
  try {
    const ip = req ? (req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress) : null;
    const ua = req ? req.headers['user-agent'] : null;
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, target_type, target_id, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId || null, action, targetType, targetId ? String(targetId) : null, ip, ua ? ua.substring(0, 255) : null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
}

const UPLOAD_ROOT = path.join(__dirname, 'uploads');
// Jangan izinkan file internal server, termasuk dokumen identitas, tersaji dari root frontend.
app.use('/server', (_req, res) => res.status(404).end());
// Sajikan file statis frontend (root folder Bursa Limbah).
app.use(express.static(path.join(__dirname, '..')));
// Hanya eviden produk yang boleh diakses publik. Dokumen KTP tetap tersimpan privat di server.
app.use('/uploads/product-evidence', express.static(path.join(UPLOAD_ROOT, 'product-evidence'), {
  dotfiles: 'deny',
  index: false,
  maxAge: '1d'
}));

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const IDENTITY_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

function createUploadStorage(folder) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const destination = path.join(UPLOAD_ROOT, folder);
      fs.mkdir(destination, { recursive: true }, err => cb(err, destination));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    }
  });
}

function acceptMimeTypes(allowedTypes) {
  return (_req, file, cb) => {
    if (allowedTypes.has(file.mimetype)) return cb(null, true);
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname), false);
  };
}

const productEvidenceUpload = multer({
  storage: createUploadStorage('product-evidence'),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 3 },
  fileFilter: acceptMimeTypes(IMAGE_MIME_TYPES)
});

const identityDocumentUpload = multer({
  storage: createUploadStorage('identity-documents'),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
  fileFilter: acceptMimeTypes(IDENTITY_MIME_TYPES)
});

const weighingProofUpload = multer({
  storage: createUploadStorage('weighing-proofs'),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 },
  fileFilter: acceptMimeTypes(IDENTITY_MIME_TYPES)
});

function uploadedFileUrl(req, file) {
  const relativePath = path.relative(UPLOAD_ROOT, file.path).split(path.sep).map(encodeURIComponent).join('/');
  return `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
}

function privateFileKey(file) {
  return path.relative(UPLOAD_ROOT, file.path).split(path.sep).join('/');
}

function hasExpectedFileSignature(buffer, mimeType) {
  const signatures = {
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d]
  };
  const signature = signatures[mimeType];
  if (!signature || buffer.length < signature.length) return false;
  if (mimeType === 'image/webp') {
    return signature.every((byte, index) => buffer[index] === byte) && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return signature.every((byte, index) => buffer[index] === byte);
}

async function verifyUploadedFileContent(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  try {
    const checks = await Promise.all(files.map(async file => {
      const handle = await fs.promises.open(file.path, 'r');
      const header = Buffer.alloc(12);
      await handle.read(header, 0, header.length, 0);
      await handle.close();
      return { file, valid: hasExpectedFileSignature(header, file.mimetype) };
    }));

    const invalidFiles = checks.filter(check => !check.valid).map(check => check.file);
    if (invalidFiles.length > 0) {
      await Promise.all(invalidFiles.map(file => fs.promises.unlink(file.path).catch(() => {})));
      return res.status(400).json({ success: false, message: 'Isi berkas tidak sesuai dengan format yang diizinkan.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}


// =================================================================
// DECOUPLED CLOUD OBJECT STORAGE & MEDIA OPTIMIZATION (S3 / SPACES / MINIO)
// =================================================================

// 1. Request Pre-Signed PUT URL for direct client-to-bucket upload
app.post('/api/storage/presigned-upload', optionalAuth, async (req, res) => {
  try {
    const { filename, contentType, fileSize, category, headerSampleBase64 } = req.body;

    // Server-side MIME & Size Validation
    const validation = storageService.validateUploadRequest({
      filename,
      contentType,
      fileSize,
      category: category || 'public_listing'
    });

    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.message });
    }

    // Server-side Magic Bytes validation from sample buffer if provided
    if (headerSampleBase64) {
      const buffer = Buffer.from(headerSampleBase64, 'base64');
      const isMagicValid = storageService.validateMagicBytes(buffer, contentType);
      if (!isMagicValid) {
        return res.status(400).json({
          success: false,
          error: 'Validasi Magic Bytes gagal: Isi berkas tidak cocok dengan tipe yang dideklarasikan atau terdeteksi script berbahaya.'
        });
      }
    }

    if (String(category || 'public_listing').startsWith('private_') && !req.user) {
      return res.status(401).json({ success: false, error: 'Upload dokumen privat memerlukan autentikasi.' });
    }

    const userId = req.user ? req.user.id : (req.body.userId || 'anon');
    const presigned = storageService.generatePresignedUploadUrl({
      filename,
      contentType,
      fileSize,
      category: category || 'public_listing',
      userId
    });

    await logAudit(userId, 'GENERATE_PRESIGNED_UPLOAD', category, presigned.fileKey, { contentType, fileSize }, req);

    res.json(presigned);
  } catch (err) {
    console.error('[Storage Error] Presigned Upload failed:', err);
    res.status(500).json({ success: false, error: 'Gagal membuat URL upload penyimpanan cloud.' });
  }
});

// 2. Access private KYC documents & transaction attachments via short-lived Pre-Signed GET URL
app.get('/api/storage/private-url', authenticate, async (req, res) => {
  try {
    const key = req.query.key;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: 'Parameter fileKey wajib disertakan.' });
    }

    const user = req.user;
    const isAdmin = user.role === 'admin';
    const isOwner = key.includes(`/${user.id}-`) || key.includes(`_${user.id}_`);

    // Strict Access Control: Admin, Owner, or verified transaction participant
    if (!isAdmin && !isOwner) {
      // Check if user is buyer/seller of an order with this document
      const [orderRows] = await pool.query(
        'SELECT id, buyer_id, seller_id, status FROM orders WHERE (buyer_id = ? OR seller_id = ?) AND (remaining_payment_proof LIKE ? OR id LIKE ?)',
        [user.id, user.id, `%${key}%`, `%${key}%`]
      ).catch(() => [[]]);

      if (!orderRows || orderRows.length === 0) {
        await logAudit(user.id, 'UNAUTHORIZED_PRIVATE_STORAGE_ACCESS', 'storage_vault', key, { reason: 'No ownership or order affiliation' }, req);
        return res.status(403).json({ success: false, error: 'Akses ditolak: Dokumen privat terproteksi.' });
      }
    }

    // Generate short-lived Pre-Signed GET URL (15 minutes TTL)
    const signedUrl = storageService.generatePresignedGetUrl(key, 900);

    await logAudit(user.id, 'ACCESS_PRIVATE_FILE', 'storage_vault', key, { isAdmin, isOwner }, req);

    res.json({
      success: true,
      fileKey: key,
      signedUrl,
      expiresInSeconds: 900
    });
  } catch (err) {
    console.error('[Storage Error] Private URL generation failed:', err);
    res.status(500).json({ success: false, error: 'Gagal menerbitkan token akses dokumen privat.' });
  }
});

// 3. Storage configuration & media optimization endpoint
app.get('/api/storage/config', (_req, res) => {
  res.json({
    success: true,
    provider: storageService.provider,
    region: storageService.region,
    publicBucket: storageService.publicBucket,
    privateBucket: storageService.privateBucket,
    publicCdnDomain: storageService.publicCdnDomain,
    mediaOptimizer: mediaOptimizer.provider,
    imagekitEndpoint: mediaOptimizer.imagekitEndpoint,
    cloudinaryCloudName: mediaOptimizer.cloudinaryCloudName
  });
});

// =================================================================
// HELPER: Map Data User dari Database
// =================================================================
function mapUserFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || row.full_name || '',
    email: row.email,
    phone: row.phone || '',
    company: row.company || row.company_name || '',
    role: row.role,
    authProvider: row.auth_provider || 'local',
    subscriptionTier: row.subscription_tier || 'tier_starter',
    subscriptionActive: Boolean(row.subscription_active),
    subscriptionExpiry: row.subscription_expiry ? new Date(row.subscription_expiry).toISOString().split('T')[0] : null,
    identityVerified: Boolean(row.identity_verified || row.verified),
    verificationStatus: row.verification_status || (row.verified ? 'verified' : 'unverified'),
    verificationType: row.verification_type || null,
    ktpNumber: row.ktp_number || null,
    npwpNumber: row.npwp_number || row.npwp || null,
    verifiedBadge: row.verified_badge || (row.verified ? 'Mitra Terverifikasi' : 'Pembeli Baru'),
    verifiedAt: row.verified_at || null,
    bankAccount: row.bank_account || '-',
    location: row.location || 'Indonesia',
    balance: parseFloat(row.balance) || 0,
    avatar: row.avatar || null,
    paymentMethods: (() => {
      try {
        if (!row.payment_methods) return null;
        return typeof row.payment_methods === 'string' ? JSON.parse(row.payment_methods) : row.payment_methods;
      } catch (_) { return null; }
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =================================================================
// HELPER: Map Data Produk dari Database
// =================================================================
function mapProductFromDb(row, images = []) {
  if (!row) return null;
  const weight = parseFloat(row.weight) || 0;
  const volume = parseFloat(row.volume) || 0;
  const askingPrice = parseFloat(row.asking_price) || 0;
  const qty = volume > 0 ? volume : weight;
  const totalPrice = qty * askingPrice;

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description || '',
    condition: row.condition || 'Bersih',
    grade: row.grade || 'Grade Standar',
    containerType: row.container_type || 'Wadah Standar',
    weight: weight,
    volume: volume,
    unit: row.unit || 'Kg',
    origin: row.origin_source || row.location || '',
    address: row.location || '',
    city: row.city || 'Indonesia',
    lat: parseFloat(row.latitude) || -6.2088,
    lng: parseFloat(row.longitude) || 106.8456,
    offerPrice: askingPrice,
    totalPrice: totalPrice,
    minimumOrder: parseFloat(row.minimum_order) || 1,
    minimumOrderUnit: row.unit || 'Kg',
    pickupSchedule: row.pickup_schedule || 'Siap Angkut Segera',
    status: row.status || 'available',
    isB3: Boolean(row.is_b3),
    b3PermitNumber: row.b3_permit_number || null,
    categoryId: row.category_id,
    categoryName: row.category_name || row.main_category || 'Limbah',
    categoryCode: row.category_code || 'WST',
    sellerId: row.seller_id,
    sellerName: row.seller_name || row.company || 'Mitra Penjual',
    sellerPhone: row.seller_phone || '',
    sellerWhatsapp: row.seller_phone ? row.seller_phone.replace(/[^0-9]/g, '') : '',
    evidences: images.map((img, index) => ({
      url: img.image_url || img,
      type: img.caption || `Eviden ${index + 1}`
    })),
    createdAt: row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16) : ''
  };
}

// =================================================================
// 1. HEALTH CHECK & STATUS KONEKSI DATABASE (PROBE METRIKS)
// =================================================================
app.get('/api/health', async (req, res) => {
  const dbStatus = await ping();
  const memory = process.memoryUsage();
  return res.json({
    status: dbStatus.healthy ? 'ok' : 'degraded',
    service: 'bursalimbah-api',
    database: dbStatus.healthy ? 'connected' : 'disconnected',
    dbLatencyMs: dbStatus.latencyMs,
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024))
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// =================================================================
// 2. PENDAFTARAN PENGGUNA (REGISTER)
// =================================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'buyer',
      company = '',
      phone = '',
      location = 'Indonesia',
      bankAccount = '-',
      tierId = 'tier_starter',
      termsAccepted = false,
      termsVersion = ''
    } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Alamat email tidak valid.' });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Kata sandi harus terdiri dari 8-128 karakter.' });
    }
    if (!['buyer', 'seller'].includes(role) || termsAccepted !== true) {
      return res.status(400).json({ success: false, message: 'Syarat dan Ketentuan wajib disetujui sebelum membuat akun.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Cek apakah email sudah terdaftar
    const [existing] = await pool.query('SELECT id, email, role FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing.length > 0) {
      const existingUser = existing[0];
      const roleLabel = existingUser.role === 'buyer' ? 'Pembeli' : (existingUser.role === 'seller' ? 'Penjual' : 'Pengelola');
      return res.status(409).json({
        success: false,
        message: `Email ini sudah terdaftar sebagai ${roleLabel}. Silakan langsung masuk.`
      });
    }

    // 2. Hash password menggunakan bcrypt
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Kata sandi harus terdiri dari 8-128 karakter.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Tentukan default nilai
    const newId = `user_${role}_${Date.now()}`;
    const defaultPhone = phone || `+62 812-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
    const displayPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    const finalName = name || (role === 'seller' ? `${displayPrefix} (Mitra Penjual)` : `${displayPrefix} (Pembeli)`);
    const finalCompany = company || (role === 'seller' ? `CV ${displayPrefix} Mandiri` : `PT ${displayPrefix} Daur Ulang`);

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const subscriptionExpiry = nextMonth.toISOString().split('T')[0];
    const verifiedBadge = role === 'seller' ? 'Pemasok Baru' : 'Pembeli Terdaftar';

    // 4. Simpan akun beserta bukti persetujuan syarat dan ketentuan dalam satu transaksi.
    const insertQuery = `
      INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, 1, ?, 0, 'unverified', ?, ?, ?, 0.00)
    `;

    const [termsRows] = await pool.query("SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('terms_title', 'terms_version')");
    const termsSettings = Object.fromEntries(termsRows.map(row => [row.setting_key, row.setting_value]));
    const activeTermsVersion = termsSettings.terms_version || '1.0';
    if (termsVersion && termsVersion !== activeTermsVersion) {
      return res.status(409).json({ success: false, message: 'Syarat dan Ketentuan telah diperbarui. Mohon setujui versi terbaru.' });
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(insertQuery, [
        newId, finalName, cleanEmail, defaultPhone, finalCompany, role, passwordHash, tierId,
        subscriptionExpiry, verifiedBadge, bankAccount, location
      ]);
      await connection.query(
        'INSERT INTO user_terms_acceptances (id, user_id, terms_version, terms_title) VALUES (?, ?, ?, ?)',
        [`terms_${crypto.randomUUID()}`, newId, activeTermsVersion, termsSettings.terms_title || 'Syarat dan Ketentuan Penggunaan Bursa Limbah']
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
    const newUser = mapUserFromDb(rows[0]);
    const token = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    await logAudit(newUser.id, 'user_register', 'user', newUser.id, { role, email: cleanEmail }, req);

    return res.status(201).json({
      success: true,
      user: newUser,
      role: newUser.role,
      token,
      refreshToken,
      isNewAccount: true,
      message: 'Pendaftaran akun berhasil.'
    });

  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ success: false, message: 'Kesalahan pendaftaran: ' + error.message });
  }
});

// =================================================================
// 3. MASUK PENGGUNA (LOGIN)
// =================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password, role: expectedRole } = req.body;

    if (typeof identifier !== 'string' || !identifier.trim() || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Identifier dan kata sandi wajib diisi; kata sandi harus 8-128 karakter.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanDigits = cleanId.replace(/[^0-9]/g, '');

    let query = 'SELECT * FROM users WHERE LOWER(email) = ?';
    let params = [cleanId];

    if (cleanDigits.length >= 7) {
      query += ' OR REPLACE(REPLACE(phone, "-", ""), " ", "") LIKE ?';
      params.push(`%${cleanDigits}%`);
    }

    const [users] = await pool.query(query, params);

    // Auto-register jika belum ada akun
    if (users.length === 0) {
      if (cleanId.includes('@') && cleanId.includes('.')) {
        const roleToAssign = expectedRole || 'buyer';
        if (!['buyer', 'seller'].includes(roleToAssign) || password.length < 8 || password.length > 128) {
          return res.status(400).json({ success: false, message: 'Role atau kata sandi tidak valid.' });
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const newId = `user_${roleToAssign}_${Date.now()}`;
        const emailPrefix = cleanId.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
        const displayPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        const newName = roleToAssign === 'seller' ? `${displayPrefix} (Mitra Penjual)` : `${displayPrefix} (Pembeli)`;
        const newCompany = roleToAssign === 'seller' ? `CV ${displayPrefix} Mandiri` : `PT ${displayPrefix} Daur Ulang`;
        const newPhone = `+62 812-${Math.floor(10000000 + Math.random() * 90000000)}`;

        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const subExpiry = nextMonth.toISOString().split('T')[0];

        const insertQuery = `
          INSERT INTO users (
            id, name, email, phone, company, role, password_hash, auth_provider,
            subscription_tier, subscription_active, subscription_expiry,
            identity_verified, verification_status, verified_badge,
            bank_account, location, balance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', 'tier_starter', 1, ?, 0, 'unverified', ?, '-', 'Indonesia', 0.00)
        `;

        await pool.query(insertQuery, [
          newId,
          newName,
          cleanId,
          newPhone,
          newCompany,
          roleToAssign,
          passwordHash,
          subExpiry,
          roleToAssign === 'seller' ? 'Pemasok Baru' : 'Pembeli Baru'
        ]);

        const [createdRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
        const newUser = mapUserFromDb(createdRows[0]);
        const token = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        await logAudit(newUser.id, 'user_auto_register_login', 'user', newUser.id, { role: roleToAssign }, req);

        return res.json({
          success: true,
          user: newUser,
          role: newUser.role,
          token,
          refreshToken,
          isNewAccount: true,
          message: 'Akun baru berhasil dibuat secara otomatis.'
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Akun tidak ditemukan. Masukkan alamat email yang valid.'
      });
    }

    const userRecord = users[0];

    // Role check
    if (expectedRole && userRecord.role !== expectedRole) {
      const roleLabel = userRecord.role === 'buyer' ? 'Pembeli' : (userRecord.role === 'seller' ? 'Penjual' : 'Pengelola');
      return res.status(403).json({
        success: false,
        message: `Akun ini terdaftar sebagai ${roleLabel}. Silakan masuk melalui tab ${roleLabel}.`
      });
    }

    // Password verification
    let passwordMatch = false;
    const isDemoMode = process.env.DEMO_MODE === 'true';

    if (userRecord.password_hash) {
      if (userRecord.password_hash.startsWith('$2')) {
        passwordMatch = [REDACTED]
      } else if (isDemoMode) {
        passwordMatch = [REDACTED]
      }
    } else if (isDemoMode) {
      passwordMatch = [REDACTED]
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kredensial login tidak cocok.'
      });
    }

    const authenticatedUser = mapUserFromDb(userRecord);
    const token = generateAccessToken(authenticatedUser);
    const refreshToken = generateRefreshToken(authenticatedUser);

    await logAudit(authenticatedUser.id, 'user_login', 'user', authenticatedUser.id, { role: authenticatedUser.role }, req);

    return res.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
      token,
      refreshToken,
      message: `Selamat datang kembali, ${authenticatedUser.name}!`
    });

  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, message: 'Kesalahan server saat login: ' + error.message });
  }
});

// =================================================================
// 4. GOOGLE OAUTH
// =================================================================
async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) return null;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) return null;
    const claims = await response.json();
    const validIssuer = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
    const validAudience = !process.env.GOOGLE_CLIENT_ID || claims.aud === process.env.GOOGLE_CLIENT_ID;
    if (!validIssuer || !validAudience || claims.email_verified !== 'true' || !claims.email) return null;
    return claims;
  } catch (_) {
    return null;
  }
}
app.post('/api/auth/google', async (req, res) => {
  try {
    const { idToken, role = 'buyer' } = req.body;
    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid.' });
    }
    if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) {
      return res.status(401).json({ success: false, message: 'Token Google tidak valid atau belum diverifikasi.' });
    }
    const [googleSettingRows] = await pool.query(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['google_login_enabled']
    );
    const googleLoginEnabled = googleSettingRows.length > 0 && googleSettingRows[0].setting_value === 'true';
    if (!googleLoginEnabled) {
      return res.status(403).json({ success: false, message: 'Login dengan Google sedang dinonaktifkan oleh administrator.' });
    }
    const claims = await verifyGoogleIdToken(idToken);
    if (!claims) return res.status(401).json({ success: false, message: 'Token Google tidak valid atau belum diverifikasi.' });
    const email = claims.email;
    const name = claims.name || claims.email.split('@')[0];
    const avatar = claims.picture || null;

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (existing.length > 0) {
      const user = mapUserFromDb(existing[0]);
      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await logAudit(user.id, 'google_login', 'user', user.id, {}, req);
      return res.json({ success: true, user, role: user.role, token, refreshToken, isNewAccount: false });
    }

    const newId = `user_${role}_${Date.now()}`;
    const displayName = name || cleanEmail.split('@')[0];
    const dummyPhone = `+62 812-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const company = role === 'seller' ? `CV ${displayName} Sentra` : `PT ${displayName} Daur Ulang`;
    const passwordHash = await bcrypt.hash('google_oauth_' + Date.now(), 10);

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const subExpiry = nextMonth.toISOString().split('T')[0];

    const insertQuery = `
      INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance, avatar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'google', 'tier_starter', 1, ?, 0, 'unverified', ?, '-', 'Indonesia', 0.00, ?)
    `;

    await pool.query(insertQuery, [
      newId, displayName, cleanEmail, dummyPhone, company, role, passwordHash,
      subExpiry, role === 'seller' ? 'Mitra Google' : 'Pembeli Google', avatar || null
    ]);

    const [newRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
    const newUser = mapUserFromDb(newRows[0]);
    const token = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    await logAudit(newUser.id, 'google_register', 'user', newUser.id, { role }, req);

    return res.status(201).json({ success: true, user: newUser, role: newUser.role, token, refreshToken, isNewAccount: true });
  } catch (error) {
    console.error('[Google Auth Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 4B. PROFILE SESI (GET /api/auth/me) & REFRESH TOKEN
// =================================================================
app.get('/api/auth/me', authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'Refresh token wajib disertakan.' });
  }
  const payload = verifyToken(refreshToken);
  if (!payload || payload.tokenType !== 'refresh') {
    return res.status(401).json({ success: false, message: 'Refresh token kedaluwarsa atau tidak valid.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.id]);
  if (rows.length === 0) {
    return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });
  }

  const user = mapUserFromDb(rows[0]);
  const [REDACTED] = generateAccessToken(user);
  return res.json({
    success: true,
    token: [REDACTED]
    user
  });
});

// =================================================================
// 5. USERS & PROFILE
// =================================================================
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = 'SELECT * FROM users';
    const params = [];
    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, users: rows.map(mapUserFromDb) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:id/profile', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Akses profil ditolak.' });
  try {
    const { id } = req.params;
    const { name, company, phone, location, bankAccount, avatar, paymentMethods } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const updates = [];
    const params = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (company) { updates.push('company = ?'); params.push(company); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (bankAccount) { updates.push('bank_account = ?'); params.push(bankAccount); }
    if (avatar) { updates.push('avatar = ?'); params.push(avatar); }
    if (paymentMethods !== undefined) {
      updates.push('payment_methods = ?');
      params.push(typeof paymentMethods === 'object' ? JSON.stringify(paymentMethods) : paymentMethods);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return res.json({ success: true, user: mapUserFromDb(updatedRows[0]), message: 'Profil berhasil diperbarui.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/users/:id/verify', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Akses verifikasi ditolak.' });
  try {
    const { id } = req.params;
    const { type, ktpNumber, npwpNumber, docUrl } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const verifiedAt = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const verifiedBadge = (type === 'npwp' || (ktpNumber && npwpNumber))
      ? 'Mitra Terverifikasi (KTP/NPWP)'
      : 'Mitra Terverifikasi (KTP)';

    const query = `
      UPDATE users SET 
        verification_type = ?,
        ktp_number = COALESCE(?, ktp_number),
        npwp_number = COALESCE(?, npwp_number),
        verification_doc_url = COALESCE(?, verification_doc_url),
        identity_verified = 1,
        verification_status = 'verified',
        verified_badge = ?,
        verified_at = ?
      WHERE id = ?
    `;

    await pool.query(query, [type || 'ktp', ktpNumber || null, npwpNumber || null, docUrl || null, verifiedBadge, verifiedAt, id]);
    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return res.json({ success: true, user: mapUserFromDb(updatedRows[0]), message: 'Identitas berhasil diverifikasi.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 6. UPLOAD EVIDEN PRODUK & DOKUMEN IDENTITAS
// =================================================================
app.post('/api/uploads/product-evidence', authenticate, requireRole('seller', 'admin'), productEvidenceUpload.array('files', 3), verifyUploadedFileContent, (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ success: false, message: 'Minimal satu gambar eviden wajib diunggah.' });
  }

  return res.status(201).json({
    success: true,
    message: `${files.length} gambar eviden berhasil diunggah.`,
    files: files.map(file => ({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: uploadedFileUrl(req, file)
    }))
  });
});

app.post('/api/uploads/identity-document', authenticate, identityDocumentUpload.single('file'), verifyUploadedFileContent, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Dokumen identitas wajib dipilih.' });
  }

  return res.status(201).json({
    success: true,
    message: 'Dokumen identitas berhasil diunggah.',
    file: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storageKey: privateFileKey(req.file)
    }
  });
});

app.post('/api/uploads/weighing-proof', authenticate, weighingProofUpload.single('file'), verifyUploadedFileContent, (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Foto atau dokumen bukti timbang wajib dipilih.' });
  return res.status(201).json({
    success: true,
    message: 'Bukti timbang berhasil diunggah.',
    file: { originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, storageKey: privateFileKey(req.file) }
  });
});

// =================================================================
// 7. MASTER KATEGORI (CATEGORIES)
// =================================================================
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY main_category ASC, sub_category ASC');
    return res.json({ success: true, count: rows.length, categories: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 8. PRODUK & LISTING LIMBAH (PRODUCTS)
// =================================================================
app.get('/api/products', async (req, res) => {
  try {
    const { status, sellerId, categoryId, limit = 50 } = req.query;

    let query = `
      SELECT p.*, 
             c.main_category, c.sub_category, c.category_code,
             u.name AS seller_name, u.company AS seller_company, u.phone AS seller_phone
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (sellerId) {
      query += ' AND p.seller_id = ?';
      params.push(sellerId);
    }
    if (categoryId) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [rows] = await pool.query(query, params);

    // Ambil foto eviden untuk semua produk ini
    const productIds = rows.map(r => r.id);
    let imagesByProduct = {};
    if (productIds.length > 0) {
      const [images] = await pool.query(
        'SELECT * FROM product_images WHERE product_id IN (?) ORDER BY is_evidence DESC',
        [productIds]
      );
      images.forEach(img => {
        if (!imagesByProduct[img.product_id]) imagesByProduct[img.product_id] = [];
        imagesByProduct[img.product_id].push(img);
      });
    }

    const mapped = rows.map(r => mapProductFromDb(r, imagesByProduct[r.id] || []));
    return res.json({ success: true, count: mapped.length, products: mapped });
  } catch (error) {
    console.error('[Get Products Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT p.*, 
             c.main_category, c.sub_category, c.category_code,
             u.name AS seller_name, u.company AS seller_company, u.phone AS seller_phone
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE p.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
    }

    const [images] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [id]);
    const product = mapProductFromDb(rows[0], images);
    return res.json({ success: true, product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/products', authenticate, requireRole('seller', 'admin'), async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `PRD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const code = data.code || `CIR-${data.categoryCode || 'WST'}-${Math.floor(10 + Math.random() * 90)}`;
    const status = data.status || 'pending';

    // Pastikan seller_id ada di database, jika belum buatkan placeholder
    if (data.sellerId) {
      const [uCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.sellerId]);
      if (uCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'Penjual harus memiliki akun terdaftar.' });
      }
    }

    // Pastikan category_id valid
    let catId = data.categoryId || 'sub_oil_001';
    const [catCheck] = await pool.query('SELECT id FROM categories WHERE id = ?', [catId]);
    if (catCheck.length === 0) {
      const [firstCat] = await pool.query('SELECT id FROM categories LIMIT 1');
      if (firstCat.length > 0) catId = firstCat[0].id;
    }

    const insertSql = `
      INSERT INTO products (
        id, code, seller_id, category_id, title, description, condition, grade,
        container_type, weight, volume, unit, origin_source, location, city,
        latitude, longitude, asking_price, minimum_order, pickup_schedule,
        status, is_b3, b3_permit_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertSql, [
      id,
      code,
      data.sellerId || 'user_seller_1',
      catId,
      data.title || 'Limbah Terverifikasi',
      data.description || '',
      data.condition || 'bersih',
      data.grade || 'Grade A',
      data.containerType || 'Wadah Standar',
      Number(data.weight) || 0,
      Number(data.volume) || 0,
      data.unit || 'Kg',
      data.origin || data.origin_source || '',
      data.address || data.location || '',
      data.city || 'Indonesia',
      Number(data.lat) || -6.2088,
      Number(data.lng) || 106.8456,
      Number(data.offerPrice || data.asking_price) || 0,
      Number(data.minimumOrder) || 1,
      data.pickupSchedule || 'Siap Angkut Segera',
      status,
      data.isB3 ? 1 : 0,
      data.b3PermitNumber || null
    ]);

    // Simpan foto eviden jika ada
    if (Array.isArray(data.evidences) && data.evidences.length > 0) {
      for (let i = 0; i < data.evidences.length; i++) {
        const evidence = data.evidences[i];
        const imgUrl = typeof evidence === 'string' ? evidence : (evidence.url || '');
        const caption = typeof evidence === 'string' ? null : (evidence.type || null);
        if (imgUrl) {
          await pool.query(
            'INSERT INTO product_images (id, product_id, image_url, caption, is_evidence) VALUES (?, ?, ?, ?, 1)',
            [`IMG-${id}-${i + 1}`, id, imgUrl, caption]
          );
        }
      }
    }

    return res.status(201).json({
      success: true,
      productId: id,
      code: code,
      message: 'Produk limbah berhasil didaftarkan.'
    });
  } catch (error) {
    console.error('[Create Product Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/products/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status wajib diisi.' });
    }

    await pool.query('UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    return res.json({ success: true, message: `Status produk berhasil diubah menjadi: ${status}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/products/:id', authenticate, requireRole('seller', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM product_images WHERE product_id = ?', [id]);
    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Produk berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 8. ORDERS & BOOKING TRANSAKSI (ORDERS)
// =================================================================
app.get('/api/orders', async (req, res) => {
  try {
    const { buyerId, sellerId, status } = req.query;
    let sql = `
      SELECT o.*, 
             p.title AS product_title, p.code AS product_code,
             u_buyer.name AS buyer_name, u_buyer.phone AS buyer_phone,
             u_seller.name AS seller_name, u_seller.phone AS seller_phone
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN users u_buyer ON o.buyer_id = u_buyer.id
      LEFT JOIN users u_seller ON o.seller_id = u_seller.id
      WHERE 1=1
    `;
    const params = [];

    if (buyerId) { sql += ' AND o.buyer_id = ?'; params.push(buyerId); }
    if (sellerId) { sql += ' AND o.seller_id = ?'; params.push(sellerId); }
    if (status) { sql += ' AND o.escrow_status = ?'; params.push(status); }

    sql += ' ORDER BY o.created_at DESC';

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, count: rows.length, orders: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/orders', authenticate, requireRole('buyer', 'admin'), async (req, res) => {
    if (req.user.role !== 'admin' && req.user.id !== req.body.buyerId) return res.status(403).json({ success: false, message: 'Pembeli tidak sesuai dengan sesi aktif.' });
  try {
    const data = req.body;
    const orderId = data.id || `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderCode = data.bookingCode || `CIR-BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalAmount = Number(data.totalPrice || data.totalAmount) || 0;
    const quantity = Number(data.weight || data.volume || data.quantity) || 1;

    // 1. Validasi Aturan Tier Berlangganan Pembeli jika buyerId terdaftar
    if (data.buyerId) {
      const [bRows] = await pool.query('SELECT subscription_tier, identity_verified FROM users WHERE id = ?', [data.buyerId]);
      if (bRows.length > 0) {
        const userTierKey = bRows[0].subscription_tier || 'tier_starter';
        const tierConfig = DEFAULT_TIERS[userTierKey] || DEFAULT_TIERS.tier_starter;
        const tierCheck = validateTierBookingRules(tierConfig, totalAmount, quantity);
        if (!tierCheck.valid) {
          return res.status(403).json({
            success: false,
            message: tierCheck.message
          });
        }
      }
    }

    // 2. Kalkulasi Rincian Escrow Finansial (DP 30% + Handling Fee)
    const escrowCalc = calculateEscrowBreakdown(totalAmount, {
      dpPercent: Number(data.downPaymentRate || data.dpPercentage) || 30,
      handlingFee: Number(data.handlingFee) || 10000
    });

    // 3. Estimasi Reduksi Emisi Karbon ESG (kg CO2e)
    let categoryKey = 'default';
    if (data.productId) {
      const [pRows] = await pool.query('SELECT category_id FROM products WHERE id = ?', [data.productId]);
      if (pRows.length > 0 && pRows[0].category_id) {
        categoryKey = pRows[0].category_id;
      }
    }
    const esg = calculateCO2Reduction(categoryKey, quantity);

    // Pastikan buyer dan seller terdaftar di tabel users
    if (data.buyerId) {
      const [bCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.buyerId]);
      if (bCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'Pembeli harus memiliki akun terdaftar.' });
      }
    }
    if (data.sellerId) {
      const [sCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.sellerId]);
      if (sCheck.length === 0) {
        return res.status(400).json({ success: false, message: 'Penjual harus memiliki akun terdaftar.' });
      }
    }

    const insertSql = `
      INSERT INTO orders (
        id, order_code, product_id, buyer_id, buyer_company, seller_id,
        total_amount, dp_percentage, dp_amount, remaining_amount,
        handling_fee, escrow_status, pickup_date, notes, shipping_method,
        co2_reduction_kg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertSql, [
      orderId,
      orderCode,
      data.productId,
      data.buyerId,
      data.buyerCompany || data.buyerName || 'Perusahaan Pembeli',
      data.sellerId,
      escrowCalc.totalValue,
      escrowCalc.dpPercent,
      data.downPaymentAmount !== undefined ? Number(data.downPaymentAmount) : escrowCalc.dpAmount,
      data.remainingPayment !== undefined ? Number(data.remainingPayment) : escrowCalc.remainingAmount,
      escrowCalc.handlingFee,
      data.escrowStatus || (escrowCalc.dpAmount > 0 ? 'dp_secured' : 'pending_dp'),
      data.pickupDate || null,
      data.notes || '',
      data.shippingMethod || 'Armada Mandiri Pembeli',
      esg.kgCO2e
    ]);

    // Update status produk menjadi 'booked'
    if (data.productId) {
      await pool.query("UPDATE products SET status = 'booked' WHERE id = ?", [data.productId]);
    }

    await logAudit(data.buyerId, 'create_order', 'order', orderId, {
      totalAmount: escrowCalc.totalValue,
      dpAmount: escrowCalc.dpAmount,
      co2ReductionKg: esg.kgCO2e
    }, req);

    return res.status(201).json({
      success: true,
      orderId,
      orderCode,
      escrowBreakdown: escrowCalc,
      esgMetrics: esg,
      message: 'Booking berhasil diproses dan disimpan ke database.'
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/orders/:id/status', authenticate, requireRole('admin', 'seller'), async (req, res) => {
  try {
    const { id } = req.params;
    const { escrowStatus } = req.body;

    await pool.query('UPDATE orders SET escrow_status = ? WHERE id = ?', [escrowStatus, id]);

    if (escrowStatus === 'completed') {
      const [order] = await pool.query('SELECT product_id FROM orders WHERE id = ?', [id]);
      if (order.length > 0 && order[0].product_id) {
        await pool.query('UPDATE products SET status = \'completed\' WHERE id = ?', [order[0].product_id]);
      }
    }

    return res.json({ success: true, message: `Status order diperbarui: ${escrowStatus}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/orders/:id/remaining-proof', authenticate, requireRole('buyer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const proofData = req.body || {};
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    try {
      await pool.query(
        `UPDATE orders SET 
          escrow_status = 'proof_submitted',
          remaining_payment_status = 'proof_submitted',
          remaining_payment_proof = ?,
          remaining_payment_notes = ?,
          remaining_payment_submitted_at = ?,
          notes = CONCAT(COALESCE(notes, ''), ' [Bukti Pelunasan Diunggah Ref: ', ?, ']')
        WHERE id = ?`,
        [
          proofData.proofImageUrl || proofData.imageUrl || '',
          proofData.notes || '',
          now,
          proofData.referenceNumber || proofData.method || 'Non-Tunai',
          id
        ]
      );
    } catch (dbErr) {
      console.warn('[DB Warning] remaining-proof update fallback:', dbErr.message);
      await pool.query("UPDATE orders SET escrow_status = 'proof_submitted' WHERE id = ?", [id]).catch(() => {});
    }
    return res.json({ success: true, message: 'Bukti sisa pembayaran berhasil dikirim dan menunggu verifikasi.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/orders/:id/verify-remaining', authenticate, requireRole('admin', 'seller'), async (req, res) => {
  try {
    const { id } = req.params;
    const { verifierRole, verifierName } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newStatus = verifierRole === 'admin' ? 'completed' : 'verified_by_seller';
    const remainingStatus = verifierRole === 'admin' ? 'paid' : 'verified_by_seller';
    const verifierInfo = `${verifierName || verifierRole} (${verifierRole})`;

    try {
      await pool.query(
        `UPDATE orders SET 
          escrow_status = ?,
          remaining_payment_status = ?,
          remaining_payment_verified_at = ?,
          remaining_payment_verified_by = ?
        WHERE id = ?`,
        [newStatus, remainingStatus, now, verifierInfo, id]
      );

      if (verifierRole === 'admin') {
        const [order] = await pool.query('SELECT product_id FROM orders WHERE id = ?', [id]);
        if (order.length > 0 && order[0].product_id) {
          await pool.query("UPDATE products SET status = 'completed' WHERE id = ?", [order[0].product_id]);
        }
      }
    } catch (dbErr) {
      console.warn('[DB Warning] verify-remaining update fallback:', dbErr.message);
      if (verifierRole === 'admin') {
        await pool.query("UPDATE orders SET escrow_status = 'completed' WHERE id = ?", [id]).catch(() => {});
      }
    }
    return res.json({ success: true, message: `Verifikasi pelunasan oleh ${verifierName || verifierRole} berhasil dicatat.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 8B. PENAWARAN HARGA & NOTIFIKASI TRANSAKSI
// =================================================================
app.get('/api/offers', async (req, res) => {
  try {
    const { buyerId, sellerId, status } = req.query;
    let sql = `SELECT o.*, p.title AS product_title, p.code AS product_code, p.seller_id,
      ub.name AS buyer_name, us.name AS seller_name
      FROM offers o JOIN products p ON p.id = o.product_id
      LEFT JOIN users ub ON ub.id = o.buyer_id LEFT JOIN users us ON us.id = p.seller_id WHERE 1=1`;
    const params = [];
    if (buyerId) { sql += ' AND o.buyer_id = ?'; params.push(buyerId); }
    if (sellerId) { sql += ' AND p.seller_id = ?'; params.push(sellerId); }
    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    sql += ' ORDER BY o.created_at DESC';
    const [offers] = await pool.query(sql, params);
    return res.json({ success: true, offers });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/offers', async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `OFF-${Date.now()}`;
    await pool.query(`INSERT INTO offers (id, product_id, buyer_id, offer_price, quantity, unit, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`, [id, data.productId, data.buyerId, Number(data.offerPrice), Number(data.quantity) || 1, data.unit || 'Kg', data.note || null]);
    return res.status(201).json({ success: true, offerId: id });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.patch('/api/offers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { sellerId, status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Status penawaran tidak valid.' });
    const [result] = await pool.query(`UPDATE offers
      SET status = ?
      WHERE id = ?
        AND status = 'pending'
        AND EXISTS (
          SELECT 1 FROM products p
          WHERE p.id = offers.product_id AND p.seller_id = ?
        )`, [status, id, sellerId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan atau sudah diproses.' });
    return res.json({ success: true, message: 'Status penawaran diperbarui.' });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    const [notifications] = await pool.query(`SELECT * FROM notifications ${userId ? 'WHERE user_id = ?' : ''} ORDER BY created_at DESC LIMIT 100`, userId ? [userId] : []);
    return res.json({ success: true, notifications });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const n = req.body;
    const id = n.id || `NTF-${Date.now()}`;
    await pool.query('INSERT INTO notifications (id, user_id, type, title, message, link, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, n.userId, n.type || 'info', n.title, n.message, n.link || null, n.isRead ? 1 : 0]);
    return res.status(201).json({ success: true, notificationId: id });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

// =================================================================
// 9. EVENT & AGENDA (EVENTS)
// =================================================================
app.get('/api/events', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM events';
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY event_date ASC';
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, count: rows.length, events: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `evt_${Date.now()}`;

    const sql = `
      INSERT INTO events (
        id, title, description, event_type, location, event_date,
        event_time, quota, registered, price, image, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(sql, [
      id,
      data.title || 'Event Baru',
      data.description || '',
      data.category || data.eventType || 'webinar',
      data.location || 'Online',
      data.date || data.eventDate || new Date().toISOString().split('T')[0],
      data.time || data.eventTime || '09:00 - 12:00 WIB',
      Number(data.quota) || 100,
      Number(data.registered) || 0,
      Number(data.price) || 0,
      data.image || null,
      data.status === 'published' ? 'aktif' : (data.status || 'aktif'),
      data.createdBy || 'user_admin_001'
    ]);

    return res.status(201).json({ success: true, eventId: id, message: 'Event berhasil ditambahkan.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const sql = `
      UPDATE events SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_type = COALESCE(?, event_type),
        location = COALESCE(?, location),
        event_date = COALESCE(?, event_date),
        event_time = COALESCE(?, event_time),
        quota = COALESCE(?, quota),
        price = COALESCE(?, price),
        image = COALESCE(?, image),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    await pool.query(sql, [
      data.title || null,
      data.description || null,
      data.category || data.eventType || null,
      data.location || null,
      data.date || data.eventDate || null,
      data.time || data.eventTime || null,
      data.quota ? Number(data.quota) : null,
      data.price !== undefined ? Number(data.price) : null,
      data.image || null,
      data.status === 'published' ? 'aktif' : (data.status || null),
      id
    ]);

    return res.json({ success: true, message: 'Event berhasil diperbarui.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Event berhasil dihapus.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 9B. MINAT, PESERTA, PENDAFTARAN, DAN PEMBAYARAN EVENT
// =================================================================
function validateEventParticipant(data) {
  const fullName = String(data.fullName || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const phone = String(data.phone || '').trim();
  const attendeeCount = Math.max(1, Math.min(20, Number.parseInt(data.attendeeCount, 10) || 1));
  if (!fullName || !email.includes('@') || !phone) return { error: 'Nama, email, dan nomor WhatsApp wajib diisi.' };
  return { fullName, email, phone, company: String(data.company || '').trim() || null, attendeeCount };
}

async function upsertEventParticipant(connection, participant) {
  const participantId = `EVP-${crypto.randomUUID()}`;
  await connection.query(
    `INSERT INTO event_participants (id, full_name, email, phone, company) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       phone = EXCLUDED.phone,
       company = EXCLUDED.company`,
    [participantId, participant.fullName, participant.email, participant.phone, participant.company]
  );
  const [rows] = await connection.query('SELECT id FROM event_participants WHERE email = ?', [participant.email]);
  return rows[0].id;
}

app.post('/api/events/:id/interests', async (req, res) => {
  const participant = validateEventParticipant(req.body);
  if (participant.error) return res.status(400).json({ success: false, message: participant.error });
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [events] = await connection.query('SELECT id, status FROM events WHERE id = ?', [req.params.id]);
      if (!events.length || !['aktif', 'published'].includes(events[0].status)) throw new Error('Event tidak tersedia.');
      const participantId = await upsertEventParticipant(connection, participant);
      const interestId = `EVI-${crypto.randomUUID()}`;
      await connection.query('INSERT INTO event_interests (id, event_id, participant_id, attendee_count, note) VALUES (?, ?, ?, ?, ?)', [interestId, req.params.id, participantId, participant.attendeeCount, String(req.body.note || '').trim() || null]);
      await connection.commit();
      return res.status(201).json({ success: true, interestId, message: 'Minat Anda sudah dicatat. Tim event akan menghubungi Anda.' });
    } catch (error) {
      await connection.rollback();
      return res.status(error.message === 'Event tidak tersedia.' ? 404 : 500).json({ success: false, message: error.message });
    } finally { connection.release(); }
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/events/:id/registrations', async (req, res) => {
  const participant = validateEventParticipant(req.body);
  if (participant.error) return res.status(400).json({ success: false, message: participant.error });
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [events] = await connection.query('SELECT id, title, price, quota, registered, status FROM events WHERE id = ? FOR UPDATE', [req.params.id]);
      const event = events[0];
      if (!event || !['aktif', 'published'].includes(event.status)) throw new Error('Event tidak tersedia untuk pendaftaran.');
      if (Number(event.registered) + participant.attendeeCount > Number(event.quota)) throw new Error('Kuota event tidak mencukupi untuk jumlah peserta yang dipilih.');
      const participantId = await upsertEventParticipant(connection, participant);
      const [existing] = await connection.query('SELECT id FROM event_registrations_v2 WHERE event_id = ? AND participant_id = ?', [event.id, participantId]);
      if (existing.length) throw new Error('Email ini sudah terdaftar pada event tersebut.');

      const registrationId = `EVR-${crypto.randomUUID()}`;
      const unitPrice = Number(event.price) || 0;
      const totalAmount = unitPrice * participant.attendeeCount;
      const isFree = totalAmount === 0;
      const paymentId = `EVPAY-${crypto.randomUUID()}`;
      await connection.query(`INSERT INTO event_registrations_v2
        (id, event_id, participant_id, attendee_count, unit_price, total_amount, registration_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [registrationId, event.id, participantId, participant.attendeeCount, unitPrice, totalAmount, isFree ? 'confirmed' : 'awaiting_payment']);
      await connection.query('INSERT INTO event_payments (id, registration_id, amount, payment_status, paid_at) VALUES (?, ?, ?, ?, ?)', [paymentId, registrationId, totalAmount, isFree ? 'paid' : 'pending', isFree ? new Date() : null]);
      await connection.query('UPDATE events SET registered = registered + ? WHERE id = ?', [participant.attendeeCount, event.id]);
      await connection.commit();
      return res.status(201).json({
        success: true, registrationId, paymentId, paymentRequired: !isFree, totalAmount,
        paymentInstructions: isFree ? null : { method: 'Transfer Bank', bank: 'BCA', accountName: 'PT Bursa Limbah Indonesia', accountNumber: '827199201122', amount: totalAmount },
        message: isFree ? 'Pendaftaran berhasil dikonfirmasi.' : 'Pendaftaran dibuat. Selesaikan pembayaran sesuai total tagihan.'
      });
    } catch (error) {
      await connection.rollback();
      const clientErrors = ['Event tidak tersedia untuk pendaftaran.', 'Kuota event tidak mencukupi untuk jumlah peserta yang dipilih.', 'Email ini sudah terdaftar pada event tersebut.'];
      return res.status(clientErrors.includes(error.message) ? 400 : 500).json({ success: false, message: error.message });
    } finally { connection.release(); }
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

app.post('/api/event-payments/:registrationId/submit', async (req, res) => {
  const reference = String(req.body.paymentReference || '').trim();
  if (!reference) return res.status(400).json({ success: false, message: 'Masukkan nomor referensi pembayaran.' });
  try {
    const [result] = await pool.query(`WITH updated_payment AS (
        UPDATE event_payments
        SET payment_reference = ?, payment_status = 'submitted', paid_at = CURRENT_TIMESTAMP
        WHERE registration_id = ? AND payment_status = 'pending'
        RETURNING registration_id
      )
      UPDATE event_registrations_v2 er
      SET registration_status = 'payment_review'
      FROM updated_payment up
      WHERE er.id = up.registration_id`, [reference, req.params.registrationId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan atau sudah diproses.' });
    return res.json({ success: true, message: 'Konfirmasi pembayaran diterima dan menunggu verifikasi admin.' });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
});

// =================================================================
// 10. CHAT LANGSUNG (CHATS)
// =================================================================
app.get('/api/chats', async (req, res) => {
  try {
    const { productId, buyerId, sellerId } = req.query;

    let sql = `
      SELECT m.*, r.product_id, r.buyer_id, r.seller_id,
             u.name AS sender_name, u.role AS sender_role
      FROM chat_messages m
      JOIN chat_rooms r ON m.room_id = r.id
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productId) { sql += ' AND r.product_id = ?'; params.push(productId); }
    if (buyerId) { sql += ' AND r.buyer_id = ?'; params.push(buyerId); }
    if (sellerId) { sql += ' AND r.seller_id = ?'; params.push(sellerId); }

    sql += ' ORDER BY m.created_at ASC';

    const [rows] = await pool.query(sql, params);
    const chats = rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      buyerId: r.buyer_id,
      sellerId: r.seller_id,
      senderName: r.sender_name || 'Pengguna',
      senderRole: r.sender_role || 'buyer',
      text: r.message,
      timestamp: new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      date: 'Hari Ini'
    }));

    return res.json({ success: true, count: chats.length, chats });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/chats', async (req, res) => {
  try {
    const { productId, sellerId, buyerId, senderRole, senderName, text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });

    const pId = productId || 'PRD-GENERAL';
    const sId = sellerId || 'user_seller_1';
    const bId = buyerId || 'user_buyer_1';

    // Cari atau buat chat room
    let [rooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE product_id = ? AND buyer_id = ? AND seller_id = ?',
      [pId, bId, sId]
    );

    let roomId;
    if (rooms.length === 0) {
      roomId = `room_${Date.now()}`;
      await pool.query(
        'INSERT INTO chat_rooms (id, buyer_id, seller_id, product_id) VALUES (?, ?, ?, ?)',
        [roomId, bId, sId, pId]
      );
    } else {
      roomId = rooms[0].id;
    }

    const msgId = `chat_${Date.now()}`;
    const senderId = (senderRole === 'seller') ? sId : bId;

    await pool.query(
      'INSERT INTO chat_messages (id, room_id, sender_id, message) VALUES (?, ?, ?, ?)',
      [msgId, roomId, senderId, text]
    );

    return res.status(201).json({
      success: true,
      chat: {
        id: msgId,
        productId: pId,
        sellerId: sId,
        buyerId: bId,
        senderRole: senderRole || 'buyer',
        senderName: senderName || 'Pengguna',
        text,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        date: 'Hari Ini'
      }
    });
  } catch (error) {
    console.error('[Chat Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 11. PENGATURAN SISTEM (SYSTEM SETTINGS)
// =================================================================
// Kurs USD/IDR diproksikan dari server agar ticker tidak bergantung pada CORS
// browser. Cache singkat menjaga API sumber dari request berulang.
app.get('/api/market-prices', async (_req, res) => {
  const now = Date.now();
  if (marketRateCache && now - marketRateCache.fetchedAt < MARKET_RATE_CACHE_MS) {
    return res.json({ success: true, ...marketRateCache.payload, cached: true });
  }

  try {
    const response = await fetch(MARKET_RATE_URL, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Market API merespons HTTP ${response.status}`);
    const data = await response.json();
    const usdIdr = Number(data?.rates?.IDR);
    if (!Number.isFinite(usdIdr) || usdIdr <= 0) throw new Error('Kurs IDR tidak tersedia dari Market API.');

    const payload = {
      source: 'ExchangeRate-API',
      updatedAt: data.time_last_update_utc || new Date().toISOString(),
      rates: { USD_IDR: Math.round(usdIdr) }
    };
    marketRateCache = { fetchedAt: now, payload };
    return res.json({ success: true, ...payload, cached: false });
  } catch (error) {
    if (marketRateCache) return res.json({ success: true, ...marketRateCache.payload, cached: true, stale: true });
    return res.status(502).json({ success: false, message: 'Market Price API tidak dapat dihubungi.', detail: error.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT setting_key, setting_value FROM system_settings');
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/settings', authenticate, requireRole('admin'), async (req, res) => {
  try {
      const entries = Object.entries(req.body);
      for (const [key, value] of entries) {
        await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value',
        [key, String(value)]
      );
    }
    return res.json({ success: true, message: 'Pengaturan sistem berhasil disimpan ke database.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 12. PENCADANGAN DATABASE & AUDIT LOGS (ADMIN ONLY)
// =================================================================
app.get('/api/admin/backups', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, backups: [] });
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stats.size,
          sizeKb: Math.round(stats.size / 1024),
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return res.json({ success: true, count: files.length, backups: files });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/backups', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const backupResult = await runBackup();
    await logAudit(null, 'manual_backup_created', 'database', backupResult.filename, {
      sizeBytes: backupResult.sizeBytes,
      tablesCount: backupResult.tablesCount
    }, req);

    return res.status(201).json({
      success: true,
      message: 'Pencadangan database berhasil dibuat.',
      backup: backupResult
    });
  } catch (error) {
    console.error('[Backup Error]', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat cadangan: ' + error.message });
  }
});

app.get('/api/admin/audit-logs', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
    return res.json({ success: true, count: rows.length, auditLogs: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// PENANGANAN ERROR UPLOAD
// =================================================================
app.use((error, _req, res, next) => {
  if (!(error instanceof multer.MulterError)) return next(error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Ukuran berkas maksimal 5 MB.' });
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Maksimal tiga gambar eviden dapat diunggah.' });
  }
  return res.status(400).json({
    success: false,
    message: 'Format berkas tidak didukung. Eviden harus JPG, PNG, atau WebP; dokumen identitas dapat berupa JPG, PNG, WebP, atau PDF.'
  });
});

// =================================================================
// SKEMA DATABASE AUTO-MIGRATION
// Migrasi dijalankan oleh server/database/migrate.js untuk PostgreSQL.
// =================================================================
async function ensureDatabaseSchema() {
  // Kept as a compatibility hook for callers outside server.js. The actual
  // idempotent migration is run immediately below via runMigrations().
  return true;
}

// =================================================================
// START SERVER & GRACEFUL SHUTDOWN
// =================================================================
const server = app.listen(PORT, async () => {
  console.log('=====================================================');
  console.log(`  Bursa Limbah Backend Server Aktif di Port ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  REST API siap: /api/auth, /api/products, /api/orders, /api/events, /api/chats`);
  console.log('=====================================================');
  const connected = await testConnection();
  if (connected) {
    await runMigrations().catch(err => console.warn('[Migration Auto-run Warning]', err.message));
  }
});

// Penanganan Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('\n[Shutdown] Menerima sinyal SIGTERM. Menutup server HTTP dan pool database...');
  server.close(async () => {
    await pool.end();
    console.log('[Shutdown] Server dan koneksi PostgreSQL ditutup bersih.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Menerima sinyal SIGINT (Ctrl+C). Menutup koneksi database...');
  server.close(async () => {
    await pool.end();
    console.log('[Shutdown] Server dan koneksi PostgreSQL ditutup bersih.');
    process.exit(0);
  });
});
