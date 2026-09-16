const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { pool, testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sajikan file statis frontend (root folder Bursa Limbah)
app.use(express.static(path.join(__dirname, '..')));

// Helper: Format data user dari DB agar cocok dengan struktur store.js
function mapUserFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    company: row.company || '',
    role: row.role,
    authProvider: row.auth_provider,
    subscriptionTier: row.subscription_tier,
    subscriptionActive: Boolean(row.subscription_active),
    subscriptionExpiry: row.subscription_expiry ? row.subscription_expiry.toISOString().split('T')[0] : null,
    identityVerified: Boolean(row.identity_verified),
    verificationStatus: row.verification_status,
    verificationType: row.verification_type,
    ktpNumber: row.ktp_number,
    npwpNumber: row.npwp_number,
    verifiedBadge: row.verified_badge,
    verifiedAt: row.verified_at,
    bankAccount: row.bank_account,
    location: row.location,
    balance: parseFloat(row.balance) || 0,
    avatar: row.avatar,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =================================================================
// 1. HEALTH CHECK & STATUS KONEKSI
// =================================================================
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS connected');
    return res.json({
      status: 'ok',
      database: 'connected',
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
// 2. PENDAFTARAN PENGGUNA BARU (SIGNUP)
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
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(rawPass, saltRounds);

    // 3. Tentukan default nilai berdasarkan role
    const newId = `user_${role}_${Date.now()}`;
    const cleanDigits = phone.replace(/[^0-9]/g, '');
    const defaultPhone = phone || `+62 812-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
    const displayPrefix = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    const finalName = name || (role === 'seller' ? `${displayPrefix} (Mitra Penjual)` : `${displayPrefix} (Pembeli)`);
    const finalCompany = company || (role === 'seller' ? `CV ${displayPrefix} Mandiri` : `PT ${displayPrefix} Daur Ulang`);

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const subscriptionExpiry = nextMonth.toISOString().split('T')[0];

    // 4. Simpan ke database MySQL
    const insertQuery = `
      INSERT INTO users (
        id, name, email, phone, company, role, password_hash, auth_provider,
        subscription_tier, subscription_active, subscription_expiry,
        identity_verified, verification_status, verified_badge,
        bank_account, location, balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, 1, ?, 0, 'unverified', ?, ?, ?, 0.00)
    `;

    const verifiedBadge = role === 'seller' ? 'Pemasok Baru' : 'Pembeli Terdaftar';

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

    // 5. Ambil data user yang baru dibuat
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
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat pendaftaran: ' + error.message
    });
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

    // 1. Cari pengguna berdasarkan email ATAU nomor telepon
    let query = 'SELECT * FROM users WHERE LOWER(email) = ?';
    let params = [cleanId];

    if (cleanDigits.length >= 7) {
      query += ' OR REPLACE(REPLACE(phone, "-", ""), " ", "") LIKE ?';
      params.push(`%${cleanDigits}%`);
    }

    const [users] = await pool.query(query, params);

    // 2. Jika akun belum ditemukan: Auto-register jika format email valid
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
        message: 'Akun tidak ditemukan. Masukkan alamat email yang valid untuk login/daftar otomatis.'
      });
    }

    const userRecord = users[0];

    // 3. Validasi kesesuaian peran (Role Check)
    if (expectedRole && userRecord.role !== expectedRole) {
      const roleLabel = userRecord.role === 'buyer' ? 'Pembeli' : (userRecord.role === 'seller' ? 'Penjual' : 'Pengelola');
      return res.status(403).json({
        success: false,
        message: `Akun ini terdaftar sebagai ${roleLabel}. Silakan masuk melalui tab ${roleLabel}.`
      });
    }

    // 4. Verifikasi kata sandi
    let passwordMatch = false;
    if (userRecord.password_hash) {
      // Coba verifikasi dengan bcrypt
      if (userRecord.password_hash.startsWith('$2')) {
        passwordMatch = [REDACTED]
      } else {
        // Fallback jika plain text
        passwordMatch = [REDACTED]
      }
    } else {
      passwordMatch = [REDACTED]
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Kata sandi yang Anda masukkan salah. Kata sandi bawaan akun demo: [REDACTED].'
      });
    }

    // 5. Sukses masuk
    const authenticatedUser = mapUserFromDb(userRecord);
    return res.json({
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
      message: `Selamat datang kembali, ${authenticatedUser.name}!`
    });

  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server saat login: ' + error.message
    });
  }
});

// =================================================================
// 4. LOGIN & SIGNUP GOOGLE OAUTH
// =================================================================
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, avatar, role = 'buyer' } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email Google tidak valid.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek apakah akun sudah ada
    const [existing] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    if (existing.length > 0) {
      const user = mapUserFromDb(existing[0]);
      return res.json({
        success: true,
        user,
        role: user.role,
        isNewAccount: false
      });
    }

    // Buat akun baru via Google
    const newId = `user_${role}_${Date.now()}`;
    const displayName = name || cleanEmail.split('@')[0];
    const dummyPhone = `+62 812-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const company = role === 'seller' ? `CV ${displayName} Sentra` : `PT ${displayName} Daur Ulang`;
    const passwordHash = await bcrypt.hash('[REDACTED]_' + Date.now(), 10);

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
      newId,
      displayName,
      cleanEmail,
      dummyPhone,
      company,
      role,
      passwordHash,
      subExpiry,
      role === 'seller' ? 'Mitra Google' : 'Pembeli Google',
      avatar || null
    ]);

    const [newRows] = await pool.query('SELECT * FROM users WHERE id = ?', [newId]);
    const newUser = mapUserFromDb(newRows[0]);

    return res.status(201).json({
      success: true,
      user: newUser,
      role: newUser.role,
      isNewAccount: true
    });

  } catch (error) {
    console.error('[Google Auth Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal autentikasi Google: ' + error.message
    });
  }
});

// =================================================================
// 5. UPDATE PROFIL PENGGUNA
// =================================================================
app.put('/api/users/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, phone, location, bankAccount, avatar, nib } = req.body;

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
    const updatedUser = mapUserFromDb(updatedRows[0]);

    return res.json({
      success: true,
      user: updatedUser,
      message: 'Profil berhasil diperbarui.'
    });

  } catch (error) {
    console.error('[Profile Update Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =================================================================
// 6. VERIFIKASI IDENTITAS (KTP / NPWP)
// =================================================================
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

    await pool.query(query, [
      type || 'ktp',
      ktpNumber || null,
      npwpNumber || null,
      docUrl || null,
      verifiedBadge,
      verifiedAt,
      id
    ]);

    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const updatedUser = mapUserFromDb(updatedRows[0]);

    return res.json({
      success: true,
      user: updatedUser,
      message: 'Identitas berhasil diverifikasi.'
    });

  } catch (error) {
    console.error('[Verification Error]', error);
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
  console.log(`  API Endpoint: http://localhost:${PORT}/api/auth/*`);
  console.log('=====================================================');
  await testConnection();
});
