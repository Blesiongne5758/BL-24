/**
 * Circulink Store & State Management (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontrol Admin Rentang Harga & Chat Interaktif
 */

const STORAGE_KEY = "circulink_state_v3";

class CirculinkStore {
  constructor() {
    this.initStore();
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
        activeUserId: "user_buyer_1",
        sellerUserId: "user_seller_1"
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
        }
        if (!this.state.users) this.state.users = [...INITIAL_USERS];
        if (!this.state.categories || this.state.categories.length === 0) {
          this.state.categories = [...INITIAL_CATEGORIES];
        }
        if (!this.state.buyerRequests || this.state.buyerRequests.length === 0) {
          this.state.buyerRequests = [...INITIAL_BUYER_REQUESTS];
        }
        if (!this.state.chats || this.state.chats.length === 0) {
          this.state.chats = [...INITIAL_CHATS];
        }
      } catch (e) {
        console.error("Error parsing local state, resetting to seed data", e);
        localStorage.removeItem(STORAGE_KEY);
        this.initStore();
      }
    }
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  resetData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("circulink_state_v1");
    localStorage.removeItem("circulink_state_v2");
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
      return this.state.users.find(u => u.id === this.state.activeUserId) || this.state.users[0];
    } else if (role === "seller") {
      return this.state.users.find(u => u.id === this.state.sellerUserId) || this.state.users[1];
    } else if (role === "admin") {
      return this.state.users.find(u => u.role === "admin") || this.state.users[3];
    }
    return null;
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

  registerBuyer({ name, email, phone, company, tierId }) {
    const newId = "user_buyer_" + Date.now();
    const chosenTierId = tierId || "tier_starter";
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const newUser = {
      id: newId,
      name: name || "Pembeli Baru Circulink",
      role: "buyer",
      email: email || `buyer_${Date.now()}@circulink.id`,
      phone: phone || "+62 812-0000-0000",
      company: company || "Perusahaan Pembeli",
      location: "Indonesia",
      subscriptionActive: true,
      subscriptionTier: chosenTierId,
      subscriptionExpiry: nextMonth.toISOString().split("T")[0]
    };

    this.state.users.push(newUser);
    this.state.activeUserId = newId;
    this.state.currentRole = "buyer";
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
      const isWithinLimit = isUnlimited || product.totalPrice <= tier.maxPriceLimit;

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
        prod.verifiedBy = "Tim Kurasi Mutu Circulink";
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
    const isDelivery = shippingMethod === 'circulink_delivery';
    const finalShippingFee = isDelivery ? (Number(shippingFee) || settings.shippingFlatFee || 250000) : 0;
    const totalPaidNow = downPaymentAmount + handlingFee + appFee + finalShippingFee;
    const remainingPayment = totalPrice - downPaymentAmount;

    // Snapshot data bank pengelola saat transaksi dibuat
    const escrowBankInfo = {
      bankName: settings.escrowBankName || "Bank Central Asia (BCA)",
      accountNumber: settings.escrowAccountNumber || "8271-9920-1122",
      accountHolder: settings.escrowAccountHolder || "PT Circulink Transaksi Sirkular (Rekening Bersama Escrow)",
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
      shippingMethod: isDelivery ? 'Jasa Pengiriman Mitra Circulink' : 'Armada Mandiri Pembeli',
      shippingFee: finalShippingFee,
      totalPaidNow,
      remainingPayment,
      escrowBankInfo,
      paymentStatus: "DP Terbayar (30%)",
      bookingStatus: "Jadwal Pengambilan Armada",
      pickupDate: pickupDate || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
      createdAt: now,
      qrCodeTrace: `CIR-TRACE-${bookingCode}-${product.code}`,
      notes: notes || "Booking terkonfirmasi via Rekening Bersama (Escrow) Circulink."
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
window.circulinkStore = new CirculinkStore();
