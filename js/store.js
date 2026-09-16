/**
 * BURSA LIMBAH Store & State Management (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontrol Admin Rentang Harga & Chat Interaktif
 */

const STORAGE_KEY = "bursalimbah_state_v3";

class BursaLimbahStore {
  constructor() {
    this.apiBaseUrl = this.detectApiBaseUrl();
    this.isBackendConnected = false;
    this.initStore();
    this.checkBackendHealth();
  }

  detectApiBaseUrl() {
    if (typeof window === 'undefined') return 'http://localhost:5000';
    if (window.location.port === '5000' || (window.location.protocol.startsWith('http') && window.location.pathname.includes('/bursalimbah'))) {
      return '';
    }
    return 'http://localhost:5000';
  }

  async checkBackendHealth() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        this.isBackendConnected = (data.database === 'connected');
        console.log('[BursaLimbah Store] Terhubung ke MySQL Backend API:', data);
      }
    } catch (e) {
      this.isBackendConnected = false;
    }
  }

  initStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.state = {
        categories: [...INITIAL_CATEGORIES],
        products: [...INITIAL_PRODUCTS],
        orders: [...INITIAL_ORDERS],
        users: [...INITIAL_USERS],
        settings: { ...INITIAL_SETTINGS },
        buyerRequests: [...INITIAL_BUYER_REQUESTS],
        chats: [...INITIAL_CHATS],
        currentRole: "public", // 'public', 'buyer', 'seller', 'admin'
        activeUserId: null,
        sellerUserId: null,
        adminUserId: null,
        authenticatedBuyerId: null,
        authenticatedSellerId: null
      };
      this.save();
    } else {
      try {
        this.state = JSON.parse(raw);
        if (!this.state.settings) {
          this.state.settings = { ...INITIAL_SETTINGS };
        } else {
          this.state.settings = { ...INITIAL_SETTINGS, ...this.state.settings };
        }
        if (!this.state.settings.subscriptionTiers || this.state.settings.subscriptionTiers.length === 0) {
          this.state.settings.subscriptionTiers = [...INITIAL_SUBSCRIPTION_TIERS];
        } else {
          // Sinkronisasi pembaruan Tier Gratis (Rp 1 - Rp 200.000)
          const starterTier = this.state.settings.subscriptionTiers.find(t => t.id === 'tier_starter');
          if (starterTier) {
            starterTier.name = "Paket Gratis (Starter)";
            starterTier.badge = "Gratis Rp 0";
            starterTier.monthlyFee = 0;
            starterTier.minPriceLimit = 1;
            starterTier.maxPriceLimit = 200000;
            starterTier.tagline = "Gratis — Harga Penawaran Rp 1 s/d Rp 200.000";
            starterTier.description = "Khusus pembeli pemula & UMKM, membuka akses harga penawaran Rp 1 hingga Rp 200.000.";
            starterTier.isFree = true;
          }
        }
        if (!this.state.users) this.state.users = [...INITIAL_USERS];
        // Pastikan akun demo user_buyer_free terdaftar di users
        if (!this.state.users.some(u => u.id === 'user_buyer_free')) {
          const freeSeed = INITIAL_USERS.find(u => u.id === 'user_buyer_free');
          if (freeSeed) this.state.users.push(freeSeed);
        }

        if (!this.state.categories || this.state.categories.length === 0) {
          this.state.categories = [...INITIAL_CATEGORIES];
        }
        if (!this.state.buyerRequests || this.state.buyerRequests.length === 0) {
          this.state.buyerRequests = [...INITIAL_BUYER_REQUESTS];
        }
        if (!this.state.chats || this.state.chats.length === 0) {
          this.state.chats = [...INITIAL_CHATS];
        }

        // Keamanan: Jika peran saat ini memerlukan login namun belum ada sesi valid, kembalikan ke public
        if (this.state.currentRole === "admin" && !this.isAdminAuthenticated()) {
          this.state.currentRole = "public";
        }
        if (this.state.currentRole === "buyer" && !this.isBuyerAuthenticated()) {
          this.state.currentRole = "public";
        }
        if (this.state.currentRole === "seller" && !this.isSellerAuthenticated()) {
          this.state.currentRole = "public";
        }

        // Pastikan produk baru berharga Rp 1 - Rp 200.000 ikut tersinkronisasi
        INITIAL_PRODUCTS.forEach(ip => {
          if (!this.state.products.some(p => p.id === ip.id)) {
            this.state.products.push({ ...ip });
          }
        });

        // Sinkronisasi dan pastikan properti 'city' terisi pada seluruh produk & permintaan
        if (this.state.products && this.state.products.length > 0) {
          this.state.products.forEach(p => {
            if (!p.city) {
              const seed = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
              p.city = (seed && seed.city) ? seed.city : this.extractCity(p.address || p.origin);
            }
          });
        }
        if (this.state.buyerRequests && this.state.buyerRequests.length > 0) {
          this.state.buyerRequests.forEach(r => {
            if (!r.city) {
              const seed = INITIAL_BUYER_REQUESTS.find(ir => ir.id === r.id);
              r.city = (seed && seed.city) ? seed.city : this.extractCity(r.address);
            }
          });
        }
      } catch (e) {
        console.error("Error parsing local state, resetting to seed data", e);
        localStorage.removeItem(STORAGE_KEY);
        this.initStore();
      }
    }
  }

  extractCity(addressText = "") {
    if (!addressText) return "Indonesia";
    const knownCities = [
      "Jakarta Selatan", "Jakarta Timur", "Jakarta Barat", "Jakarta Pusat", "Jakarta Utara",
      "Karawang Barat", "Karawang Timur", "Karawang",
      "Kota Tangerang", "Tangerang Selatan", "Tangerang",
      "Cikarang Pusat", "Cikarang Barat", "Cikarang Timur", "Cikarang",
      "Bekasi", "Cilegon", "Surabaya", "Bandung", "Semarang", "Medan", "Bogor", "Depok", "Gresik", "Sidoarjo"
    ];
    for (const c of knownCities) {
      if (addressText.toLowerCase().includes(c.toLowerCase())) return c;
    }
    const parts = addressText.split(",");
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return addressText.trim() || "Indonesia";
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("BURSA LIMBAH_state_v1");
    localStorage.removeItem("BURSA LIMBAH_state_v2");
    this.initStore();
  }

  // ================= ROLE & SESSION MANAGEMENT =================
  getCurrentRole() {
    return this.state.currentRole || "public";
  }

  setCurrentRole(role) {
    this.state.currentRole = role;
    this.save();
  }

  getCurrentUser() {
    const role = this.getCurrentRole();
    if (role === "buyer") {
      const buyerId = this.state.authenticatedBuyerId || this.state.activeUserId;
      if (buyerId) {
        return this.state.users.find(u => u.id === buyerId && u.role === "buyer") || null;
      }
      return null;
    } else if (role === "seller") {
      const sellerId = this.state.authenticatedSellerId || this.state.sellerUserId;
      if (sellerId) {
        return this.state.users.find(u => u.id === sellerId && u.role === "seller") || null;
      }
      return null;
    } else if (role === "admin") {
      if (this.state.adminUserId) {
        return this.state.users.find(u => u.id === this.state.adminUserId && u.role === "admin") || null;
      }
      return null;
    }
    return null;
  }

  isBuyerAuthenticated() {
    const buyerId = this.state.authenticatedBuyerId;
    if (!buyerId) return false;
    const buyerUser = (this.state.users || []).find(u => u.id === buyerId && u.role === "buyer");
    return !!buyerUser;
  }

  isSellerAuthenticated() {
    const sellerId = this.state.authenticatedSellerId;
    if (!sellerId) return false;
    const sellerUser = (this.state.users || []).find(u => u.id === sellerId && u.role === "seller");
    return !!sellerUser;
  }

  isAdminAuthenticated() {
    if (!this.state.adminUserId) return false;
    const adminUser = (this.state.users || []).find(u => u.id === this.state.adminUserId && u.role === "admin");
    return !!adminUser;
  }

  getUsersByRole(role) {
    return (this.state.users || []).filter(u => u.role === role);
  }

  loginUser(identifier, password, expectedRole = null) {
    const cleanId = (identifier || "").trim().toLowerCase();
    const cleanDigits = cleanId.replace(/[^0-9]/g, "");

    const user = this.state.users.find(u => {
      const emailMatch = u.email && u.email.toLowerCase() === cleanId;
      const phoneMatch = cleanDigits && u.phone && u.phone.replace(/[^0-9]/g, "") === cleanDigits;
      return emailMatch || phoneMatch;
    });

    if (!user) {
      // Jika pengguna memasukkan format email yang valid, sediakan akses login instan sesuai tab peran (pembeli/penjual)
      if (cleanId.includes("@") && cleanId.includes(".")) {
        const role = expectedRole || "buyer";
        const emailName = cleanId.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").trim();
        const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);

        let newUser;
        if (role === "seller") {
          newUser = this.registerSeller({
            name: `${displayName} (Mitra Penjual)`,
            email: cleanId,
            phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
            company: `CV ${displayName} Mandiri`,
            password: [REDACTED]
          });
        } else {
          newUser = this.registerBuyer({
            name: `${displayName} (Pembeli)`,
            email: cleanId,
            phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
            company: `PT ${displayName} Daur Ulang`,
            tierId: "tier_starter", // Otomatis akun Pembeli Tier Gratis (Rp 1 - Rp 200.000)
            password: [REDACTED]
          });
        }
        return {
          success: true,
          user: newUser,
          role: newUser.role,
          isNewAccount: true
        };
      }

      return {
        success: false,
        message: "Akun tidak ditemukan. Silakan masukkan alamat email yang valid (contoh: nama@perusahaan.com) untuk masuk."
      };
    }

    if (expectedRole && user.role !== expectedRole) {
      const roleLabel = user.role === "buyer" ? "Pembeli" : (user.role === "seller" ? "Penjual" : "Pengelola");
      return {
        success: false,
        message: `Akun ini terdaftar sebagai ${roleLabel}. Silakan masuk melalui tab login ${roleLabel}.`
      };
    }

    // Periksa password
    const userPass = user.[REDACTED] "[REDACTED]";
    if (password && password !== userPass) {
      return {
        success: false,
        message: "Kata sandi yang Anda masukkan salah. Silakan coba lagi atau gunakan tombol Akun Demo."
      };
    }

    // Aktifkan sesi pengguna
    if (user.role === "buyer") {
      this.state.activeUserId = user.id;
      this.state.authenticatedBuyerId = user.id;
      this.state.currentRole = "buyer";
    } else if (user.role === "seller") {
      this.state.sellerUserId = user.id;
      this.state.authenticatedSellerId = user.id;
      this.state.currentRole = "seller";
    } else if (user.role === "admin") {
      this.state.adminUserId = user.id;
      this.state.currentRole = "admin";
    }

    this.save();
    return {
      success: true,
      user,
      role: user.role
    };
  }

  // ================= MYSQL BACKEND INTEGRATION (ASYNC) =================
  async loginUserAsync(identifier, password, expectedRole = null) {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role: expectedRole })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const user = data.user;
        const existingIdx = this.state.users.findIndex(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (existingIdx !== -1) {
          this.state.users[existingIdx] = { ...this.state.users[existingIdx], ...user };
        } else {
          this.state.users.push(user);
        }

        if (user.role === "buyer") {
          this.state.activeUserId = user.id;
          this.state.authenticatedBuyerId = user.id;
          this.state.currentRole = "buyer";
        } else if (user.role === "seller") {
          this.state.sellerUserId = user.id;
          this.state.authenticatedSellerId = user.id;
          this.state.currentRole = "seller";
        } else if (user.role === "admin") {
          this.state.adminUserId = user.id;
          this.state.currentRole = "admin";
        }

        this.save();
        return {
          success: true,
          user,
          role: user.role,
          isNewAccount: Boolean(data.isNewAccount),
          source: 'mysql'
        };
      } else if (res.status === 401 || res.status === 403 || res.status === 409 || res.status === 400) {
        return {
          success: false,
          message: data.message || "Email atau kata sandi tidak valid."
        };
      }
    } catch (netErr) {
      console.warn('[Store] Server MySQL offline, fallback ke penyimpanan lokal:', netErr.message);
    }

    const localRes = this.loginUser(identifier, password, expectedRole);
    localRes.source = 'local';
    return localRes;
  }

  async registerSellerAsync(sellerData) {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sellerData, role: 'seller' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user = data.user;
        const existingIdx = this.state.users.findIndex(u => u.id === user.id);
        if (existingIdx !== -1) {
          this.state.users[existingIdx] = user;
        } else {
          this.state.users.push(user);
        }
        this.state.sellerUserId = user.id;
        this.state.authenticatedSellerId = user.id;
        this.state.currentRole = "seller";
        this.save();
        return { success: true, user, isNewAccount: true, source: 'mysql' };
      } else if (data.message) {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.warn('[Store] Gagal register ke MySQL backend, fallback ke lokal:', err.message);
    }

    const newUser = this.registerSeller(sellerData);
    return { success: true, user: newUser, isNewAccount: true, source: 'local' };
  }

  async registerBuyerAsync(buyerData) {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buyerData, role: 'buyer' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user = data.user;
        const existingIdx = this.state.users.findIndex(u => u.id === user.id);
        if (existingIdx !== -1) {
          this.state.users[existingIdx] = user;
        } else {
          this.state.users.push(user);
        }
        this.state.activeUserId = user.id;
        this.state.authenticatedBuyerId = user.id;
        this.state.currentRole = "buyer";
        this.save();
        return { success: true, user, isNewAccount: true, source: 'mysql' };
      } else if (data.message) {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.warn('[Store] Gagal register buyer ke MySQL, fallback ke lokal:', err.message);
    }

    const newUser = this.registerBuyer(buyerData);
    return { success: true, user: newUser, isNewAccount: true, source: 'local' };
  }

  async loginWithGoogleAsync({ email, name, avatar, role = 'buyer' }) {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, avatar, role })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const user = data.user;
        const existingIdx = this.state.users.findIndex(u => u.id === user.id || (u.email && u.email.toLowerCase() === user.email.toLowerCase()));
        if (existingIdx !== -1) {
          this.state.users[existingIdx] = { ...this.state.users[existingIdx], ...user };
        } else {
          this.state.users.push(user);
        }
        if (user.role === 'buyer') {
          this.state.activeUserId = user.id;
          this.state.authenticatedBuyerId = user.id;
          this.state.currentRole = 'buyer';
        } else if (user.role === 'seller') {
          this.state.sellerUserId = user.id;
          this.state.authenticatedSellerId = user.id;
          this.state.currentRole = 'seller';
        } else if (user.role === 'admin') {
          this.state.adminUserId = user.id;
          this.state.currentRole = 'admin';
        }
        this.save();
        return {
          success: true,
          user,
          role: user.role,
          isNewAccount: Boolean(data.isNewAccount),
          source: 'mysql'
        };
      }
    } catch (err) {
      console.warn('[Store] Backend MySQL offline untuk Google Auth, fallback lokal');
    }

    const localRes = this.loginWithGoogle({ email, name, avatar, role });
    localRes.source = 'local';
    return localRes;
  }

  loginWithGoogle({ email, name, avatar, role = 'buyer' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    let user = this.state.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    let isNew = false;
    if (!user) {
      isNew = true;
      const displayName = name || (cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' '));
      if (role === 'seller') {
        user = this.registerSeller({
          name: `${displayName} (Mitra Penjual)`,
          email: cleanEmail,
          phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
          company: `CV ${displayName} Sentra`,
          password: [REDACTED]
        });
      } else {
        user = this.registerBuyer({
          name: `${displayName} (Pembeli)`,
          email: cleanEmail,
          phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
          company: `PT ${displayName} Daur Ulang`,
          tierId: "tier_starter",
          password: [REDACTED]
        });
      }
    }

    // Tandai akun Google
    user.authProvider = 'google';
    user.emailVerified = true;
    if (avatar) user.avatar = avatar;

    // Aktifkan sesi pengguna
    if (user.role === 'buyer') {
      this.state.activeUserId = user.id;
      this.state.authenticatedBuyerId = user.id;
      this.state.currentRole = 'buyer';
    } else if (user.role === 'seller') {
      this.state.sellerUserId = user.id;
      this.state.authenticatedSellerId = user.id;
      this.state.currentRole = 'seller';
    } else if (user.role === 'admin') {
      this.state.adminUserId = user.id;
      this.state.currentRole = 'admin';
    }

    this.save();
    return {
      success: true,
      user,
      role: user.role,
      isNewAccount: isNew
    };
  }

  updateUserProfile(userId, data = {}) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) throw new Error("Pengguna tidak ditemukan.");

    if (data.name) user.name = data.name;
    if (data.company) user.company = data.company;
    if (data.phone) user.phone = data.phone;
    if (data.location) user.location = data.location;
    if (data.bankAccount) user.bankAccount = data.bankAccount;
    if (data.avatar) user.avatar = data.avatar;
    if (data.nib) user.nib = data.nib;

    this.save();
    return user;
  }

  submitUserVerification(userId, verificationData = {}) {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) throw new Error("Pengguna tidak ditemukan.");

    const { type, ktpNumber, npwpNumber, docUrl } = verificationData;

    user.verificationType = type || 'ktp';
    if (ktpNumber) user.ktpNumber = ktpNumber;
    if (npwpNumber) user.npwpNumber = npwpNumber;
    if (docUrl) user.verificationDocUrl = docUrl;

    // Otomatis verifikasi dengan badge resmi
    user.identityVerified = true;
    user.verificationStatus = 'verified';
    user.verifiedAt = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    user.verifiedBadge = (type === 'npwp' || (ktpNumber && npwpNumber)) 
      ? 'Mitra Terverifikasi (KTP/NPWP)' 
      : 'Mitra Terverifikasi (KTP)';

    this.save();
    return user;
  }

  logout() {
    this.state.currentRole = "public";
    this.state.adminUserId = null;
    this.state.authenticatedBuyerId = null;
    this.state.authenticatedSellerId = null;
    this.state.activeUserId = null;
    this.state.sellerUserId = null;
    this.save();
  }

  // ================= 3-TIER SUBSCRIPTION MANAGEMENT =================
  getSubscriptionTiers() {
    if (!this.state.settings.subscriptionTiers || this.state.settings.subscriptionTiers.length === 0) {
      this.state.settings.subscriptionTiers = [...INITIAL_SUBSCRIPTION_TIERS];
      this.save();
    }
    return this.state.settings.subscriptionTiers;
  }

  getSubscriptionTierById(tierId) {
    const tiers = this.getSubscriptionTiers();
    return tiers.find(t => t.id === tierId) || tiers[0];
  }

  updateSubscriptionTier(tierId, updatedData) {
    const tiers = this.getSubscriptionTiers();
    const index = tiers.findIndex(t => t.id === tierId);
    if (index !== -1) {
      tiers[index] = { ...tiers[index], ...updatedData };
      this.state.settings.subscriptionTiers = tiers;
      this.save();
      return tiers[index];
    }
    return null;
  }

  getUserSubscriptionTier(user) {
    const u = user || this.getCurrentUser();
    if (!u || u.role !== "buyer") return null;
    const tierId = u.subscriptionTier || "tier_starter";
    return this.getSubscriptionTierById(tierId);
  }

  toggleBuyerSubscription(buyerId, targetTierId = null) {
    const user = this.state.users.find(u => u.id === (buyerId || this.state.activeUserId));
    if (user) {
      user.subscriptionActive = !user.subscriptionActive;
      if (targetTierId) {
        user.subscriptionTier = targetTierId;
      }
      if (user.subscriptionActive) {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        user.subscriptionExpiry = nextMonth.toISOString().split("T")[0];
      } else {
        user.subscriptionExpiry = null;
      }
      this.save();
      return user;
    }
    return null;
  }

  setBuyerTier(buyerId, tierId) {
    const user = this.state.users.find(u => u.id === (buyerId || this.state.activeUserId));
    if (user) {
      user.subscriptionTier = tierId;
      user.subscriptionActive = true;
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      user.subscriptionExpiry = nextMonth.toISOString().split("T")[0];
      this.save();
      return user;
    }
    return null;
  }

  registerBuyer({ name, email, phone, company, tierId, password }) {
    const newId = "user_buyer_" + Date.now();
    const chosenTierId = tierId || "tier_starter";
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const newUser = {
      id: newId,
      name: name || "Pembeli Baru Bursa Limbah",
      role: "buyer",
      email: email || `buyer_${Date.now()}@bursalimbah.id`,
      phone: phone || "+62 812-0000-0000",
      company: company || "Perusahaan Pembeli",
      location: "Indonesia",
      subscriptionActive: true,
      subscriptionTier: chosenTierId,
      subscriptionExpiry: nextMonth.toISOString().split("T")[0],
      password: [REDACTED]
    };

    this.state.users.push(newUser);
    this.state.activeUserId = newId;
    this.state.authenticatedBuyerId = newId;
    this.state.currentRole = "buyer";
    this.save();
    return newUser;
  }

  registerSeller({ name, email, phone, company, location, bankAccount, password }) {
    const newId = "user_seller_" + Date.now();
    const newUser = {
      id: newId,
      name: name || "Penjual Baru Bursa Limbah",
      role: "seller",
      email: email || `seller_${Date.now()}@bursalimbah.id`,
      phone: phone || "+62 813-0000-0000",
      company: company || name || "Pemasok Limbah Mandiri",
      identityVerified: false,
      verifiedBadge: "Pemasok Baru",
      location: location || "Indonesia",
      bankAccount: bankAccount || "-",
      balance: 0,
      password: [REDACTED]
    };

    this.state.users.push(newUser);
    this.state.sellerUserId = newId;
    this.state.authenticatedSellerId = newId;
    this.state.currentRole = "seller";
    this.save();
    return newUser;
  }

  // ================= GATED DATA ACCESS CONTROLLER =================
  /**
   * Menilai hak akses melihat Harga, Alamat, GPS Map, Nomor WA, dan Chat
   * Mengikuti aturan:
   * 1. Public: Seluruh Harga, Alamat, GPS Map, Nomor WA disembunyikan
   * 2. Pembeli Tanpa Langganan: Seluruh Harga, Alamat, GPS, WA disembunyikan (arahkan langganan)
   * 3. Pembeli Berlangganan (Sesuai Tier):
   *    - Harga: Tampil jika totalPrice <= tier.maxPriceLimit (atau maxPriceLimit === 0 / Unlimited)
   *    - Alamat: Tampil jika allowAddress === 'full'
   *    - GPS Map: Tampil jika allowGpsMap === true
   *    - WhatsApp: Tampil jika allowWhatsapp === true (Tier Enterprise)
   *    - Chat: Selalu tampil untuk mengirim pesan ke penjual
   * 4. Admin / Penjual sendiri: Akses penuh
   */
  checkProductAccess(product, currentUser = null, currentRole = null) {
    const role = currentRole || this.getCurrentRole();
    const user = currentUser || this.getCurrentUser();

    // Skenario 1: Halaman Publik (Tamu)
    if (role === "public" || !user) {
      return {
        isPublic: true,
        canViewPrice: false,
        priceBlockReason: "public",
        canViewFullAddress: false,
        canViewGpsMap: false,
        canViewWhatsapp: false,
        canChat: false,
        tier: null
      };
    }

    // Skenario 2: Admin memiliki akses penuh
    if (role === "admin") {
      return {
        isPublic: false,
        canViewPrice: true,
        priceBlockReason: null,
        canViewFullAddress: true,
        canViewGpsMap: true,
        canViewWhatsapp: true,
        canChat: true,
        tier: { name: "Administrator Utama", maxPriceLimit: 0 }
      };
    }

    // Skenario 3: Penjual
    if (role === "seller") {
      const isOwner = product.sellerId === user.id;
      return {
        isPublic: false,
        canViewPrice: true,
        priceBlockReason: null,
        canViewFullAddress: true,
        canViewGpsMap: true,
        canViewWhatsapp: isOwner,
        canChat: !isOwner,
        tier: { name: "Penjual Terdaftar", maxPriceLimit: 0 }
      };
    }

    // Skenario 4: Pembeli (Buyer)
    if (role === "buyer") {
      if (!user.subscriptionActive) {
        return {
          isPublic: false,
          canViewPrice: false,
          priceBlockReason: "no_subscription",
          canViewFullAddress: false,
          canViewGpsMap: false,
          canViewWhatsapp: false,
          canChat: false,
          tier: null
        };
      }

      const tier = this.getUserSubscriptionTier(user);
      const isUnlimited = !tier.maxPriceLimit || tier.maxPriceLimit === 0;
      const minLimit = Number(tier.minPriceLimit) || 1;
      const maxLimit = Number(tier.maxPriceLimit) || 0;
      const priceToCheck = (product.totalPrice && product.totalPrice > 0) ? product.totalPrice : (product.offerPrice || 0);

      let isWithinLimit = true;
      if (!isUnlimited) {
        // Kuota tier: untuk tier gratis hanya dapat melihat harga penawaran Rp 1 hingga Rp 200.000
        isWithinLimit = priceToCheck >= minLimit && priceToCheck <= maxLimit;
      }

      return {
        isPublic: false,
        canViewPrice: isWithinLimit,
        priceBlockReason: isWithinLimit ? null : "tier_limit_exceeded",
        canViewFullAddress: tier.allowAddress === "full",
        canViewGpsMap: !!tier.allowGpsMap,
        canViewWhatsapp: !!tier.allowWhatsapp,
        canChat: !!tier.allowInAppChat,
        tier
      };
    }

    return {
      isPublic: true,
      canViewPrice: false,
      priceBlockReason: "unknown",
      canViewFullAddress: false,
      canViewGpsMap: false,
      canViewWhatsapp: false,
      canChat: false,
      tier: null
    };
  }

  // ================= CATEGORIES =================
  getCategories() {
    return this.state.categories;
  }

  getCategoryById(id) {
    return this.state.categories.find(c => c.id === id);
  }

  // ================= PRODUCTS (WASTE LISTINGS) =================
  getProducts(filters = {}) {
    let list = [...this.state.products];

    if (filters.status) {
      list = list.filter(p => p.status === filters.status);
    }
    if (filters.category && filters.category !== "all") {
      list = list.filter(p => p.categoryId === filters.category);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        p.code.toLowerCase().includes(q)
      );
    }
    if (filters.sellerId) {
      list = list.filter(p => p.sellerId === filters.sellerId);
    }

    return list;
  }

  getProductById(id) {
    return this.state.products.find(p => p.id === id);
  }

  addProduct(productData) {
    const id = "PRD-2026-" + String(Math.floor(100 + Math.random() * 900));
    const code = "CIR-" + (productData.categoryCode || "WST") + "-" + String(Math.floor(10 + Math.random() * 90));
    
    const now = new Date();
    const formattedDate = now.toISOString().replace("T", " ").substring(0, 16);

    const newProduct = {
      id,
      code,
      title: productData.title,
      categoryId: productData.categoryId,
      categoryName: productData.categoryName,
      sellerId: productData.sellerId || this.state.sellerUserId,
      sellerName: productData.sellerName || "Sentra Jelantah Sejahtera",
      sellerType: productData.sellerType || "Pengepul Terverifikasi",
      sellerPhone: productData.sellerPhone || "+62 813-8822-1100",
      sellerWhatsapp: productData.sellerWhatsapp || "6281388221100",
      containerType: productData.containerType,
      containerQty: Number(productData.containerQty) || 1,
      weight: Number(productData.weight) || 0,
      volume: Number(productData.volume) || 0,
      unit: productData.unit || "Kg",
      origin: productData.origin,
      city: productData.city || this.extractCity(productData.address || productData.origin),
      address: productData.address,
      lat: Number(productData.lat) || -6.2088,
      lng: Number(productData.lng) || 106.8456,
      offerPrice: Number(productData.offerPrice) || 0,
      totalPrice: Number(productData.totalPrice) || 0,
      status: "pending",
      evidences: productData.evidences || [],
      qualitySpecs: productData.qualitySpecs || {},
      createdAt: formattedDate,
      verifiedAt: null,
      verifiedBy: null
    };

    this.state.products.unshift(newProduct);
    this.save();
    return newProduct;
  }

  updateProductStatus(productId, status, adminNotes = "") {
    const prod = this.getProductById(productId);
    if (prod) {
      prod.status = status;
      if (status === "approved") {
        const now = new Date();
        prod.verifiedAt = now.toISOString().replace("T", " ").substring(0, 16);
        prod.verifiedBy = "Tim Kurasi Mutu BURSA LIMBAH";
      }
      if (adminNotes) {
        prod.adminNotes = adminNotes;
      }
      this.save();
      return prod;
    }
    return null;
  }

  // ================= BUYER REQUESTS (RFQ POSTINGS) =================
  getBuyerRequests(filters = {}) {
    let list = [...(this.state.buyerRequests || [])];
    if (filters.category && filters.category !== "all") {
      list = list.filter(r => r.categoryId === filters.category);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q)
      );
    }
    return list;
  }

  addBuyerRequest(requestData) {
    const id = "REQ-2026-" + String(Math.floor(100 + Math.random() * 900));
    const code = "DEM-" + String(Math.floor(10 + Math.random() * 90));
    const now = new Date().toISOString().replace("T", " ").substring(0, 16);

    const newRequest = {
      id,
      code,
      title: requestData.title,
      categoryId: requestData.categoryId,
      categoryName: requestData.categoryName,
      buyerId: requestData.buyerId || this.state.activeUserId,
      buyerName: requestData.buyerName || "PT Pembeli",
      buyerCompany: requestData.buyerCompany || "Perusahaan Daur Ulang",
      buyerPhone: requestData.buyerPhone || "+62 811-0000-0000",
      buyerWhatsapp: requestData.buyerWhatsapp || "6281100000000",
      volume: Number(requestData.volume) || 1000,
      unit: requestData.unit || "Kg",
      budgetPrice: Number(requestData.budgetPrice) || 0,
      totalBudget: Number(requestData.totalBudget) || (Number(requestData.volume) * Number(requestData.budgetPrice)),
      city: requestData.city || "Jakarta",
      address: requestData.address || "Area Industri",
      lat: Number(requestData.lat) || -6.2088,
      lng: Number(requestData.lng) || 106.8456,
      specRequirements: requestData.specRequirements || "Spesifikasi standar",
      createdAt: now,
      status: "active"
    };

    if (!this.state.buyerRequests) this.state.buyerRequests = [];
    this.state.buyerRequests.unshift(newRequest);
    this.save();
    return newRequest;
  }

  // ================= IN-APP INTERACTIVE CHAT =================
  getChats(productId = null, sellerId = null, buyerId = null) {
    let list = [...(this.state.chats || [])];
    if (productId) {
      list = list.filter(c => c.productId === productId);
    }
    return list;
  }

  sendChatMessage({ productId, productTitle, sellerId, buyerId, text, senderRole, senderName }) {
    const user = this.getCurrentUser();
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newMsg = {
      id: "chat_" + Date.now(),
      productId: productId || "PRD-GENERAL",
      productTitle: productTitle || "Limbah Terverifikasi",
      sellerId: sellerId || this.state.sellerUserId,
      buyerId: buyerId || this.state.activeUserId,
      senderRole: senderRole || this.getCurrentRole(),
      senderName: senderName || (user ? user.name : "Pengguna"),
      text,
      timestamp: timeString,
      date: "Hari Ini"
    };

    if (!this.state.chats) this.state.chats = [];
    this.state.chats.push(newMsg);
    this.save();
    return newMsg;
  }

  // ================= ORDERS & BOOKING =================
  getOrders() {
    return this.state.orders;
  }

  getOrderById(id) {
    return this.state.orders.find(o => o.id === id);
  }

  createBooking({ productId, buyerId, pickupDate, notes, shippingMethod, shippingFee }) {
    const product = this.getProductById(productId);
    if (!product) throw new Error("Produk limbah tidak ditemukan");
    if (product.status !== "approved") throw new Error("Produk limbah saat ini tidak tersedia untuk dibooking");

    const settings = this.getSettings();
    const buyer = this.state.users.find(u => u.id === buyerId) || this.getCurrentUser();

    const quantity = product.volume > 0 ? product.volume : product.weight;
    const totalPrice = product.totalPrice || (quantity * product.offerPrice);
    const dpPercent = settings.downPaymentPercent || 30;
    const downPaymentAmount = Math.round(totalPrice * (dpPercent / 100));
    const handlingFee = settings.handlingFeePerTransaction || 10000;
    const appFee = settings.appFeePerTransaction || 5000;
    const isDelivery = shippingMethod === 'BURSA LIMBAH_delivery';
    const finalShippingFee = isDelivery ? (Number(shippingFee) || settings.shippingFlatFee || 250000) : 0;
    const totalPaidNow = downPaymentAmount + handlingFee + appFee + finalShippingFee;
    const remainingPayment = totalPrice - downPaymentAmount;

    // Snapshot data bank pengelola saat transaksi dibuat
    const escrowBankInfo = {
      bankName: settings.escrowBankName || "Bank Central Asia (BCA)",
      accountNumber: settings.escrowAccountNumber || "8271-9920-1122",
      accountHolder: settings.escrowAccountHolder || "PT BURSA LIMBAH Transaksi Sirkular (Rekening Bersama Escrow)",
      branch: settings.escrowBankBranch || "KCP Sentra Bisnis Pulogadung, Jakarta"
    };

    const orderId = "ORD-2026-" + String(Math.floor(1000 + Math.random() * 9000));
    const bookingCode = "CIR-BK-" + String(Math.floor(1000 + Math.random() * 9000));
    const now = new Date().toISOString().replace("T", " ").substring(0, 16);

    const newOrder = {
      id: orderId,
      bookingCode,
      productId: product.id,
      productTitle: product.title,
      categoryName: product.categoryName,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      quantity,
      unit: product.unit,
      unitPrice: product.offerPrice,
      totalPrice,
      downPaymentRate: dpPercent,
      downPaymentAmount,
      handlingFee,
      appFee,
      shippingMethod: isDelivery ? 'Jasa Pengiriman Mitra BURSA LIMBAH' : 'Armada Mandiri Pembeli',
      shippingFee: finalShippingFee,
      totalPaidNow,
      remainingPayment,
      escrowBankInfo,
      paymentStatus: "DP Terbayar (30%)",
      bookingStatus: "Jadwal Pengambilan Armada",
      pickupDate: pickupDate || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      createdAt: now,
      qrCodeTrace: `CIR-TRACE-${bookingCode}-${product.code}`,
      notes: notes || "Booking terkonfirmasi via Rekening Bersama (Escrow) BURSA LIMBAH."
    };

    product.status = "booked";
    product.bookedByOrderId = orderId;

    this.state.orders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  completeOrder(orderId) {
    const order = this.getOrderById(orderId);
    if (order) {
      order.bookingStatus = "Selesai & Diterima";
      order.paymentStatus = "Lunas 100%";
      const prod = this.getProductById(order.productId);
      if (prod) {
        prod.status = "completed";
      }

      const seller = this.state.users.find(u => u.id === order.sellerId);
      if (seller) {
        seller.balance = (seller.balance || 0) + order.totalPrice;
      }

      this.save();
      return order;
    }
    return null;
  }

  // ================= SETTINGS =================
  getSettings() {
    return this.state.settings;
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();
    return this.state.settings;
  }

  // ================= STATISTIK DASHBOARD =================
  getSellerStats(sellerId) {
    const id = sellerId || this.state.sellerUserId;
    const sellerProducts = this.state.products.filter(p => p.sellerId === id);
    const sellerOrders = this.state.orders.filter(o => o.sellerId === id);

    const activeListings = sellerProducts.filter(p => p.status === "approved").length;
    const pendingListings = sellerProducts.filter(p => p.status === "pending").length;
    const bookedListings = sellerProducts.filter(p => p.status === "booked").length;
    const completedListings = sellerProducts.filter(p => p.status === "completed").length;

    let totalGrossVolume = 0;
    sellerProducts.forEach(p => {
      totalGrossVolume += (p.weight || p.volume || 0);
    });

    const user = this.state.users.find(u => u.id === id);

    return {
      activeListings,
      pendingListings,
      bookedListings,
      completedListings,
      totalListings: sellerProducts.length,
      totalOrders: sellerOrders.length,
      totalGrossVolume,
      balance: user ? user.balance : 0
    };
  }

  getAdminStats() {
    const totalListings = this.state.products.length;
    const pendingReview = this.state.products.filter(p => p.status === "pending").length;
    const approvedProducts = this.state.products.filter(p => p.status === "approved").length;
    const bookedProducts = this.state.products.filter(p => p.status === "booked").length;
    
    let totalGMV = 0;
    this.state.orders.forEach(o => {
      totalGMV += o.totalPrice;
    });

    const totalHandlingRevenue = this.state.orders.length * (this.state.settings.handlingFeePerTransaction || 10000);
    const totalAppFeeRevenue = this.state.orders.length * (this.state.settings.appFeePerTransaction || 5000);
    
    const activeSubscribers = this.state.users.filter(u => u.role === "buyer" && u.subscriptionActive);
    let subscriptionRevenue = 0;
    const tiers = this.getSubscriptionTiers();

    activeSubscribers.forEach(sub => {
      const tier = tiers.find(t => t.id === sub.subscriptionTier) || tiers[0];
      subscriptionRevenue += (tier.monthlyFee || 99000);
    });

    return {
      totalListings,
      pendingReview,
      approvedProducts,
      bookedProducts,
      totalOrders: this.state.orders.length,
      totalGMV,
      totalPlatformRevenue: totalHandlingRevenue + totalAppFeeRevenue + subscriptionRevenue,
      handlingRevenue: totalHandlingRevenue,
      appFeeRevenue: totalAppFeeRevenue,
      subscriptionRevenue,
      activeSubscribers: activeSubscribers.length,
      totalRequests: (this.state.buyerRequests || []).length
    };
  }
}

// Inisialisasi store global
window.bursaLimbahStore = new BursaLimbahStore();
window.BURSA_LIMBAHStore = window.bursaLimbahStore;
window.circulinkStore = window.bursaLimbahStore;
