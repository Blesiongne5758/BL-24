const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Sajikan file statis frontend (root folder Bursa Limbah)
app.use(express.static(path.join(__dirname, '..')));

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
    evidences: images.map(img => img.image_url || img),
    createdAt: row.created_at ? new Date(row.created_at).toISOString().replace('T', ' ').substring(0, 16) : ''
  };
}

// =================================================================
// 1. HEALTH CHECK & STATUS KONEKSI
// =================================================================
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS connected, VERSION() AS version');
    return res.json({
      status: 'ok',
      database: 'connected',
      version: rows[0].version,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
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
      tierId = 'tier_starter'
    } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Alamat email tidak valid.' });
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
    const rawPass = [REDACTED] '[REDACTED]';
    const passwordHash = await bcrypt.hash(rawPass, 10);

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

    // 4. Simpan ke database MySQL
    const insertQuery = `
      INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, 1, ?, 0, 'unverified', ?, ?, ?, 0.00)
    `;

    await pool.query(insertQuery, [
      newId,
      finalName,
      cleanEmail,
      defaultPhone,
      finalCompany,
      role,
      passwordHash,
      tierId,
      subscriptionExpiry,
      verifiedBadge,
      bankAccount,
      location
    ]);

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
    const newUser = mapUserFromDb(rows[0]);

    return res.status(201).json({
      success: true,
      user: newUser,
      role: newUser.role,
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

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Harap masukkan email atau nomor WhatsApp.' });
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
        const rawPass = [REDACTED] '[REDACTED]';
        const passwordHash = await bcrypt.hash(rawPass, 10);
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

        return res.json({
          success: true,
          user: newUser,
          role: newUser.role,
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
    if (userRecord.password_hash) {
      if (userRecord.password_hash.startsWith('$2')) {
        passwordMatch = [REDACTED]
      } else {
        passwordMatch = [REDACTED]
      }
    } else {
      passwordMatch = [REDACTED]
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kata sandi salah. Kata sandi default akun demo: [REDACTED].'
      });
    }

    const authenticatedUser = mapUserFromDb(userRecord);
    return res.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
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
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, avatar, role = 'buyer' } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email Google tidak valid.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (existing.length > 0) {
      const user = mapUserFromDb(existing[0]);
      return res.json({ success: true, user, role: user.role, isNewAccount: false });
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

    return res.status(201).json({ success: true, user: newUser, role: newUser.role, isNewAccount: true });
  } catch (error) {
    console.error('[Google Auth Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
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

app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, location, bankAccount, avatar } = req.body;

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

app.post('/api/users/:id/verify', async (req, res) => {
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
// 6. MASTER KATEGORI (CATEGORIES)
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
// 7. PRODUK & LISTING LIMBAH (PRODUCTS)
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

app.post('/api/products', async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || `PRD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const code = data.code || `CIR-${data.categoryCode || 'WST'}-${Math.floor(10 + Math.random() * 90)}`;
    const status = data.status || 'pending';

    // Pastikan seller_id ada di database, jika belum buatkan placeholder
    if (data.sellerId) {
      const [uCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.sellerId]);
      if (uCheck.length === 0) {
        await pool.query(
          'INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)',
          [data.sellerId, data.sellerName || 'Penjual Mitra', `${data.sellerId}@bursalimbah.id`, 'seller', '[REDACTED]']
        );
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
        const imgUrl = typeof data.evidences[i] === 'string' ? data.evidences[i] : (data.evidences[i].url || '');
        if (imgUrl) {
          await pool.query(
            'INSERT INTO product_images (id, product_id, image_url, is_evidence) VALUES (?, ?, ?, 1)',
            [`IMG-${id}-${i + 1}`, id, imgUrl]
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

app.patch('/api/products/:id/status', async (req, res) => {
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

app.delete('/api/products/:id', async (req, res) => {
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

app.post('/api/orders', async (req, res) => {
  try {
    const data = req.body;
    const orderId = data.id || `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderCode = data.bookingCode || `CIR-BK-${Math.floor(1000 + Math.random() * 9000)}`;

    // Pastikan buyer dan seller terdaftar di tabel users
    if (data.buyerId) {
      const [bCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.buyerId]);
      if (bCheck.length === 0) {
        await pool.query(
          'INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)',
          [data.buyerId, data.buyerName || 'Pembeli', `${data.buyerId}@bursalimbah.id`, 'buyer', '[REDACTED]']
        );
      }
    }
    if (data.sellerId) {
      const [sCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [data.sellerId]);
      if (sCheck.length === 0) {
        await pool.query(
          'INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)',
          [data.sellerId, data.sellerName || 'Penjual', `${data.sellerId}@bursalimbah.id`, 'seller', '[REDACTED]']
        );
      }
    }

    const insertSql = `
      INSERT INTO orders (
        id, order_code, product_id, buyer_id, buyer_company, seller_id,
        total_amount, dp_percentage, dp_amount, remaining_amount,
        handling_fee, escrow_status, pickup_date, notes, shipping_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertSql, [
      orderId,
      orderCode,
      data.productId,
      data.buyerId,
      data.buyerCompany || data.buyerName || 'Perusahaan Pembeli',
      data.sellerId,
      Number(data.totalPrice || data.totalAmount) || 0,
      Number(data.downPaymentRate || data.dpPercentage) || 0,
      Number(data.downPaymentAmount || data.dpAmount) || 0,
      Number(data.remainingPayment || data.remainingAmount) || 0,
      Number(data.handlingFee) || 10000,
      data.escrowStatus || (data.downPaymentAmount > 0 ? 'dp_secured' : 'pending_dp'),
      data.pickupDate || null,
      data.notes || '',
      data.shippingMethod || 'Armada Mandiri Pembeli'
    ]);

    // Update status produk menjadi 'booked'
    if (data.productId) {
      await pool.query('UPDATE products SET status = \'booked\' WHERE id = ?', [data.productId]);
    }

    return res.status(201).json({
      success: true,
      orderId,
      orderCode,
      message: 'Booking berhasil disimpan ke database.'
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
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
      data.status || 'aktif',
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
      data.status || null,
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

app.put('/api/settings', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await pool.query(
        'INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [key, String(value)]
      );
    }
    return res.json({ success: true, message: 'Pengaturan sistem berhasil disimpan ke database.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// START SERVER
// =================================================================
app.listen(PORT, async () => {
  console.log('=====================================================');
  console.log(`  Bursa Limbah Backend Server Aktif di Port ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  REST API siap: /api/auth, /api/products, /api/orders, /api/events, /api/chats`);
  console.log('=====================================================');
  await testConnection();
});
