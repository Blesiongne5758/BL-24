// SPDX-License-Identifier: MIT
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
    const runtimeApiUrl = typeof window !== 'undefined' && window.BURSA_LIMBAH_CONFIG
      ? window.BURSA_LIMBAH_CONFIG.apiBaseUrl
      : '';
    if (runtimeApiUrl) return String(runtimeApiUrl).replace(/\/$/, '');
    if (typeof window === 'undefined') return 'http://localhost:5000';
    if (window.location.port === '5000' || (window.location.protocol.startsWith('http') && window.location.pathname.includes('/bursalimbah'))) {
      return '';
    }
    return 'http://localhost:5000';
  }

  getAuthToken() {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  authHeaders(headers = {}) {
    const token = this.getAuthToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
  }

  persistAuthSession(data) {
    if (typeof localStorage === 'undefined' || !data) return;
    if (data.token) localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  }

  async checkBackendHealth() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        this.isBackendConnected = (data.database === 'connected');
        console.log('[BursaLimbah Store] Terhubung ke MySQL Backend API:', data);
        if (this.isBackendConnected) {
          await this.syncWithBackend();
        }
      }
    } catch (e) {
      this.isBackendConnected = false;
    }
  }

  async syncWithBackend() {
    try {
      // 1. Ambil produk dari MySQL
      const pRes = await fetch(`${this.apiBaseUrl}/api/products?limit=100`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.success && Array.isArray(pData.products) && pData.products.length > 0) {
          const serverProducts = pData.products;
          const serverIds = new Set(serverProducts.map(p => p.id));
          const localOnly = (this.state.products || []).filter(p => !serverIds.has(p.id));
          this.state.products = [...serverProducts, ...localOnly];
        }
      }

      // 2. Ambil orders/transaksi dari MySQL
      const oRes = await fetch(`${this.apiBaseUrl}/api/orders`);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.success && Array.isArray(oData.orders) && oData.orders.length > 0) {
          const serverOrders = oData.orders.map(o => {
            const localOrder = (this.state.orders || []).find(local => local.id === o.id) || {};
            return ({
            ...localOrder,
            id: o.id,
            bookingCode: o.order_code,
            productId: o.product_id,
            productTitle: o.product_title || 'Limbah Terverifikasi',
            buyerId: o.buyer_id,
            buyerName: o.buyer_name || 'Pembeli',
            sellerId: o.seller_id,
            sellerName: o.seller_name || 'Penjual',
            totalPrice: parseFloat(o.total_amount) || 0,
            downPaymentRate: parseFloat(o.dp_percentage) || 0,
            downPaymentAmount: parseFloat(o.dp_amount) || 0,
            handlingFee: parseFloat(o.handling_fee) || 10000,
            totalPaidNow: (parseFloat(o.dp_amount) || parseFloat(o.total_amount)) + (parseFloat(o.handling_fee) || 10000),
            remainingPayment: parseFloat(o.remaining_amount) || 0,
            paymentStatus: parseFloat(o.dp_amount) > 0 ? `DP Terbayar (${parseFloat(o.dp_percentage)}%)` : 'Lunas 100%',
            bookingStatus: o.escrow_status === 'completed' ? 'Selesai & Diterima' : 'Jadwal Pengambilan Armada',
            pickupDate: o.pickup_date ? new Date(o.pickup_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            createdAt: o.created_at ? new Date(o.created_at).toISOString().replace('T', ' ').substring(0, 16) : '',
            notes: o.notes || ''
          });
          });
          const serverOrderIds = new Set(serverOrders.map(o => o.id));
          const localOrders = (this.state.orders || []).filter(o => !serverOrderIds.has(o.id));
          this.state.orders = [...serverOrders, ...localOrders];
        }
      }

      // 2B. Ambil penawaran harga dan notifikasi transaksi dari MySQL
      const offerRes = await fetch(`${this.apiBaseUrl}/api/offers`);
      if (offerRes.ok) {
        const offerData = await offerRes.json();
        if (offerData.success && Array.isArray(offerData.offers)) {
          const serverOffers = offerData.offers.map(o => ({
            id: o.id, productId: o.product_id, productTitle: o.product_title,
            productCode: o.product_code, sellerId: o.seller_id, sellerName: o.seller_name,
            buyerId: o.buyer_id, buyerName: o.buyer_name, offerPrice: Number(o.offer_price),
            quantity: Number(o.quantity), unit: o.unit, note: o.note || '', status: o.status,
            createdAt: o.created_at
          }));
          const serverIds = new Set(serverOffers.map(o => o.id));
          this.state.offers = [...serverOffers, ...(this.state.offers || []).filter(o => !serverIds.has(o.id))];
        }
      }

      const settingRes = await fetch(`${this.apiBaseUrl}/api/settings`);
      if (settingRes.ok) {
        const settingData = await settingRes.json();
        const remote = settingData.settings || {};
        if (Object.keys(remote).length) {
          let tierFees = this.state.settings.handlingFeeByTier;
          try { tierFees = remote.handlingFeeByTier ? JSON.parse(remote.handlingFeeByTier) : tierFees; } catch (_) { /* retain local fallback */ }
          this.state.settings = {
            ...this.state.settings,
            dpEnabled: remote.dp_enabled === undefined ? this.state.settings.dpEnabled : remote.dp_enabled === 'true',
            downPaymentPercent: Number(remote.dp_percentage) || this.state.settings.downPaymentPercent,
            handlingFeeByTier: tierFees,
            paymentGatewayEnabled: remote.paymentGatewayEnabled === undefined ? this.state.settings.paymentGatewayEnabled : remote.paymentGatewayEnabled === 'true',
            paymentGatewayProvider: remote.paymentGatewayProvider || this.state.settings.paymentGatewayProvider,
            paymentGatewayEnvironment: remote.paymentGatewayEnvironment || this.state.settings.paymentGatewayEnvironment,
            paymentGatewayClientKey: remote.paymentGatewayClientKey || this.state.settings.paymentGatewayClientKey,
            paymentGatewayServerKey: remote.paymentGatewayServerKey || this.state.settings.paymentGatewayServerKey,
            paymentGatewayMerchantId: remote.paymentGatewayMerchantId || this.state.settings.paymentGatewayMerchantId,
            paymentGatewayChannels: remote.paymentGatewayChannels ? (typeof remote.paymentGatewayChannels === 'string' ? JSON.parse(remote.paymentGatewayChannels) : remote.paymentGatewayChannels) : this.state.settings.paymentGatewayChannels,
            paymentGatewayWebhookUrl: remote.paymentGatewayWebhookUrl || this.state.settings.paymentGatewayWebhookUrl,
            expeditionApiEnabled: remote.expeditionApiEnabled === undefined ? this.state.settings.expeditionApiEnabled : remote.expeditionApiEnabled === 'true',
            expeditionApiProvider: remote.expeditionApiProvider || this.state.settings.expeditionApiProvider,
            expeditionApiKey: remote.expeditionApiKey || this.state.settings.expeditionApiKey,
            expeditionApiOrigin: remote.expeditionApiOrigin || this.state.settings.expeditionApiOrigin,
            expeditionApiCouriers: remote.expeditionApiCouriers ? (typeof remote.expeditionApiCouriers === 'string' ? JSON.parse(remote.expeditionApiCouriers) : remote.expeditionApiCouriers) : this.state.settings.expeditionApiCouriers,
            expeditionApiWebhookUrl: remote.expeditionApiWebhookUrl || this.state.settings.expeditionApiWebhookUrl,
            tickerEnabled: remote.ticker_enabled === undefined ? this.state.settings.tickerEnabled : remote.ticker_enabled === 'true',
            googleLoginEnabled: remote.google_login_enabled === 'true',
            tickerTitle: remote.ticker_title || this.state.settings.tickerTitle,
            tickerRefreshMinutes: Math.min(120, Math.max(1, Number(remote.ticker_refresh_minutes) || this.state.settings.tickerRefreshMinutes || 15)),
            termsTitle: remote.terms_title || this.state.settings.termsTitle,
            termsVersion: remote.terms_version || this.state.settings.termsVersion,
            termsContent: remote.terms_content || this.state.settings.termsContent,
            supportSectionTitle: remote.support_section_title || this.state.settings.supportSectionTitle || "Pusat Layanan Resmi",
            contactPhone: remote.contact_phone || this.state.settings.contactPhone || "+62 812-3456-7890",
            contactWaNumber: remote.contact_wa_number || this.state.settings.contactWaNumber || "6281234567890",
            contactWaMessage: remote.contact_wa_message || this.state.settings.contactWaMessage || "Halo Admin Bursa Limbah, saya ingin konsultasi transaksi",
            contactEmail: remote.contact_email || this.state.settings.contactEmail || "kemitraan@bursalimbah.id",
            address: remote.contact_address || this.state.settings.address || "Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur",
            supportGuideBtnText: remote.support_guide_btn_text || this.state.settings.supportGuideBtnText || "Panduan Transaksi Aman",
            supportGuideBtnAction: remote.support_guide_btn_action || this.state.settings.supportGuideBtnAction || "modal",
            supportGuideBtnUrl: remote.support_guide_btn_url || this.state.settings.supportGuideBtnUrl || "",
            supportGuideBtnEnabled: remote.support_guide_btn_enabled === undefined ? (this.state.settings.supportGuideBtnEnabled !== false) : remote.support_guide_btn_enabled === 'true',
            supportOperationalHours: remote.support_operational_hours || this.state.settings.supportOperationalHours || "Senin – Jumat: 08.00 – 17.00 WIB",
            supportMapsUrl: remote.support_maps_url || this.state.settings.supportMapsUrl || "",
            customFees: (() => {
              try {
                return remote.custom_fees ? JSON.parse(remote.custom_fees) : this.state.settings.customFees;
              } catch (_) { return this.state.settings.customFees; }
            })()
          };
        }
      }

      // 3. Ambil events dari MySQL
      const eRes = await fetch(`${this.apiBaseUrl}/api/events`);
      if (eRes.ok) {
        const eData = await eRes.json();
        if (eData.success && Array.isArray(eData.events) && eData.events.length > 0) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const serverEvents = eData.events.map(ev => {
            const d = ev.event_date ? new Date(ev.event_date) : new Date();
            return {
              id: ev.id,
              title: ev.title,
              category: ev.event_type || 'webinar',
              categoryLabel: (ev.event_type || 'webinar').toUpperCase(),
              date: d.toISOString().split('T')[0],
              day: String(d.getDate()).padStart(2, '0'),
              monthYear: `${months[d.getMonth()]} ${d.getFullYear()}`,
              time: ev.event_time || '09.00 – 12.00 WIB',
              location: ev.location || 'Online',
              image: ev.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
              description: ev.description || '',
              price: parseFloat(ev.price) || 0,
              priceLabel: parseFloat(ev.price) > 0 ? `Rp ${parseFloat(ev.price).toLocaleString('id-ID')}` : 'Gratis',
              isFree: parseFloat(ev.price) === 0,
              status: ev.status === 'aktif' ? 'published' : (ev.status || 'draft')
            };
          });
          const serverEvIds = new Set(serverEvents.map(e => e.id));
          const localEvents = (this.state.events || []).filter(e => !serverEvIds.has(e.id));
          this.state.events = [...serverEvents, ...localEvents];
        }
      }

      this.save();
      window.dispatchEvent(new CustomEvent('bursalimbah:settings-synced'));
      console.log('[BursaLimbah Store] Sinkronisasi data real-time dengan database MySQL berhasil.');
    } catch (err) {
      console.warn('[BursaLimbah Store] Gagal sinkronisasi data awal backend:', err);
    }
  }

  initStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.state = {
        categories: [...INITIAL_CATEGORIES],
        products: [...INITIAL_PRODUCTS],
        orders: [...INITIAL_ORDERS],
        offers: [],
        notifications: [],
        users: [...INITIAL_USERS],
        settings: { ...INITIAL_SETTINGS, dpEnabled: false },
        buyerRequests: [...INITIAL_BUYER_REQUESTS],
        chats: [...INITIAL_CHATS],
        events: (typeof INITIAL_EVENTS !== 'undefined' ? [...INITIAL_EVENTS] : []),
        eventTickets: (typeof INITIAL_EVENT_TICKETS !== 'undefined' ? [...INITIAL_EVENT_TICKETS] : []),
        subscriptionRequests: (typeof INITIAL_SUBSCRIPTION_REQUESTS !== 'undefined' ? [...INITIAL_SUBSCRIPTION_REQUESTS] : []),
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
          const storedCustomFees = this.state.settings.customFees;
          this.state.settings = { ...INITIAL_SETTINGS, ...this.state.settings };
          // Preserve stored customFees array if it exists, else use defaults
          if (Array.isArray(storedCustomFees) && storedCustomFees.length > 0) {
            this.state.settings.customFees = storedCustomFees;
          } else if (!Array.isArray(this.state.settings.customFees)) {
            this.state.settings.customFees = [...INITIAL_SETTINGS.customFees];
          }
        }
        if (!this.state.settings.subscriptionTiers || this.state.settings.subscriptionTiers.length === 0) {
          this.state.settings.subscriptionTiers = [...INITIAL_SUBSCRIPTION_TIERS];
        } else {
          // Sinkronisasi data & rules transaksi tiap tier
          this.state.settings.subscriptionTiers.forEach(t => {
            const initT = INITIAL_SUBSCRIPTION_TIERS.find(it => it.id === t.id);
            if (initT) {
              if (t.minBookingOfferPrice === undefined) t.minBookingOfferPrice = initT.minBookingOfferPrice;
              if (t.maxBookingOfferPrice === undefined) t.maxBookingOfferPrice = initT.maxBookingOfferPrice;
              if (t.canBooking === undefined) t.canBooking = initT.canBooking;
              if (t.minBookingVolume === undefined) t.minBookingVolume = initT.minBookingVolume;
              if (t.maxBookingVolume === undefined) t.maxBookingVolume = initT.maxBookingVolume;
              if (t.volumeUnit === undefined) t.volumeUnit = initT.volumeUnit;
            }
          });
        }
        if (!this.state.users) {
          this.state.users = [...INITIAL_USERS];
        } else {
          // Pastikan data paymentMethods tersedia pada akun penjual
          this.state.users.forEach(u => {
            if (u.role === 'seller' && (!u.paymentMethods || !u.paymentMethods.bankTransfer)) {
              const initU = INITIAL_USERS.find(iu => iu.id === u.id);
              u.paymentMethods = initU?.paymentMethods || {
                cash: { enabled: true, notes: "Pembayaran tunai di lokasi depo/gudang saat serah terima timbangan" },
                bankTransfer: { enabled: true, bankName: "Bank Central Asia (BCA)", accountNumber: u.bankAccount || "8271-992-102", accountHolder: u.name },
                qris: { enabled: true, merchantName: u.name, imageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021126570014ID.LINKAJA.WWW01189360091800000188210210Bursalimbah5204549953033605802ID5925Sentra%20Jelantah6007Jakarta61051254062070703A016304" }
              };
            }
          });
        }
        if (!Array.isArray(this.state.orders) || this.state.orders.length <= 1) {
          const existingIds = new Set((this.state.orders || []).map(o => o.id));
          const newOrders = (typeof INITIAL_ORDERS !== 'undefined' ? INITIAL_ORDERS : []).filter(o => !existingIds.has(o.id));
          this.state.orders = [...(this.state.orders || []), ...newOrders];
        }
        if (!Array.isArray(this.state.offers) || this.state.offers.length === 0) {
          this.state.offers = (typeof INITIAL_OFFERS !== 'undefined' ? [...INITIAL_OFFERS] : []);
        } else {
          // Merge missing initial offers
          const existingOfferIds = new Set((this.state.offers || []).map(o => o.id));
          const newOffers = (typeof INITIAL_OFFERS !== 'undefined' ? INITIAL_OFFERS : []).filter(o => !existingOfferIds.has(o.id));
          if (newOffers.length > 0) {
            this.state.offers = [...this.state.offers, ...newOffers];
          }
        }
        if (!Array.isArray(this.state.notifications)) this.state.notifications = [];
        // Pastikan akun demo user_buyer_free terdaftar di users
        if (!this.state.users.some(u => u.id === 'user_buyer_free')) {
          const freeSeed = INITIAL_USERS.find(u => u.id === 'user_buyer_free');
          if (freeSeed) this.state.users.push(freeSeed);
        }

        // Sinkronisasi kategori terbaru (16 kategori komoditas lengkap: Utama, Industri B2B, B3)
        this.state.categories = [...INITIAL_CATEGORIES];

        if (!this.state.buyerRequests || this.state.buyerRequests.length === 0) {
          this.state.buyerRequests = [...INITIAL_BUYER_REQUESTS];
        }
        if (!this.state.chats || this.state.chats.length === 0) {
          this.state.chats = [...INITIAL_CHATS];
        }
        // Sinkronisasi data Event & Agenda
        if (!this.state.events || this.state.events.length === 0) {
          this.state.events = (typeof INITIAL_EVENTS !== 'undefined' ? [...INITIAL_EVENTS] : []);
        }
        // Sinkronisasi antrean Permohonan Langganan Pembeli
        if (!this.state.subscriptionRequests || this.state.subscriptionRequests.length === 0) {
          this.state.subscriptionRequests = (typeof INITIAL_SUBSCRIPTION_REQUESTS !== 'undefined' ? [...INITIAL_SUBSCRIPTION_REQUESTS] : []);
        }
        // Sinkronisasi data Tiket & QR Code Event
        if (!this.state.eventTickets || this.state.eventTickets.length === 0) {
          this.state.eventTickets = (typeof INITIAL_EVENT_TICKETS !== 'undefined' ? [...INITIAL_EVENT_TICKETS] : []);
        }
        // Status DP saat ini: SET OFF (Nonaktif) secara default
        if (this.state.settings.dpEnabled === undefined) {
          this.state.settings.dpEnabled = false;
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

        // Sinkronisasi 10 atribut wajib (kondisi, grade, MOQ, jadwal, status, B3) ke seluruh produk
        INITIAL_PRODUCTS.forEach(ip => {
          const idx = this.state.products.findIndex(p => p.id === ip.id);
          if (idx !== -1) {
            this.state.products[idx] = {
              ...this.state.products[idx],
              condition: this.state.products[idx].condition || ip.condition,
              grade: this.state.products[idx].grade || ip.grade,
              minimumOrder: this.state.products[idx].minimumOrder || ip.minimumOrder,
              minimumOrderUnit: this.state.products[idx].minimumOrderUnit || ip.minimumOrderUnit,
              pickupSchedule: this.state.products[idx].pickupSchedule || ip.pickupSchedule,
              listingStatus: this.state.products[idx].listingStatus || ip.listingStatus,
              isB3: typeof this.state.products[idx].isB3 !== 'undefined' ? this.state.products[idx].isB3 : ip.isB3,
              b3PermitNumber: this.state.products[idx].b3PermitNumber || ip.b3PermitNumber,
              city: this.state.products[idx].city || ip.city,
              sourceType: this.state.products[idx].sourceType || ip.sourceType,
              nib: this.state.products[idx].nib || ip.nib,
              tpsPermit: this.state.products[idx].tpsPermit || ip.tpsPermit
            };
          } else {
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
    if (!this.getAuthToken()) return false;
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
            password: password || "123456"
          });
        } else {
          newUser = this.registerBuyer({
            name: `${displayName} (Pembeli)`,
            email: cleanId,
            phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
            company: `PT ${displayName} Daur Ulang`,
            tierId: "tier_starter", // Otomatis akun Pembeli Tier Gratis (Rp 1 - Rp 200.000)
            password: password || "123456"
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
    const userPass = user.password || "123456";
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
        this.persistAuthSession(data);
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
      console.warn('[Store] Server autentikasi tidak tersedia:', netErr.message);
    }

    return { success: false, message: 'Layanan autentikasi tidak tersedia. Silakan coba lagi.' };
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
        this.persistAuthSession(data);
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
      console.warn('[Store] Layanan registrasi tidak tersedia:', err.message);
    }

    return { success: false, message: 'Layanan registrasi tidak tersedia. Silakan coba lagi.' };
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
        this.persistAuthSession(data);
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
      console.warn('[Store] Layanan registrasi tidak tersedia:', err.message);
    }

    return { success: false, message: 'Layanan registrasi tidak tersedia. Silakan coba lagi.' };
  }

  async loginWithGoogleAsync({ idToken, role = 'buyer' }) {
    if (this.getSettings().googleLoginEnabled !== true) {
      return { success: false, message: 'Login dengan Google sedang dinonaktifkan oleh administrator.' };
    }
    if (!idToken) {
      return { success: false, message: 'Google ID token wajib tersedia.' };
    }
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, role })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.persistAuthSession(data);
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
      console.warn('[Store] Backend MySQL offline untuk Google Auth:', err.message);
    }
    return { success: false, message: 'Layanan login Google tidak tersedia.' };
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
          password: "google_oauth_verified"
        });
      } else {
        user = this.registerBuyer({
          name: `${displayName} (Pembeli)`,
          email: cleanEmail,
          phone: "+62 812-" + Math.floor(10000000 + Math.random() * 90000000),
          company: `PT ${displayName} Daur Ulang`,
          tierId: "tier_starter",
          password: "google_oauth_verified"
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

    if (data.name !== undefined) user.name = data.name;
    if (data.company !== undefined) user.company = data.company;
    if (data.phone !== undefined) user.phone = data.phone;
    if (data.location !== undefined) user.location = data.location;
    if (data.bankAccount !== undefined) user.bankAccount = data.bankAccount;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    if (data.nib !== undefined) user.nib = data.nib;

    if (data.paymentMethods) {
      user.paymentMethods = {
        ...(user.paymentMethods || {}),
        ...data.paymentMethods
      };
      // Sinkronkan string bankAccount ringkas jika transfer bank terisi
      if (user.paymentMethods.bankTransfer && user.paymentMethods.bankTransfer.accountNumber) {
        const bt = user.paymentMethods.bankTransfer;
        user.bankAccount = `${bt.bankName || 'Bank'} ${bt.accountNumber} a.n ${bt.accountHolder || user.name}`.trim();
      }
    }

    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: user.name,
          company: user.company,
          phone: user.phone,
          location: user.location,
          bankAccount: user.bankAccount,
          avatar: user.avatar,
          paymentMethods: user.paymentMethods
        })
      }).catch(e => console.warn('[Update User Profile API Error]', e));
    }

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

  async uploadProductEvidences(files) {
    if (typeof window !== 'undefined' && window.circulinkStorage) {
      try {
        const uploaded = [];
        for (const file of files) {
          const res = await window.circulinkStorage.uploadDirect(file, 'public_listing');
          uploaded.push({
            url: res.url,
            thumbnailUrl: res.thumbnailUrl || res.url,
            filename: res.filename || file.name,
            provider: res.provider || 'cloudinary'
          });
        }
        return uploaded;
      } catch (storageErr) {
        console.warn('[Store] Direct Cloudinary/S3 storage upload failed, falling back to local backend:', storageErr.message);
      }
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await fetch(`${this.apiBaseUrl}/api/uploads/product-evidence`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengunggah gambar eviden.');
    }
    return data.files;
  }

  async uploadIdentityDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.apiBaseUrl}/api/uploads/identity-document`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengunggah dokumen identitas.');
    }
    return data.file;
  }

  async uploadWeighingProof(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.apiBaseUrl}/api/uploads/weighing-proof`, { method: 'POST', headers: this.authHeaders(), body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengunggah bukti timbang.');
    return data.file;
  }

  logout() {
    this.state.currentRole = "public";
    this.state.adminUserId = null;
    this.state.authenticatedBuyerId = null;
    this.state.authenticatedSellerId = null;
    this.state.activeUserId = null;
    this.state.sellerUserId = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
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

  registerBuyer({ name, email, phone, company, tierId, password, subscriptionActive }) {
    const newId = "user_buyer_" + Date.now();
    const chosenTierId = tierId || "tier_starter";
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const isStarter = chosenTierId === "tier_starter";
    const isSubActive = subscriptionActive !== undefined ? Boolean(subscriptionActive) : isStarter;

    const newUser = {
      id: newId,
      name: name || "Pembeli Baru Bursa Limbah",
      role: "buyer",
      email: email || `buyer_${Date.now()}@bursalimbah.id`,
      phone: phone || "+62 812-0000-0000",
      company: company || "Perusahaan Pembeli",
      location: "Indonesia",
      subscriptionActive: isSubActive,
      subscriptionTier: chosenTierId,
      subscriptionExpiry: nextMonth.toISOString().split("T")[0],
      password: password || "123456"
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
      password: password || "123456"
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
  getCategories(group = null) {
    const list = this.state.categories || INITIAL_CATEGORIES;
    if (!group || group === "all") return list;
    return list.filter(c => c.group === group);
  }

  getHotCategories() {
    return (typeof MVP_HOT_CATEGORIES !== 'undefined') ? MVP_HOT_CATEGORIES : [];
  }

  getSourceTiers() {
    return (typeof WASTE_SOURCE_TIERS !== 'undefined') ? WASTE_SOURCE_TIERS : [];
  }

  getSourceTierById(id) {
    const tiers = this.getSourceTiers();
    return tiers.find(t => t.id === id) || null;
  }

  getCategoryById(id) {
    return (this.state.categories || INITIAL_CATEGORIES).find(c => c.id === id);
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
    if (filters.categoryGroup && filters.categoryGroup !== "all") {
      const catIdsInGroup = (this.state.categories || []).filter(c => c.group === filters.categoryGroup).map(c => c.id);
      list = list.filter(p => catIdsInGroup.includes(p.categoryId));
    }
    if (filters.isB3 === true) {
      list = list.filter(p => p.isB3 === true);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.origin.toLowerCase().includes(q) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.condition && p.condition.toLowerCase().includes(q)) ||
        (p.grade && p.grade.toLowerCase().includes(q)) ||
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
      // 10 Atribut Wajib Listing:
      condition: productData.condition || "Bersih",
      grade: productData.grade || "Grade Standar Industri",
      minimumOrder: Number(productData.minimumOrder) || 1,
      minimumOrderUnit: productData.minimumOrderUnit || productData.unit || "Kg",
      pickupSchedule: productData.pickupSchedule || "Siap Angkut Segera (H+0 s/d H+1)",
      listingStatus: productData.listingStatus || "Tersedia",
      isB3: Boolean(productData.isB3),
      b3PermitNumber: productData.b3PermitNumber || null,
      // Sumber Limbah (3-Tier):
      sourceType: productData.sourceType || null,
      nib: productData.nib || null,
      tpsPermit: productData.tpsPermit || null,
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

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newProduct)
      }).catch(e => console.warn('[Add Product API Error]', e));
    }

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

      if (this.isBackendConnected) {
        fetch(`${this.apiBaseUrl}/api/products/${productId}/status`, {
          method: 'PATCH',
          headers: this.authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ status, adminNotes })
        }).catch(e => console.warn('[Update Product Status API Error]', e));
      }

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

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/chats`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newMsg)
      }).catch(e => console.warn('[Send Chat API Error]', e));
    }

    return newMsg;
  }

  // ================= ORDERS & BOOKING =================
  getOrders() {
    return this.state.orders;
  }

  getOrderById(id) {
    return this.state.orders.find(o => o.id === id);
  }

  validateTierBookingRules(buyer, product, qty = 1) {
    if (!buyer || buyer.role !== 'buyer') return { valid: true };
    const tierId = buyer.subscriptionTier || 'tier_starter';
    const tier = this.getSubscriptionTierById(tierId);
    if (!tier) return { valid: true };

    if (tier.canBooking === false) {
      return {
        valid: false,
        message: `Paket ${tier.name} Anda saat ini tidak diizinkan melakukan booking transaksi. Silakan hubungi admin atau tingkatkan paket Anda.`
      };
    }

    const offerPrice = Number(product.offerPrice || product.askingPrice) || 0;
    const minPrice = Number(tier.minBookingOfferPrice) || 0;
    const maxPrice = Number(tier.maxBookingOfferPrice) || 0;

    if (minPrice > 0 && offerPrice < minPrice) {
      return {
        valid: false,
        message: `Nilai penawaran Rp ${offerPrice.toLocaleString('id-ID')} berada di bawah batas minimum booking paket ${tier.name} (Min. Rp ${minPrice.toLocaleString('id-ID')}).`
      };
    }

    if (maxPrice > 0 && offerPrice > maxPrice) {
      return {
        valid: false,
        message: `Nilai penawaran Rp ${offerPrice.toLocaleString('id-ID')} melebihi batas maksimal booking paket ${tier.name} (Maks. Rp ${maxPrice.toLocaleString('id-ID')}). Silakan upgrade paket langganan Anda.`
      };
    }

    const orderQty = Number(qty) || Number(product.volume || product.weight) || 1;
    const minVol = Number(tier.minBookingVolume) || 0;
    const maxVol = Number(tier.maxBookingVolume) || 0;

    if (minVol > 0 && orderQty < minVol) {
      return {
        valid: false,
        message: `Volume booking (${Number(orderQty).toLocaleString('id-ID')} ${product.unit || 'Kg'}) kurang dari batas minimum tier ${tier.name} (${Number(minVol).toLocaleString('id-ID')} ${tier.volumeUnit || 'Kg'}).`
      };
    }

    if (maxVol > 0 && orderQty > maxVol) {
      return {
        valid: false,
        message: `Volume booking (${Number(orderQty).toLocaleString('id-ID')} ${product.unit || 'Kg'}) melebihi kuota maksimal tier ${tier.name} (${Number(maxVol).toLocaleString('id-ID')} ${tier.volumeUnit || 'Kg'}). Silakan upgrade paket langganan Anda.`
      };
    }

    return { valid: true };
  }

  createBooking({ productId, buyerId, pickupDate, notes, shippingMethod, shippingFee }) {
    const product = this.getProductById(productId);
    if (!product) throw new Error("Produk limbah tidak ditemukan");
    if (product.status !== "approved") throw new Error("Produk limbah saat ini tidak tersedia untuk dibooking");

    const settings = this.getSettings();
    const buyer = this.state.users.find(u => u.id === buyerId) || this.getCurrentUser();

    const quantity = product.volume > 0 ? product.volume : product.weight;

    // Validasi Rules Transaksi Tiap Tiers
    const ruleCheck = this.validateTierBookingRules(buyer, product, quantity);
    if (!ruleCheck.valid) {
      throw new Error(ruleCheck.message);
    }

    const totalPrice = product.totalPrice || (quantity * product.offerPrice);
    const isDp = this.isDpEnabled();
    const dpPercent = settings.downPaymentPercent || 30;
    const downPaymentAmount = isDp ? Math.round(totalPrice * (dpPercent / 100)) : totalPrice;
    const handlingFee = this.getHandlingFeeForUser(buyer);
    const appFee = settings.appFeePerTransaction || 5000;
    const isDelivery = shippingMethod === 'BURSA LIMBAH_delivery';
    const finalShippingFee = isDelivery ? (Number(shippingFee) || settings.shippingFlatFee || 250000) : 0;
    const totalPaidNow = downPaymentAmount + handlingFee + appFee + finalShippingFee;
    const remainingPayment = isDp ? totalPrice - downPaymentAmount : 0;

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
      downPaymentRate: isDp ? dpPercent : 0,
      downPaymentAmount: isDp ? downPaymentAmount : 0,
      handlingFee,
      appFee,
      shippingMethod: isDelivery ? 'Jasa Pengiriman Mitra BURSA LIMBAH' : 'Armada Mandiri Pembeli',
      shippingFee: finalShippingFee,
      totalPaidNow,
      remainingPayment,
      remainingPaymentStatus: remainingPayment > 0 ? 'unpaid' : 'not_applicable',
      remainingPaymentProof: null,
      escrowBankInfo,
      paymentStatus: isDp ? `DP Terbayar (${dpPercent}%)` : "Lunas via Rekber (100%)",
      bookingStatus: "Jadwal Pengambilan Armada",
      pickupDate: pickupDate || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      createdAt: now,
      qrCodeTrace: `CIR-TRACE-${bookingCode}-${product.code}`,
      notes: notes || "Booking terkonfirmasi via Rekening Bersama (Escrow) BURSA LIMBAH."
    };

    product.status = "booked";
    product.bookedByOrderId = orderId;

    this.state.orders.unshift(newOrder);
    this.createNotification(product.sellerId, 'info', 'Pesanan baru masuk', `${buyer.name} membuat pesanan ${product.title}.`, `/seller/orders/${orderId}`);
    this.createNotification(buyer.id, 'success', 'Pesanan tercatat', `Pesanan ${bookingCode} berhasil dibuat dan menunggu proses pembayaran.`, `/buyer/orders/${orderId}`);
    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/orders`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newOrder)
      }).catch(e => console.warn('[Create Order API Error]', e));
    }

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

      if (this.isBackendConnected) {
        fetch(`${this.apiBaseUrl}/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: this.authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ escrowStatus: 'completed' })
        }).catch(e => console.warn('[Complete Order API Error]', e));
      }

      return order;
    }
    return null;
  }

  submitRemainingPaymentProof(orderId, proofData = {}) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan.");

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    order.remainingPaymentProof = {
      method: proofData.method || 'bank_transfer',
      senderBank: proofData.senderBank || '',
      senderAccount: proofData.senderAccount || '',
      referenceNumber: proofData.referenceNumber || `REF-${Date.now()}`,
      notes: proofData.notes || '',
      proofImageUrl: proofData.proofImageUrl || proofData.imageUrl || '',
      uploadedAt: now,
      verifiedBySeller: false,
      verifiedBySellerName: null,
      verifiedBySellerAt: null,
      verifiedByAdmin: false,
      verifiedByAdminName: null,
      verifiedByAdminAt: null
    };

    order.remainingPaymentStatus = 'proof_submitted';
    order.paymentStatus = 'Bukti Sisa Diunggah (Menunggu Verifikasi)';

    this.createNotification(
      order.sellerId,
      'info',
      'Bukti Sisa Pembayaran Diterima',
      `Pembeli ${order.buyerName} telah mengunggah bukti pelunasan sisa (${this.formatRupiah ? this.formatRupiah(order.remainingPayment) : 'Rp ' + order.remainingPayment}) untuk pesanan ${order.bookingCode}. Silakan tinjau dan konfirmasi.`,
      `/seller/orders/${order.id}`
    );

    this.createNotification(
      'user_admin_1',
      'info',
      'Bukti Sisa Pembayaran (Pelunasan)',
      `Bukti sisa pembayaran ${order.bookingCode} telah diunggah oleh pembeli dan menunggu verifikasi admin.`,
      `/admin/orders/${order.id}`
    );

    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/orders/${orderId}/remaining-proof`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(order.remainingPaymentProof)
      }).catch(e => console.warn('[Remaining Proof API Error]', e));
    }

    return order;
  }

  verifyRemainingPayment(orderId, verifierRole = 'seller', verifierName = '') {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (!order.remainingPaymentProof) throw new Error("Belum ada bukti sisa pembayaran yang diunggah untuk pesanan ini.");

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (verifierRole === 'seller') {
      order.remainingPaymentProof.verifiedBySeller = true;
      order.remainingPaymentProof.verifiedBySellerName = verifierName || 'Penjual';
      order.remainingPaymentProof.verifiedBySellerAt = now;
      order.remainingPaymentStatus = order.remainingPaymentProof.verifiedByAdmin ? 'completed' : 'verified_by_seller';
      this.createNotification(
        order.buyerId,
        'success',
        'Sisa Pembayaran Dikonfirmasi Penjual',
        `Penjual telah memvalidasi bukti pelunasan sisa Anda untuk booking ${order.bookingCode}.`,
        `/buyer/orders/${order.id}`
      );
    } else if (verifierRole === 'admin') {
      order.remainingPaymentProof.verifiedByAdmin = true;
      order.remainingPaymentProof.verifiedByAdminName = verifierName || 'Pengelola Rekber';
      order.remainingPaymentProof.verifiedByAdminAt = now;
      order.remainingPaymentStatus = 'verified_by_admin';
      order.paymentStatus = 'Lunas 100% (Terverifikasi)';

      this.createNotification(
        order.buyerId,
        'success',
        'Pelunasan Sisa Terverifikasi Admin',
        `Admin Rekening Bersama telah memverifikasi pelunasan sisa pesanan ${order.bookingCode}. Transaksi lunas 100%.`,
        `/buyer/orders/${order.id}`
      );
      this.createNotification(
        order.sellerId,
        'success',
        'Pelunasan Diverifikasi Admin',
        `Admin telah memverifikasi pelunasan pesanan ${order.bookingCode}.`,
        `/seller/orders/${order.id}`
      );
    }

    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/orders/${orderId}/verify-remaining`, {
        method: 'POST',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ verifierRole, verifierName, verifiedAt: now })
      }).catch(e => console.warn('[Verify Remaining API Error]', e));
    }

    return order;
  }

  recordReceivingEvidence(orderId, actualWeight, weighingProof = null) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Data transaksi tidak ditemukan.');
    if (!(Number(actualWeight) > 0)) throw new Error('Berat aktual yang diterima harus lebih dari nol.');
    order.actualReceivedWeight = Number(actualWeight);
    order.weighingProof = weighingProof;
    order.receivingEvidenceSubmittedAt = new Date().toISOString();
    order.qrCompletionReady = true;
    this.save();
    return order;
  }

  // ================= LAPORAN & LOGISTIK TRANSAKSI =================
  getOrdersForSeller(sellerId) {
    return (this.state.orders || []).filter(o => o.sellerId === sellerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrdersForBuyer(buyerId) {
    return (this.state.orders || []).filter(o => o.buyerId === buyerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOffersForBuyer(buyerId) {
    return (this.state.offers || []).filter(o => o.buyerId === buyerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getAcceptedOffersForSeller(sellerId) {
    return (this.state.offers || []).filter(o => o.sellerId === sellerId && o.status === 'accepted').sort((a, b) => new Date(b.respondedAt || b.createdAt) - new Date(a.respondedAt || a.createdAt));
  }

  getAcceptedOffersForBuyer(buyerId) {
    return (this.state.offers || []).filter(o => o.buyerId === buyerId && o.status === 'accepted').sort((a, b) => new Date(b.respondedAt || b.createdAt) - new Date(a.respondedAt || a.createdAt));
  }

  dispatchOrder({ orderId, sellerId, dispatchType, courierName, trackingNumber, notes, proofImage, handoverRecipient }) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Transaksi tidak ditemukan.');
    if (order.sellerId !== sellerId) throw new Error('Anda tidak memiliki wewenang untuk memproses pengiriman pesanan ini.');

    const isThirdParty = dispatchType === 'third_party';
    order.shippingStatus = isThirdParty ? 'shipped_third_party' : 'handed_over';
    order.bookingStatus = isThirdParty ? 'Dikirim oleh Pihak ke-3 / Ekspedisi' : 'Diserahkan Langsung ke Pembeli';
    order.sellerHandoverQr = order.sellerHandoverQr || `QR-HANDOVER-${order.id}`;
    order.qrCompletionReady = true;

    order.deliveryDetails = {
      dispatchType: isThirdParty ? 'third_party' : 'direct',
      courierName: isThirdParty ? (courierName || 'Ekspedisi Logistik Mitra') : 'Serah Terima Langsung di Depo',
      trackingNumber: trackingNumber || (isThirdParty ? `EXP-${Date.now().toString().slice(-6)}` : `DIR-${order.bookingCode}`),
      dispatchedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: notes || '',
      proofImage: proofImage || null,
      handoverRecipient: handoverRecipient || ''
    };

    this.createNotification(
      order.buyerId,
      'info',
      isThirdParty ? 'Barang Dalam Pengiriman Ekspedisi' : 'Barang Telah Diserahkan Penjual',
      isThirdParty 
        ? `Pesanan ${order.productTitle} telah dikirim via ${order.deliveryDetails.courierName} (No. Resi: ${order.deliveryDetails.trackingNumber}).`
        : `Pesanan ${order.productTitle} telah diserahkan di lokasi depo oleh penjual. Silakan validasi penerimaan barang.`,
      `/buyer/orders/${order.id}`
    );

    this.save();
    return order;
  }

  validateOrderDelivery({ orderId, buyerId, actualWeight, handoverQrCode, notes, proofImage }) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Data transaksi tidak ditemukan.');
    if (order.buyerId !== buyerId && buyerId !== 'admin') throw new Error('Anda tidak memiliki hak validasi untuk transaksi ini.');

    // Jika scan QR code diverifikasi
    if (handoverQrCode) {
      const cleanInput = String(handoverQrCode).trim();
      const validQr1 = order.sellerHandoverQr || `QR-HANDOVER-${order.id}`;
      const validQr2 = order.qrCodeTrace;
      if (cleanInput !== validQr1 && cleanInput !== validQr2 && !cleanInput.includes(order.bookingCode)) {
        throw new Error('Kode QR Penjual tidak valid atau tidak cocok dengan transaksi ini.');
      }
    }

    if (actualWeight !== undefined && actualWeight !== null && Number(actualWeight) > 0) {
      order.actualReceivedWeight = Number(actualWeight);
    } else if (!order.actualReceivedWeight) {
      order.actualReceivedWeight = order.quantity;
    }

    if (proofImage) {
      order.weighingProof = proofImage;
    }
    if (notes) {
      order.buyerReceiveNotes = String(notes).trim();
    }

    order.shippingStatus = 'delivered';
    order.bookingStatus = 'Selesai (Barang Diterima & Lunas)';
    order.paymentStatus = 'Lunas (Selesai)';
    order.escrowStatus = 'completed';
    order.completedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Cairkan dana pelunasan ke penjual
    const seller = this.state.users.find(u => u.id === order.sellerId);
    if (seller) {
      seller.balance = (seller.balance || 0) + order.totalPrice;
    }

    // Notifikasi ke penjual
    this.createNotification(
      order.sellerId,
      'success',
      'Barang Diterima & Dana Dicairkan!',
      `Pembeli ${order.buyerName} telah memvalidasi penerimaan ${order.productTitle}. Dana transaksi sebesar Rp${order.totalPrice.toLocaleString('id-ID')} telah diteruskan ke saldo dompet Anda.`,
      `/seller/sales`
    );

    this.save();
    return order;
  }

  getSellerSalesReport(sellerId, filters = {}) {
    let orders = this.getOrdersForSeller(sellerId);
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter(o => {
        if (filters.status === 'completed') return o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
        if (filters.status === 'pending_dispatch') return !o.shippingStatus || o.shippingStatus === 'pending_dispatch';
        if (filters.status === 'in_delivery') return o.shippingStatus === 'shipped_third_party' || o.shippingStatus === 'handed_over';
        return true;
      });
    }
    if (filters.startDate) {
      orders = orders.filter(o => (o.createdAt || '') >= filters.startDate);
    }
    if (filters.endDate) {
      orders = orders.filter(o => (o.createdAt || '').substring(0, 10) <= filters.endDate);
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.escrowStatus === 'completed' || o.shippingStatus === 'delivered');
    const totalVolume = orders.reduce((acc, o) => acc + (Number(o.actualReceivedWeight) || Number(o.quantity) || 0), 0);
    const totalGrossRevenue = orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
    const settledRevenue = completedOrders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
    const pendingRevenue = totalGrossRevenue - settledRevenue;

    return {
      orders,
      totalOrders,
      completedOrdersCount: completedOrders.length,
      pendingOrdersCount: totalOrders - completedOrders.length,
      totalVolume,
      totalGrossRevenue,
      settledRevenue,
      pendingRevenue
    };
  }

  getBuyerPurchaseReport(buyerId, filters = {}) {
    let orders = this.getOrdersForBuyer(buyerId);
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter(o => {
        if (filters.status === 'completed') return o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
        if (filters.status === 'in_delivery') return o.shippingStatus === 'shipped_third_party' || o.shippingStatus === 'handed_over';
        if (filters.status === 'pending_dispatch') return !o.shippingStatus || o.shippingStatus === 'pending_dispatch';
        return true;
      });
    }
    if (filters.startDate) {
      orders = orders.filter(o => (o.createdAt || '') >= filters.startDate);
    }
    if (filters.endDate) {
      orders = orders.filter(o => (o.createdAt || '').substring(0, 10) <= filters.endDate);
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.escrowStatus === 'completed' || o.shippingStatus === 'delivered');
    const totalVolume = orders.reduce((acc, o) => acc + (Number(o.actualReceivedWeight) || Number(o.quantity) || 0), 0);
    const totalSpend = orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
    const totalEscrowPaid = orders.reduce((acc, o) => acc + (Number(o.totalPaidNow) || 0), 0);

    return {
      orders,
      totalOrders,
      completedOrdersCount: completedOrders.length,
      pendingOrdersCount: totalOrders - completedOrders.length,
      totalVolume,
      totalSpend,
      totalEscrowPaid
    };
  }

  getAdminFinancialReport(filters = {}) {
    let orders = [...(this.state.orders || [])];
    if (filters.startDate) {
      orders = orders.filter(o => (o.createdAt || '') >= filters.startDate);
    }
    if (filters.endDate) {
      orders = orders.filter(o => (o.createdAt || '').substring(0, 10) <= filters.endDate);
    }

    let totalGrossGMV = 0;
    let totalEscrowInflow = 0;
    let totalPlatformFees = 0;
    let totalDisbursedToSellers = 0;
    let totalEscrowHeld = 0;
    let totalShippingCollected = 0;

    orders.forEach(o => {
      const gmv = Number(o.totalPrice) || 0;
      const dp = Number(o.downPaymentAmount) || gmv;
      const handling = Number(o.handlingFee) || 0;
      const app = Number(o.appFee) || 0;
      const shipping = Number(o.shippingFee) || 0;

      totalGrossGMV += gmv;
      totalPlatformFees += (handling + app);
      totalShippingCollected += shipping;
      totalEscrowInflow += (Number(o.totalPaidNow) || (dp + handling + app + shipping));

      if (o.escrowStatus === 'completed' || o.shippingStatus === 'delivered') {
        totalDisbursedToSellers += gmv;
      } else {
        totalEscrowHeld += dp;
      }
    });

    return {
      orders,
      totalOrders: orders.length,
      totalGrossGMV,
      totalEscrowInflow,
      totalPlatformFees,
      totalDisbursedToSellers,
      totalEscrowHeld,
      totalShippingCollected
    };
  }

  getAdminSalesAndPurchaseReport(filters = {}) {
    let orders = [...(this.state.orders || [])];
    if (filters.startDate) {
      orders = orders.filter(o => (o.createdAt || '') >= filters.startDate);
    }
    if (filters.endDate) {
      orders = orders.filter(o => (o.createdAt || '').substring(0, 10) <= filters.endDate);
    }
    if (filters.category && filters.category !== 'all') {
      orders = orders.filter(o => o.categoryName === filters.category);
    }

    // Commodity breakdown
    const commodityMap = {};
    orders.forEach(o => {
      const cat = o.categoryName || 'Lainnya';
      if (!commodityMap[cat]) {
        commodityMap[cat] = { category: cat, volume: 0, unit: o.unit || 'Kg', gmv: 0, orderCount: 0 };
      }
      commodityMap[cat].volume += (Number(o.actualReceivedWeight) || Number(o.quantity) || 0);
      commodityMap[cat].gmv += (Number(o.totalPrice) || 0);
      commodityMap[cat].orderCount += 1;
    });

    const commodities = Object.values(commodityMap).sort((a, b) => b.gmv - a.gmv);
    const totalVolume = orders.reduce((acc, o) => acc + (Number(o.actualReceivedWeight) || Number(o.quantity) || 0), 0);
    const totalGMV = orders.reduce((acc, o) => acc + (Number(o.totalPrice) || 0), 0);
    const completedCount = orders.filter(o => o.escrowStatus === 'completed' || o.shippingStatus === 'delivered').length;

    return {
      orders,
      commodities,
      totalOrders: orders.length,
      completedCount,
      activeCount: orders.length - completedCount,
      totalVolume,
      totalGMV
    };
  }

  // ================= SETTINGS & DP CONFIGURATION =================
  getSettings() {
    return this.state.settings;
  }

  isDpEnabled() {
    return Boolean(this.state.settings && this.state.settings.dpEnabled === true);
  }

  setDpSettings(enabled, percent) {
    this.state.settings.dpEnabled = Boolean(enabled);
    if (percent !== undefined && percent !== null) {
      this.state.settings.downPaymentPercent = Number(percent) || 30;
    }
    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          dp_enabled: String(enabled),
          dp_percentage: String(this.state.settings.downPaymentPercent || 30)
        })
      }).catch(e => console.warn('[DP Settings API Error]', e));
    }

    return this.state.settings;
  }

  // ================= SAKELAR MASTER FITUR (FEATURE FLAGS) =================
  getFeatures() {
    return (this.state.settings && this.state.settings.features) || (typeof INITIAL_SETTINGS !== 'undefined' ? INITIAL_SETTINGS.features : {});
  }

  isFeatureEnabled(featureKey) {
    const features = this.getFeatures();
    if (!features || typeof features[featureKey] === 'undefined') return true;
    return features[featureKey] === true;
  }

  setFeature(featureKey, enabled) {
    if (!this.state.settings.features) {
      this.state.settings.features = { ...(typeof INITIAL_SETTINGS !== 'undefined' ? INITIAL_SETTINGS.features : {}) };
    }
    this.state.settings.features[featureKey] = Boolean(enabled);
    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ [`feature_${featureKey}`]: String(enabled) })
      }).catch(e => console.warn('[Feature Toggle API Error]', e));
    }
    return this.state.settings.features;
  }

  // ================= BLOCKCHAIN & DOMPET KRIPTO =================
  getCryptoConfig() {
    const raw = (this.state.settings && this.state.settings.cryptoConfig) || (typeof INITIAL_SETTINGS !== 'undefined' ? INITIAL_SETTINGS.cryptoConfig : {
      enabled: true,
      networkName: "Polygon PoS (Matic Mainnet)",
      networkRpc: "https://polygon-rpc.com",
      chainId: 137,
      currencySymbol: "CLNK",
      tokenName: "Circulink Utility Token",
      tokenContractAddress: "0x71C25e79140C9404B6732B2586eFf1dF3993CLNK",
      escrowContractAddress: "0x3A28F50B9402De069F78465C58a18357aF38ESCROW",
      rewardPer100Kg: 10,
      tokenRateIdr: 1500,
      gasSponsorEnabled: true,
      airdropPoolBalance: 2500000
    });
    raw.symbol = raw.symbol || raw.currencySymbol || 'CLNK';
    raw.currencySymbol = raw.symbol;
    raw.tokenContract = raw.tokenContract || raw.tokenContractAddress || '';
    raw.tokenContractAddress = raw.tokenContract;
    raw.escrowContract = raw.escrowContract || raw.escrowContractAddress || '';
    raw.escrowContractAddress = raw.escrowContract;
    raw.exchangeRateIdr = raw.exchangeRateIdr || raw.tokenRateIdr || 1500;
    raw.tokenRateIdr = raw.exchangeRateIdr;
    raw.airdropPool = raw.airdropPool ?? raw.airdropPoolBalance ?? 2500000;
    raw.airdropPoolBalance = raw.airdropPool;
    raw.network = raw.network || raw.networkName || 'Polygon PoS (Matic Mainnet)';
    raw.networkName = raw.network;
    return raw;
  }

  updateCryptoConfig(patch) {
    if (patch.exchangeRateIdr && !patch.tokenRateIdr) patch.tokenRateIdr = patch.exchangeRateIdr;
    if (patch.tokenRateIdr && !patch.exchangeRateIdr) patch.exchangeRateIdr = patch.tokenRateIdr;
    if (patch.symbol && !patch.currencySymbol) patch.currencySymbol = patch.symbol;
    if (patch.currencySymbol && !patch.symbol) patch.symbol = patch.currencySymbol;
    if (patch.tokenContract && !patch.tokenContractAddress) patch.tokenContractAddress = patch.tokenContract;
    if (patch.tokenContractAddress && !patch.tokenContract) patch.tokenContract = patch.tokenContractAddress;
    if (patch.escrowContract && !patch.escrowContractAddress) patch.escrowContractAddress = patch.escrowContract;
    if (patch.escrowContractAddress && !patch.escrowContract) patch.escrowContract = patch.escrowContractAddress;
    if (patch.airdropPool !== undefined && patch.airdropPoolBalance === undefined) patch.airdropPoolBalance = patch.airdropPool;
    if (patch.airdropPoolBalance !== undefined && patch.airdropPool === undefined) patch.airdropPool = patch.airdropPoolBalance;
    if (patch.network && !patch.networkName) patch.networkName = patch.network;
    if (patch.networkName && !patch.network) patch.network = patch.networkName;

    this.state.settings.cryptoConfig = { ...this.getCryptoConfig(), ...patch };
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ crypto_config: JSON.stringify(this.state.settings.cryptoConfig) })
      }).catch(e => console.warn('[Crypto Config API Error]', e));
    }
    return this.state.settings.cryptoConfig;
  }

  getCryptoWallets() {
    if (!this.state.cryptoWallets) {
      this.state.cryptoWallets = {};
    }
    return this.state.cryptoWallets;
  }

  getCryptoWallet(userId) {
    const uid = userId || this.getCurrentUser()?.id || 'guest';
    const wallets = this.getCryptoWallets();
    if (!wallets[uid]) {
      const hex = '0123456789abcdef';
      let addr = '0x';
      for (let i = 0; i < 40; i++) addr += hex[Math.floor(Math.random() * 16)];

      const isBuyer = uid.includes('buyer');
      const isSeller = uid.includes('seller');
      wallets[uid] = {
        userId: uid,
        address: addr,
        network: this.getCryptoConfig().networkName,
        connected: true,
        balances: {
          CLNK: isBuyer ? 750 : (isSeller ? 450 : 2500),
          USDT: isBuyer ? 85.0 : 15.0,
          MATIC: 0.85
        },
        unclaimedRewards: {
          CLNK: isSeller ? 35 : (isBuyer ? 20 : 0),
          reason: 'Reward Daur Ulang 350 Kg Terverifikasi'
        },
        txHistory: [
          {
            txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
            type: 'airdrop_welcome',
            title: 'Welcome Airdrop Circulink Token',
            amount: isBuyer ? 750 : (isSeller ? 450 : 2500),
            symbol: 'CLNK',
            status: 'confirmed',
            blockNumber: 58921042,
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
          }
        ]
      };
      this.save();
    }
    return wallets[uid];
  }

  claimRecyclingRewards(userId) {
    const wallet = this.getCryptoWallet(userId);
    const amount = Number(wallet.unclaimedRewards?.CLNK) || 0;
    if (amount <= 0) {
      return { success: false, message: 'Tidak ada token reward daur ulang yang dapat diklaim saat ini.' };
    }

    wallet.balances.CLNK = (wallet.balances.CLNK || 0) + amount;
    const tx = {
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'reward_claim',
      title: 'Klaim Insentif Daur Ulang Limbah',
      amount,
      symbol: 'CLNK',
      status: 'confirmed',
      blockNumber: Math.floor(58900000 + Math.random() * 90000),
      timestamp: new Date().toISOString()
    };
    wallet.txHistory.unshift(tx);
    wallet.unclaimedRewards = { CLNK: 0, reason: '' };
    this.save();

    return {
      success: true,
      amount,
      claimed: amount,
      txHash: tx.txHash,
      newBalance: wallet.balances.CLNK,
      message: `Berhasil mengklaim ${amount} CLNK ke dompet kripto Anda!`
    };
  }

  transferCrypto(fromUserId, toAddress, amount, symbol = 'CLNK') {
    const wallet = this.getCryptoWallet(fromUserId);
    const qty = Number(amount);
    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length < 20) {
      return { success: false, message: 'Alamat dompet penerima tidak valid (harus diawali 0x).' };
    }
    if (qty <= 0 || (wallet.balances[symbol] || 0) < qty) {
      return { success: false, message: `Saldo ${symbol} Anda tidak mencukupi untuk transfer.` };
    }

    wallet.balances[symbol] -= qty;
    const tx = {
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'transfer_out',
      title: `Transfer ke ${toAddress.substring(0, 8)}...${toAddress.slice(-4)}`,
      toAddress,
      amount: qty,
      symbol,
      status: 'confirmed',
      blockNumber: Math.floor(58900000 + Math.random() * 90000),
      timestamp: new Date().toISOString()
    };
    wallet.txHistory.unshift(tx);

    // Cari apakah penerima user lokal
    const allWallets = this.getCryptoWallets();
    for (const uId of Object.keys(allWallets)) {
      if (allWallets[uId].address.toLowerCase() === toAddress.toLowerCase()) {
        allWallets[uId].balances[symbol] = (allWallets[uId].balances[symbol] || 0) + qty;
        allWallets[uId].txHistory.unshift({
          txHash: tx.txHash,
          type: 'transfer_in',
          title: `Terima dari ${wallet.address.substring(0, 8)}...`,
          fromAddress: wallet.address,
          amount: qty,
          symbol,
          status: 'confirmed',
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp
        });
        break;
      }
    }

    this.save();
    return {
      success: true,
      txHash: tx.txHash,
      amount: qty,
      symbol,
      remainingBalance: wallet.balances[symbol],
      message: `Transfer ${qty} ${symbol} berhasil dikonfirmasi di blockchain!`
    };
  }

  payOrderWithCrypto(userId, orderId, symbol = 'CLNK') {
    const order = (this.state.orders || []).find(o => o.id === orderId);
    if (!order) return { success: false, message: 'Pesanan tidak ditemukan.' };

    const config = this.getCryptoConfig();
    const rate = config.tokenRateIdr || 1500;
    const rupiahAmount = Number(order.dpAmount || order.downPaymentAmount || order.totalAmount || order.totalPrice) || 100000;
    const tokenAmount = symbol === 'USDT' ? Math.round((rupiahAmount / 16000) * 100) / 100 : Math.ceil(rupiahAmount / rate);

    const wallet = this.getCryptoWallet(userId);
    if ((wallet.balances[symbol] || 0) < tokenAmount) {
      return {
        success: false,
        message: `Saldo ${symbol} Anda (${wallet.balances[symbol] || 0}) tidak mencukupi untuk membayar ${tokenAmount} ${symbol} (setara Rp ${rupiahAmount.toLocaleString('id-ID')}).`
      };
    }

    wallet.balances[symbol] -= tokenAmount;
    const tx = {
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      type: 'order_payment',
      title: `Pembayaran Pesanan #${order.bookingCode || order.id}`,
      orderId: order.id,
      amount: tokenAmount,
      symbol,
      status: 'confirmed',
      blockNumber: Math.floor(58900000 + Math.random() * 90000),
      timestamp: new Date().toISOString()
    };
    wallet.txHistory.unshift(tx);

    // Update status pesanan
    order.escrowStatus = 'dp_secured';
    order.status = 'DP Terbayar (Crypto Escrow)';
    order.paymentMethod = `Crypto Wallet (${symbol})`;
    order.cryptoTxHash = tx.txHash;
    this.save();

    return {
      success: true,
      txHash: tx.txHash,
      tokenAmount,
      symbol,
      message: `Pembayaran ${tokenAmount} ${symbol} untuk pesanan #${order.bookingCode || order.id} sukses via Smart Contract Escrow!`
    };
  }

  adminDistributeAirdrop(toTarget, amount, reason = 'Insentif Komunitas Sirkular') {
    const config = this.getCryptoConfig();
    const qty = Number(amount) || 0;
    if (qty <= 0) return { success: false, message: 'Jumlah token harus lebih dari 0.' };

    const allWallets = this.getCryptoWallets();
    let recipientsCount = 0;

    if (toTarget === 'all_users') {
      const users = this.state.users || [];
      const perUser = Math.round(qty / (users.length || 1));
      users.forEach(u => {
        const w = this.getCryptoWallet(u.id);
        w.balances.CLNK = (w.balances.CLNK || 0) + perUser;
        w.txHistory.unshift({
          txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          type: 'airdrop_distribution',
          title: 'Distribusi Massal Admin: ' + reason,
          amount: perUser,
          symbol: 'CLNK',
          status: 'confirmed',
          timestamp: new Date().toISOString()
        });
        recipientsCount++;
      });
      config.airdropPoolBalance = Math.max(0, (config.airdropPoolBalance || 2500000) - qty); config.airdropPool = config.airdropPoolBalance; config.airdropPool = config.airdropPoolBalance;
    } else {
      let targetWallet = null;
      for (const uid of Object.keys(allWallets)) {
        if (uid === toTarget || allWallets[uid].address.toLowerCase() === toTarget.toLowerCase()) {
          targetWallet = allWallets[uid];
          break;
        }
      }
      if (!targetWallet) {
        targetWallet = this.getCryptoWallet(toTarget);
      }
      targetWallet.balances.CLNK = (targetWallet.balances.CLNK || 0) + qty;
      targetWallet.txHistory.unshift({
        txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        type: 'airdrop_distribution',
        title: 'Insentif Khusus Admin: ' + reason,
        amount: qty,
        symbol: 'CLNK',
        status: 'confirmed',
        timestamp: new Date().toISOString()
      });
      config.airdropPoolBalance = Math.max(0, (config.airdropPoolBalance || 2500000) - qty);
      recipientsCount = 1;
    }

    this.save();
    return {
      success: true,
      recipientsCount,
      count: recipientsCount,
      totalDistributed: qty,
      remainingPool: config.airdropPoolBalance,
      message: `Berhasil mendistribusikan ${qty} CLNK ke ${recipientsCount} penerima!`
    };
  }

  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.save();

    if (this.isBackendConnected) {
      const apiSettings = { ...newSettings };
      if (apiSettings.handlingFeeByTier) apiSettings.handlingFeeByTier = JSON.stringify(apiSettings.handlingFeeByTier);
      if (apiSettings.tickerEnabled !== undefined) {
        apiSettings.ticker_enabled = String(apiSettings.tickerEnabled);
        delete apiSettings.tickerEnabled;
      }
      if (apiSettings.tickerTitle !== undefined) {
        apiSettings.ticker_title = apiSettings.tickerTitle;
        delete apiSettings.tickerTitle;
      }
      if (apiSettings.tickerRefreshMinutes !== undefined) {
        apiSettings.ticker_refresh_minutes = String(apiSettings.tickerRefreshMinutes);
        delete apiSettings.tickerRefreshMinutes;
      }
      if (apiSettings.googleLoginEnabled !== undefined) {
        apiSettings.google_login_enabled = String(apiSettings.googleLoginEnabled);
        delete apiSettings.googleLoginEnabled;
      }
      if (apiSettings.termsTitle !== undefined) { apiSettings.terms_title = apiSettings.termsTitle; delete apiSettings.termsTitle; }
      if (apiSettings.termsVersion !== undefined) { apiSettings.terms_version = apiSettings.termsVersion; delete apiSettings.termsVersion; }
      if (apiSettings.termsContent !== undefined) { apiSettings.terms_content = apiSettings.termsContent; delete apiSettings.termsContent; }
      if (apiSettings.supportSectionTitle !== undefined) { apiSettings.support_section_title = apiSettings.supportSectionTitle; delete apiSettings.supportSectionTitle; }
      if (apiSettings.contactPhone !== undefined) { apiSettings.contact_phone = apiSettings.contactPhone; delete apiSettings.contactPhone; }
      if (apiSettings.contactWaNumber !== undefined) { apiSettings.contact_wa_number = apiSettings.contactWaNumber; delete apiSettings.contactWaNumber; }
      if (apiSettings.contactWaMessage !== undefined) { apiSettings.contact_wa_message = apiSettings.contactWaMessage; delete apiSettings.contactWaMessage; }
      if (apiSettings.contactEmail !== undefined) { apiSettings.contact_email = apiSettings.contactEmail; delete apiSettings.contactEmail; }
      if (apiSettings.address !== undefined) { apiSettings.contact_address = apiSettings.address; delete apiSettings.address; }
      if (apiSettings.supportGuideBtnText !== undefined) { apiSettings.support_guide_btn_text = apiSettings.supportGuideBtnText; delete apiSettings.supportGuideBtnText; }
      if (apiSettings.supportGuideBtnAction !== undefined) { apiSettings.support_guide_btn_action = apiSettings.supportGuideBtnAction; delete apiSettings.supportGuideBtnAction; }
      if (apiSettings.supportGuideBtnUrl !== undefined) { apiSettings.support_guide_btn_url = apiSettings.supportGuideBtnUrl; delete apiSettings.supportGuideBtnUrl; }
      if (apiSettings.supportGuideBtnEnabled !== undefined) { apiSettings.support_guide_btn_enabled = String(apiSettings.supportGuideBtnEnabled); delete apiSettings.supportGuideBtnEnabled; }
      if (apiSettings.supportOperationalHours !== undefined) { apiSettings.support_operational_hours = apiSettings.supportOperationalHours; delete apiSettings.supportOperationalHours; }
      if (apiSettings.supportMapsUrl !== undefined) { apiSettings.support_maps_url = apiSettings.supportMapsUrl; delete apiSettings.supportMapsUrl; }
      if (apiSettings.customFees !== undefined) { apiSettings.custom_fees = JSON.stringify(apiSettings.customFees); delete apiSettings.customFees; }
      if (apiSettings.features !== undefined) { apiSettings.features = JSON.stringify(apiSettings.features); }
      if (apiSettings.cryptoConfig !== undefined) { apiSettings.crypto_config = JSON.stringify(apiSettings.cryptoConfig); delete apiSettings.cryptoConfig; }
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(apiSettings)
      }).catch(e => console.warn('[Update Settings API Error]', e));
    }

    return this.state.settings;
  }

  // ================= CUSTOM FEES CRUD =================
  getCustomFees() {
    const fees = this.state.settings && this.state.settings.customFees;
    return Array.isArray(fees) ? fees : [];
  }

  addCustomFee(fee) {
    if (!Array.isArray(this.state.settings.customFees)) {
      this.state.settings.customFees = [];
    }
    const newFee = {
      id: 'fee_custom_' + Date.now(),
      name: String(fee.name || 'Biaya Baru').trim(),
      type: fee.type === 'percentage' ? 'percentage' : 'fixed',
      value: Number(fee.value) || 0,
      target: ['buyer', 'seller', 'both'].includes(fee.target) ? fee.target : 'buyer',
      enabled: fee.enabled !== false,
      description: String(fee.description || '').trim()
    };
    this.state.settings.customFees.push(newFee);
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT', headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ custom_fees: JSON.stringify(this.state.settings.customFees) })
      }).catch(e => console.warn('[CustomFee Add API Error]', e));
    }
    return newFee;
  }

  updateCustomFee(id, patch) {
    const fees = this.getCustomFees();
    const idx = fees.findIndex(f => f.id === id);
    if (idx === -1) return null;
    fees[idx] = { ...fees[idx], ...patch };
    this.state.settings.customFees = fees;
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT', headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ custom_fees: JSON.stringify(fees) })
      }).catch(e => console.warn('[CustomFee Update API Error]', e));
    }
    return fees[idx];
  }

  deleteCustomFee(id) {
    const fees = this.getCustomFees().filter(f => f.id !== id);
    this.state.settings.customFees = fees;
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT', headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ custom_fees: JSON.stringify(fees) })
      }).catch(e => console.warn('[CustomFee Delete API Error]', e));
    }
    return fees;
  }

  toggleCustomFee(id) {
    const fees = this.getCustomFees();
    const fee = fees.find(f => f.id === id);
    if (!fee) return null;
    fee.enabled = !fee.enabled;
    this.state.settings.customFees = fees;
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/settings`, {
        method: 'PUT', headers: this.authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ custom_fees: JSON.stringify(fees) })
      }).catch(e => console.warn('[CustomFee Toggle API Error]', e));
    }
    return fee;
  }

  calculateCustomFees(totalPrice, role) {
    const fees = this.getCustomFees();
    let total = 0;
    const breakdown = [];
    fees.forEach(fee => {
      if (!fee.enabled) return;
      if (fee.target !== 'both' && fee.target !== role) return;
      let amount = fee.type === 'percentage'
        ? Math.round(totalPrice * (fee.value / 100))
        : Number(fee.value);
      total += amount;
      breakdown.push({ id: fee.id, name: fee.name, type: fee.type, value: fee.value, amount, target: fee.target });
    });
    return { total, breakdown };
  }

  recordReceivingEvidence(orderId, actualWeight, weighingProof = null) {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Data transaksi tidak ditemukan.');
    if (!(Number(actualWeight) > 0)) throw new Error('Berat aktual yang diterima harus lebih dari nol.');
    order.actualReceivedWeight = Number(actualWeight);
    order.weighingProof = weighingProof;
    order.receivingEvidenceSubmittedAt = new Date().toISOString();
    order.qrCompletionReady = true;
    this.save();
    return order;
  }

  getHandlingFeeForUser(user) {
    const settings = this.getSettings();
    const tierId = user && user.subscriptionTier ? user.subscriptionTier : 'tier_starter';
    const tierFees = settings.handlingFeeByTier || {};
    const fee = Number(tierFees[tierId]);
    return Number.isFinite(fee) ? fee : (Number(settings.handlingFeePerTransaction) || 10000);
  }

  getOffersForSeller(sellerId) {
    return (this.state.offers || []).filter(o => o.sellerId === sellerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createOffer({ productId, buyerId, offerPrice, quantity, note }) {
    const product = this.getProductById(productId);
    const buyer = this.state.users.find(u => u.id === buyerId);
    if (!product || !buyer) throw new Error('Data produk atau pembeli tidak ditemukan.');
    if (product.status !== 'approved') throw new Error('Produk ini tidak lagi tersedia untuk ditawar.');
    if (!(Number(offerPrice) > 0)) throw new Error('Masukkan harga penawaran yang valid.');
    const offer = {
      id: `OFF-${Date.now()}`,
      productId: product.id,
      productTitle: product.title,
      productCode: product.code,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      buyerId: buyer.id,
      buyerName: buyer.name,
      offerPrice: Number(offerPrice),
      quantity: Number(quantity) || product.minimumOrder || 1,
      unit: product.unit || 'Kg',
      note: String(note || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.state.offers.unshift(offer);
    this.createNotification(product.sellerId, 'warning', 'Penawaran harga baru', `${buyer.name} menawar ${product.title} sebesar Rp${offer.offerPrice.toLocaleString('id-ID')}.`, `/seller/offers/${offer.id}`);
    this.createNotification(buyer.id, 'info', 'Penawaran dikirim', `Penawaran Anda untuk ${product.title} sudah diteruskan kepada penjual.`, `/buyer/offers/${offer.id}`);
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/offers`, { method: 'POST', headers: this.authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(offer) }).catch(e => console.warn('[Offer API Error]', e));
    }
    return offer;
  }

  respondToOffer(offerId, sellerId, decision) {
    const offer = (this.state.offers || []).find(o => o.id === offerId);
    if (!offer || offer.sellerId !== sellerId || offer.status !== 'pending') throw new Error('Penawaran tidak dapat diproses.');
    offer.status = decision === 'accepted' ? 'accepted' : 'rejected';
    offer.respondedAt = new Date().toISOString();
    const accepted = offer.status === 'accepted';
    this.createNotification(offer.buyerId, accepted ? 'success' : 'error', accepted ? 'Penawaran diterima' : 'Penawaran ditolak', accepted ? `Penjual menerima penawaran Anda untuk ${offer.productTitle}. Lanjutkan ke pembayaran untuk mengunci pasokan.` : `Penjual belum dapat menerima penawaran Anda untuk ${offer.productTitle}.`, `/buyer/offers/${offer.id}`);
    this.createNotification(sellerId, accepted ? 'success' : 'info', accepted ? 'Penawaran diterima' : 'Penawaran ditolak', `Anda ${accepted ? 'menerima' : 'menolak'} penawaran ${offer.buyerName} untuk ${offer.productTitle}.`, `/seller/offers/${offer.id}`);
    this.save();
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/offers/${offerId}/status`, { method: 'PATCH', headers: this.authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ sellerId, status: offer.status }) }).catch(e => console.warn('[Offer status API Error]', e));
    }
    return offer;
  }

  createNotification(userId, type, title, message, link = null) {
    const notification = { id: `NTF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId, type, title, message, link, isRead: false, createdAt: new Date().toISOString() };
    if (!this.state.notifications) this.state.notifications = [];
    this.state.notifications.unshift(notification);
    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/notifications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) }).catch(e => console.warn('[Notification API Error]', e));
    }
    return notification;
  }

  // ================= EVENT & AGENDA MANAGEMENT =================
  getEvents(category = 'semua') {
    if (!this.state.events || this.state.events.length === 0) {
      this.state.events = (typeof INITIAL_EVENTS !== 'undefined' ? [...INITIAL_EVENTS] : []);
      this.save();
    }
    if (!category || category === 'semua') {
      return this.state.events;
    }
    return this.state.events.filter(e => e.category === category);
  }

  getEventById(id) {
    const events = this.getEvents('semua');
    return events.find(e => e.id === id) || null;
  }

  addEvent(eventData) {
    const newId = "evt_" + Date.now();
    const dateObj = new Date(eventData.date || Date.now());
    const day = String(dateObj.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthYear = `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    const newEvent = {
      id: newId,
      title: eventData.title || "Agenda Baru Bursa Limbah",
      category: eventData.category || "workshop",
      categoryLabel: eventData.categoryLabel || "Workshop",
      date: eventData.date || new Date().toISOString().split('T')[0],
      day: eventData.day || day,
      monthYear: eventData.monthYear || monthYear,
      time: eventData.time || "09.00 – 15.00 WIB",
      location: eventData.location || "Jakarta",
      image: eventData.image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
      description: eventData.description || "",
      price: Number(eventData.price) || 0,
      priceLabel: eventData.priceLabel || (eventData.isFree ? "Gratis" : "Berbayar"),
      isFree: Boolean(eventData.isFree),
      status: eventData.status || "published",
      createdAt: new Date().toISOString()
    };
    if (!this.state.events) this.state.events = [];
    this.state.events.unshift(newEvent);
    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      }).catch(e => console.warn('[Add Event API Error]', e));
    }

    return newEvent;
  }

  updateEvent(id, updatedData) {
    const events = this.getEvents('semua');
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) {
      if (updatedData.date && (!updatedData.day || !updatedData.monthYear)) {
        const dateObj = new Date(updatedData.date);
        updatedData.day = String(dateObj.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        updatedData.monthYear = `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
      }
      events[idx] = { ...events[idx], ...updatedData };
      this.state.events = events;
      this.save();

      if (this.isBackendConnected) {
        fetch(`${this.apiBaseUrl}/api/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        }).catch(e => console.warn('[Update Event API Error]', e));
      }

      return events[idx];
    }
    return null;
  }

  deleteEvent(id) {
    const events = this.getEvents('semua');
    this.state.events = events.filter(e => e.id !== id);
    this.save();

    if (this.isBackendConnected) {
      fetch(`${this.apiBaseUrl}/api/events/${id}`, {
        method: 'DELETE'
      }).catch(e => console.warn('[Delete Event API Error]', e));
    }

    return true;
  }

  // ================= EVENT TICKETS & QR CODE MANAGEMENT =================
  getEventTickets(eventId = null) {
    if (!this.state.eventTickets) {
      this.state.eventTickets = (typeof INITIAL_EVENT_TICKETS !== 'undefined' ? [...INITIAL_EVENT_TICKETS] : []);
      this.save();
    }
    if (!eventId || eventId === 'all') {
      return this.state.eventTickets;
    }
    return this.state.eventTickets.filter(t => t.eventId === eventId);
  }

  getEventTicketById(id) {
    const tickets = this.getEventTickets();
    return tickets.find(t => t.id === id) || null;
  }

  getEventTicketByCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    const tickets = this.getEventTickets();
    return tickets.find(t => t.ticketCode.toUpperCase() === clean || t.id === code) || null;
  }

  addEventTicket(ticketData) {
    const newId = "tkt_" + Date.now();
    const code = ticketData.ticketCode || ("BL-TKT-" + (new Date()).getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
    const now = new Date();
    const createdAt = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0') + " " + String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');

    const newTicket = {
      id: newId,
      ticketCode: code,
      eventId: ticketData.eventId || "",
      eventTitle: ticketData.eventTitle || "Kegiatan Resmi Bursa Limbah",
      eventDate: ticketData.eventDate || "",
      eventTime: ticketData.eventTime || "",
      eventLocation: ticketData.eventLocation || "",
      ticketType: ticketData.ticketType || "entry",
      ticketTypeLabel: ticketData.ticketTypeLabel || "Tiket Masuk Resmi (Entrance Pass)",
      holderName: ticketData.holderName || "Tamu Undangan",
      companyName: ticketData.companyName || "-",
      phone: ticketData.phone || "",
      email: ticketData.email || "",
      gateOrSeat: ticketData.gateOrSeat || "Gate Masuk Utama",
      notes: ticketData.notes || "Tunjukkan kode QR ini pada petugas untuk validasi.",
      status: ticketData.status || "issued",
      checkedInAt: ticketData.status === 'checked_in' ? createdAt : null,
      createdAt: createdAt
    };

    if (!this.state.eventTickets) this.state.eventTickets = [];
    this.state.eventTickets.unshift(newTicket);
    this.save();
    return newTicket;
  }

  checkInEventTicket(ticketCodeOrId) {
    const ticket = this.getEventTicketByCode(ticketCodeOrId) || this.getEventTicketById(ticketCodeOrId);
    if (!ticket) return { success: false, message: "Kode tiket tidak ditemukan di sistem." };

    if (ticket.status === 'checked_in') {
      return { 
        success: false, 
        alreadyCheckedIn: true, 
        ticket, 
        message: `Tiket sudah divalidasi sebelumnya pada ${ticket.checkedInAt}.` 
      };
    }

    const now = new Date();
    const timeStr = String(now.getDate()).padStart(2, '0') + "/" + String(now.getMonth() + 1).padStart(2, '0') + "/" + now.getFullYear() + " " + String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + " WIB";
    
    ticket.status = 'checked_in';
    ticket.checkedInAt = timeStr;
    this.save();

    return {
      success: true,
      ticket,
      message: `Presensi Berhasil! ${ticket.holderName} resmi check-in pada ${timeStr}.`
    };
  }

  deleteEventTicket(id) {
    if (!this.state.eventTickets) return false;
    this.state.eventTickets = this.state.eventTickets.filter(t => t.id !== id);
    this.save();
    return true;
  }

  // ================= SUBSCRIPTION APPROVAL MANAGEMENT =================
  getSubscriptionRequests(status = 'all') {
    if (!this.state.subscriptionRequests) {
      this.state.subscriptionRequests = (typeof INITIAL_SUBSCRIPTION_REQUESTS !== 'undefined' ? [...INITIAL_SUBSCRIPTION_REQUESTS] : []);
      this.save();
    }
    if (status === 'all') {
      return this.state.subscriptionRequests;
    }
    return this.state.subscriptionRequests.filter(r => r.status === status);
  }

  getPendingSubscriptionRequestsCount() {
    return this.getSubscriptionRequests('pending').length;
  }

  createSubscriptionRequest(requestData) {
    const newId = "sub_req_" + Date.now();
    const tier = this.getSubscriptionTierById(requestData.tierId);
    const newRequest = {
      id: newId,
      userId: requestData.userId || (this.getCurrentUser() ? this.getCurrentUser().id : 'user_buyer_' + Date.now()),
      userName: requestData.userName || (this.getCurrentUser() ? this.getCurrentUser().name : "Pembeli Baru"),
      company: requestData.company || (this.getCurrentUser() ? this.getCurrentUser().company : "-"),
      email: requestData.email || "",
      phone: requestData.phone || "",
      tierId: requestData.tierId || "tier_pro",
      tierName: tier ? tier.name : "Paket Bisnis Pro",
      monthlyFee: tier ? tier.monthlyFee : 249000,
      paymentProof: requestData.paymentProof || "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80",
      paymentMethod: requestData.paymentMethod || "Transfer Rekening Bersama Escrow",
      requestedAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB',
      status: "pending",
      approvedAt: null
    };
    if (!this.state.subscriptionRequests) this.state.subscriptionRequests = [];
    this.state.subscriptionRequests.unshift(newRequest);
    this.save();
    return newRequest;
  }

  approveSubscriptionRequest(requestId) {
    const requests = this.getSubscriptionRequests('all');
    const req = requests.find(r => r.id === requestId);
    if (!req) return { success: false, message: "Permohonan tidak ditemukan" };

    req.status = "approved";
    req.approvedAt = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB';

    // Perbarui status paket langganan pengguna
    let user = this.state.users.find(u => u.id === req.userId || u.email === req.email);
    if (user) {
      user.subscriptionTier = req.tierId;
      user.subscriptionActive = true;
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      user.subscriptionExpiry = nextMonth.toISOString().split('T')[0];
    }
    this.save();
    return { success: true, request: req, user };
  }

  rejectSubscriptionRequest(requestId, reason = "Bukti transfer tidak valid atau belum masuk rekening") {
    const requests = this.getSubscriptionRequests('all');
    const req = requests.find(r => r.id === requestId);
    if (!req) return { success: false, message: "Permohonan tidak ditemukan" };

    req.status = "rejected";
    req.rejectReason = reason;
    this.save();
    return { success: true, request: req };
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
