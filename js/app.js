// SPDX-License-Identifier: MIT
/**
 * BURSA LIMBAH Application Logic (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontrol Admin Rentang Harga & Fitur Layar Chat Interaktif
 */

// =================================================================
// UTILITY: HTML Escaping untuk mencegah XSS (Cross-Site Scripting)
// Wajib digunakan pada setiap data dari pengguna/database yang
// dirender ke dalam innerHTML menggunakan template literal.
// =================================================================
/**
 * Mengkoversi karakter HTML berbahaya menjadi HTML entities yang aman.
 * @param {any} str - Nilai yang akan di-escape
 * @returns {string} String yang sudah aman untuk dimasukkan ke innerHTML
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'`]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  })[ch]);
}
// Alias pendek untuk kemudahan penggunaan di template literal
const esc = escapeHtml;

class BursaLimbahApp {
  constructor() {
    this.store = window.bursaLimbahStore || window.circulinkStore;
    this.esc = esc;
    this.activeModalMap = null;
    this.currentBuyerTab = 'market';
    this.currentAdminTab = 'verification';
    this.currentLoginTab = 'buyer';
    this.currentAppTab = 'home'; // 'home', 'sell', 'sub', 'sim'
    this.currentAdminSubFilter = 'all'; // 'all', 'pending', 'approved'
    this.publicPostingFilter = 'all'; // 'all', 'supply', 'demand'
    this.selectedRegisterTier = 'tier_pro'; // Default dipilih di modal registrasi
    this.currentChatProduct = null;
    this.currentChatSeller = null;
    this.chatOpen = false;
    this.marketCurrencies = null;
    this.tickerRefreshTimer = null;
    this.termsAcceptedForRegistration = null;
  }

  init() {
    window.addEventListener('bursalimbah:settings-synced', () => {
      this.renderPriceTicker();
      this.fetchLiveMarketRates();
      this.renderFooterSupport();
    });
    this.renderPriceTicker();
    this.fetchLiveMarketRates();
    this.renderFooterSupport();
    this.renderPublicCategories();
    this.setupCalculator();
    this.populateSelectCategories();
    this.renderPublicPostings();
    this.renderPublicSubscriptionTiers();
    this.renderEvents('semua');

    // Set peran awal dari data store
    const currentRole = this.store.getCurrentRole();
    this.setRole(currentRole, false);
    this.switchAppTab('home');

    // Render tampilan modul awal
    this.renderBuyerMarketplace();
    this.renderSellerDashboard();
    this.renderAdminDashboard();
    this.updateAdminPendingBadge();
    this.updateAdminSubPendingBadge();
    this.updateAdminTicketsBadge();
    this.updateChatUnreadBadge();
    this.updateNavUI();
    this.applyFeatureFlags();
    this.updateCryptoNavBadge();
  }

  // ================= FUNGSI BANTU & FORMATTER =================
  formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  bottomNavClass(navKey, isActive = false) {
    const createModifier = navKey === 'sell' ? ' bnav-create' : '';
    const state = isActive ? 'text-emerald-700 font-bold active' : 'text-slate-500 font-medium';
    return `bnav-item${createModifier} flex flex-col items-center justify-center py-1 ${state} active:scale-90 transition cursor-pointer`;
  }

  getCity(item) {
    if (!item) return "-";
    if (item.city) return item.city;
    if (this.store && this.store.extractCity) {
      return this.store.extractCity(item.address || item.origin);
    }
    return item.origin || "Indonesia";
  }

  showToast(message, type = 'success') {
    const container = [REDACTED]'toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isWarning = type === 'warning';

    let bgClass = 'bg-slate-900 border-slate-700 text-white';
    let iconClass = 'fa-solid fa-circle-check text-emerald-400';

    if (isSuccess) {
      bgClass = 'bg-slate-900 border-emerald-500/50 text-white';
      iconClass = 'fa-solid fa-circle-check text-emerald-400';
    } else if (isError) {
      bgClass = 'bg-rose-900 border-rose-600 text-white';
      iconClass = 'fa-solid fa-triangle-exclamation text-rose-300';
    } else if (isWarning) {
      bgClass = 'bg-amber-900 border-amber-500 text-white';
      iconClass = 'fa-solid fa-bell text-amber-300';
    }

    toast.className = `p-4 rounded-2xl shadow-xl border flex items-center space-x-3 text-xs font-semibold max-w-sm pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${bgClass}`;
    toast.innerHTML = `
      <i class="${iconClass} text-base shrink-0"></i>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white ml-2 text-sm">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }

  navigateToBuyer() {
    if (this.store.isBuyerAuthenticated()) {
      this.setRole('buyer');
    } else {
      this.showLoginPage('buyer');
      this.showToast("Akses Terbatas: Silakan masuk ke akun Pembeli terlebih dahulu.", "warning");
    }
  }

  navigateToSeller() {
    if (this.store.isSellerAuthenticated()) {
      this.setRole('seller');
    } else {
      this.showLoginPage('seller');
      this.showToast("Akses Terbatas: Silakan masuk ke akun Penjual terlebih dahulu.", "warning");
    }
  }

  navigateToAdmin() {
    if (this.store.isAdminAuthenticated()) {
      this.setRole('admin');
    } else {
      this.showLoginPage('admin');
      this.showToast("Akses Terbatas: Silakan masuk sebagai Pengelola (Admin) terlebih dahulu.", "warning");
    }
  }

  // ================= PENGALIH PERAN PENGGUNA (ROLE SWITCHER) =================
  setRole(role, notify = true) {
    // Proteksi Keamanan: Akses Portal Pembeli memerlukan autentikasi login pembeli
    if (role === 'buyer' && !this.store.isBuyerAuthenticated()) {
      this.showLoginPage('buyer');
      this.showToast("Akses Terbatas: Silakan masuk ke akun Pembeli terlebih dahulu.", "warning");
      return;
    }

    // Proteksi Keamanan: Akses Dashboard Penjual memerlukan autentikasi login penjual
    if (role === 'seller' && !this.store.isSellerAuthenticated()) {
      this.showLoginPage('seller');
      this.showToast("Akses Terbatas: Silakan masuk ke akun Penjual terlebih dahulu.", "warning");
      return;
    }

    // Proteksi Keamanan: Akses Dashboard Admin memerlukan autentikasi login pengelola
    if (role === 'admin' && !this.store.isAdminAuthenticated()) {
      this.showLoginPage('admin');
      this.showToast("Akses Terbatas: Masuk sebagai Pengelola (Admin) terlebih dahulu.", "warning");
      return;
    }

    this.store.setCurrentRole(role);

    // Perbarui gaya tombol navigasi peran (Desktop & Mobile Sub-bar)
    const roles = ['public', 'buyer', 'seller', 'admin'];
    roles.forEach(r => {
      const btn = [REDACTED]`role-btn-${r}`);
      if (btn) {
        if (r === role) {
          btn.className = 'px-2.5 py-1 text-xs font-bold rounded-lg transition shadow-sm bg-white text-brand-700 border border-slate-200';
        } else {
          btn.className = 'px-2.5 py-1 text-xs font-medium rounded-lg transition text-slate-600 hover:text-slate-900';
        }
      }

      const mobPill = [REDACTED]`mob-role-${r}`);
      if (mobPill) {
        if (r === role) {
          mobPill.className = 'mobile-role-pill active flex-1 py-1.5 px-1 rounded-lg text-center text-[11px] transition';
        } else {
          mobPill.className = 'mobile-role-pill flex-1 py-1.5 px-1 rounded-lg text-center text-[11px] text-slate-600 transition';
        }
      }
    });

    // Perbarui status aktif tombol mobile dock
    const dockHome = [REDACTED]'mob-dock-home');
    const dockAccount = [REDACTED]'mob-dock-account');
    if (dockHome && dockAccount) {
      if (role === 'public') {
        dockHome.classList.add('active');
        dockAccount.classList.remove('active');
      } else {
        dockHome.classList.remove('active');
        dockAccount.classList.add('active');
      }
    }

    // Sembunyikan semua tab konten
    ['public', 'buyer', 'seller', 'admin', 'login'].forEach(r => {
      const view = [REDACTED]`view-${r}`);
      if (view) view.classList.add('hidden');
    });

    // Tampilkan tampilan yang dipilih
    const activeView = [REDACTED]`view-${role}`);
    if (activeView) activeView.classList.remove('hidden');

    // Perbarui Banner Konteks Peran
    const banner = [REDACTED]'role-context-banner');
    const roleTitle = [REDACTED]'role-context-title');
    const roleDesc = [REDACTED]'role-context-desc');
    const roleActions = [REDACTED]'role-context-actions');
    const roleIcon = [REDACTED]'role-badge-icon');

    if (role === 'public' || role === 'login') {
      if (banner) banner.classList.add('hidden');
    } else {
      if (banner) banner.classList.remove('hidden');
      const user = this.store.getCurrentUser();

      if (role === 'buyer' && user) {
        const tier = this.store.getUserSubscriptionTier(user);
        const limitText = (!tier.maxPriceLimit || tier.maxPriceLimit === 0) 
          ? 'Unlimited (Semua Nilai Transaksi)' 
          : `Maksimal Nilai: ${this.formatRupiah(tier.maxPriceLimit)}`;

        if (roleIcon) roleIcon.innerHTML = '<i class="fa-solid fa-crown text-amber-300"></i>';
        if (roleTitle) roleTitle.textContent = `Akun Pembeli: ${esc(user.name)}`;
        if (roleDesc) roleDesc.textContent = `Paket: ${esc(tier.name)} (${limitText}) • Alamat: ${tier.allowAddress === 'full' ? 'Lengkap' : 'Kota'} • GPS: ${tier.allowGpsMap ? 'Aktif' : 'Terkunci'} • WA: ${tier.allowWhatsapp ? 'Aktif' : 'Chat Saja'}`;
        if (roleActions) {
          roleActions.innerHTML = `
            <button onclick="app.showUserProfileModal()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold transition flex items-center space-x-1">
              <i class="fa-solid fa-gear text-emerald-400"></i>
              <span>Pengaturan Profil</span>
            </button>
            <button onclick="app.showBuyerRegisterModal()" class="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-bold transition flex items-center space-x-1">
              <i class="fa-solid fa-crown text-amber-300"></i>
              <span>Ganti Tier</span>
            </button>
            <button onclick="app.logout()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600 text-white font-semibold transition flex items-center space-x-1">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Keluar</span>
            </button>
          `;
        }

        // Update heading pada halaman view-buyer
        const buyerHeading = [REDACTED]'buyer-company-name-heading');
        if (buyerHeading) buyerHeading.textContent = `Portal Akun Pembeli: ${esc(user.company || user.name)}`;
      } else if (role === 'seller' && user) {
        if (roleIcon) roleIcon.innerHTML = '<i class="fa-solid fa-store text-emerald-300"></i>';
        if (roleTitle) roleTitle.textContent = `Akun Penjual: ${esc(user.name)}`;
        if (roleDesc) roleDesc.textContent = `Status: ${esc(user.verifiedBadge)} • Saldo Penjualan: ${this.formatRupiah(user.balance)}`;
        if (roleActions) {
          roleActions.innerHTML = `
            <button onclick="app.showUserProfileModal()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold transition flex items-center space-x-1">
              <i class="fa-solid fa-gear text-emerald-400"></i>
              <span>Pengaturan Profil</span>
            </button>
            <button onclick="app.showUploadModal()" class="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-bold transition">
              + Unggah Pasokan
            </button>
            <button onclick="app.logout()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600 text-white font-semibold transition flex items-center space-x-1">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Keluar</span>
            </button>
          `;
        }

        // Update header profil di view-seller
        const sellerName = [REDACTED]'seller-profile-name');
        const sellerMeta = [REDACTED]'seller-profile-meta');
        const sellerBadge = [REDACTED]'seller-badge-pill');
        if (sellerName) sellerName.textContent = user.name;
        if (sellerMeta) sellerMeta.textContent = `Email: ${esc(user.email || '-')} • Lokasi: ${esc(user.location || '-')} • Rekening: ${esc(user.bankAccount || '-')}`;
        if (sellerBadge) sellerBadge.textContent = user.verifiedBadge || 'Pemasok Terverifikasi';
      } else if (role === 'admin') {
        if (roleIcon) roleIcon.innerHTML = '<i class="fa-solid fa-user-shield text-amber-300"></i>';
        if (roleTitle) roleTitle.textContent = 'Peran Pengelola: Pusat Kontrol BURSA LIMBAH';
        if (roleDesc) roleDesc.textContent = 'Otoritas: Kurasi Mutu, Audit Escrow DP, & Atur Batas Rentang Nilai Jual 3-Tier';
        if (roleActions) {
          roleActions.innerHTML = `
            <button onclick="app.resetDemoData()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium">
              Reset Data Demo
            </button>
            <button onclick="app.logout()" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-600 text-white font-semibold transition flex items-center space-x-1">
              <i class="fa-solid fa-right-from-bracket"></i>
              <span>Keluar</span>
            </button>
          `;
        }
      }
    }

    // ===== PERBARUI STATE BOTTOM NAV BARU (Cari/Event/Pesan/Saya) =====
    // Saat masuk ke role dashboard, hapus highlight aktif di bottom nav baru
    if (['buyer', 'seller', 'admin', 'login'].includes(role)) {
      ['home', 'cari', 'pesan', 'saya', 'sell'].forEach(k => {
        const btn = [REDACTED]`bnav-${k}`);
        if (btn) {
          btn.className = this.bottomNavClass(k);
          btn.removeAttribute('aria-current');
        }
      });
    }

    // ===== PERBARUI NAVIGASI =====
    this.updateNavUI();

    // Muat ulang data tampilan yang aktif
    if (role === 'public') this.renderPublicPostings();
    if (role === 'buyer') this.renderBuyerMarketplace();
    if (role === 'seller') this.renderSellerDashboard();
    if (role === 'admin') this.renderAdminDashboard();
    if (role === 'login') this.renderLoginPage();
    this.renderFooterSupport();

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (notify) {
      const names = {
        public: 'Halaman Publik (Data Harga & GPS Terproteksi)',
        buyer: 'Portal Pembeli (Akses Sesuai Tier Berlangganan)',
        seller: 'Dashboard Penjual (Unggah Pasokan & Kontak)',
        admin: 'Pusat Pengelola (Atur Batas Rentang 3-Tier)',
        login: 'Halaman Masuk Akun Penjual & Pembeli'
      };
      this.showToast(`Beralih ke: ${names[role] || role}`);
    }
  }

  // ================= NAVIGASI & HEADER DOKUMEN =================
  updateNavUI() {
    this.updateCryptoNavBadge();
    const navContainer = [REDACTED]'nav-action-container');
    if (!navContainer) return;

    const role = this.store.getCurrentRole();
    const user = this.store.getCurrentUser();

    if (role === 'buyer' && user) {
      navContainer.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <i class="fa-solid fa-crown text-amber-500"></i>
            <span class="truncate max-w-[140px]">${esc(user.company || user.name)}</span>
          </div>
          <button onclick="app.setRole('buyer')" class="px-3 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition flex items-center space-x-1">
            <i class="fa-solid fa-store"></i>
            <span>Bursa Pembeli</span>
          </button>
          <button onclick="app.showUserProfileModal()" title="Profil & Verifikasi Akun" class="px-2.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 transition flex items-center space-x-1 shadow-2xs">
            <i class="fa-solid fa-id-card text-emerald-600"></i>
            <span class="hidden md:inline">Profil</span>
          </button>
          <button onclick="app.logout()" title="Keluar dari akun" class="p-2 text-xs rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else if (role === 'seller' && user) {
      navContainer.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
            <i class="fa-solid fa-store text-emerald-600"></i>
            <span class="truncate max-w-[140px]">${esc(user.name)}</span>
          </div>
          <button onclick="app.setRole('seller')" class="px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition flex items-center space-x-1">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Dashboard Penjual</span>
          </button>
          <button onclick="app.showUserProfileModal()" title="Profil & Verifikasi Akun" class="px-2.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 transition flex items-center space-x-1 shadow-2xs">
            <i class="fa-solid fa-id-card text-emerald-600"></i>
            <span class="hidden md:inline">Profil</span>
          </button>
          <button onclick="app.logout()" title="Keluar dari akun" class="p-2 text-xs rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else if (role === 'admin') {
      navContainer.innerHTML = `
        <div class="flex items-center space-x-2">
          <button onclick="app.navigateToAdmin()" class="px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-amber-300 shadow-sm transition flex items-center space-x-1.5 border border-amber-400/30">
            <i class="fa-solid fa-user-shield text-amber-400"></i>
            <span>Pusat Pengelola</span>
          </button>
          <button onclick="app.logout()" title="Keluar dari akun pengelola" class="p-2 text-xs rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else {
      navContainer.innerHTML = `
        <button onclick="app.showLoginPage()" class="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 bg-white text-slate-700 shadow-sm transition flex items-center space-x-1.5">
          <i class="fa-solid fa-right-to-bracket text-emerald-600"></i>
          <span>Masuk</span>
        </button>
        <button onclick="app.showRegisterOptions()" class="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center space-x-1.5">
          <i class="fa-solid fa-user-plus text-amber-300"></i>
          <span>Daftar</span>
        </button>
      `;
    }

    // Perbarui indikator tombol di navbar (apakah terkunci / butuh login)
    const buyerRoleBtn = [REDACTED]'role-btn-buyer');
    if (buyerRoleBtn) {
      const isAuth = this.store.isBuyerAuthenticated();
      buyerRoleBtn.innerHTML = `
        <i class="fa-solid ${isAuth ? 'fa-crown text-amber-500' : 'fa-lock text-slate-400'} text-[9px] mr-1"></i>
        <span>Pembeli</span>
      `;
    }

    const sellerRoleBtn = [REDACTED]'role-btn-seller');
    if (sellerRoleBtn) {
      const isAuth = this.store.isSellerAuthenticated();
      sellerRoleBtn.innerHTML = `
        <i class="fa-solid ${isAuth ? 'fa-store text-emerald-600' : 'fa-lock text-slate-400'} text-[9px] mr-1"></i>
        <span>Penjual</span>
      `;
    }

    const adminRoleBtn = [REDACTED]'role-btn-admin');
    if (adminRoleBtn) {
      const isAuth = this.store.isAdminAuthenticated();
      adminRoleBtn.innerHTML = `
        <i class="fa-solid ${isAuth ? 'fa-user-shield text-amber-500' : 'fa-lock text-slate-400'} text-[9px] mr-1"></i>
        <span>Pengelola</span>
        <span id="admin-pending-pill" class="px-1.5 bg-amber-500 text-white text-[9px] rounded-full hidden">0</span>
      `;
    }

    // Perbarui status icon dan label pada Mobile Bottom Nav
    const mobUserIcon = [REDACTED]'mobile-nav-user-icon');
    const mobUserLabel = [REDACTED]'mobile-nav-user-label');
    if (mobUserIcon && mobUserLabel) {
      if (role === 'buyer' && user) {
        mobUserIcon.innerHTML = `<i class="fa-solid fa-crown text-amber-500 text-xs"></i>`;
        mobUserLabel.textContent = 'Pembeli';
        mobUserLabel.className = 'text-[10px] font-bold mt-0.5 tracking-tight text-emerald-700';
      } else if (role === 'seller' && user) {
        mobUserIcon.innerHTML = `<i class="fa-solid fa-store text-emerald-600 text-xs"></i>`;
        mobUserLabel.textContent = 'Penjual';
        mobUserLabel.className = 'text-[10px] font-bold mt-0.5 tracking-tight text-slate-900';
      } else if (role === 'admin') {
        mobUserIcon.innerHTML = `<i class="fa-solid fa-user-shield text-amber-600 text-xs"></i>`;
        mobUserLabel.textContent = 'Admin';
        mobUserLabel.className = 'text-[10px] font-bold mt-0.5 tracking-tight text-amber-700';
      } else {
        mobUserIcon.innerHTML = `<i class="fa-solid fa-user text-slate-700 text-xs"></i>`;
        mobUserLabel.textContent = 'Akun';
        mobUserLabel.className = 'text-[10px] font-bold mt-0.5 tracking-tight text-slate-800';
      }
    }
  }

  // ================= MODUL AUTENTIKASI & HALAMAN LOGIN =================
  showLoginPage(role = 'buyer') {
    this.currentLoginTab = role;
    this.setRole('login', false);
  }

  switchLoginTab(role) {
    this.currentLoginTab = role;
    this.renderLoginPage();
  }

  renderLoginPage() {
    const tab = this.currentLoginTab;

    // Update Tombol Tab
    const btnBuyer = [REDACTED]'login-tab-btn-buyer');
    const btnSeller = [REDACTED]'login-tab-btn-seller');
    const btnAdmin = [REDACTED]'login-tab-btn-admin');
    const checkBuyer = [REDACTED]'login-tab-check-buyer');
    const checkSeller = [REDACTED]'login-tab-check-seller');
    const checkAdmin = [REDACTED]'login-tab-check-admin');

    const defaultStyle = 'p-5 rounded-2xl border-2 border-slate-200 bg-white text-left transition relative shadow-sm hover:border-slate-300 hover:shadow group focus:outline-none';

    if (btnBuyer) btnBuyer.className = (tab === 'buyer') ? 'p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/80 text-left transition relative shadow-sm hover:shadow group focus:outline-none' : defaultStyle;
    if (btnSeller) btnSeller.className = (tab === 'seller') ? 'p-5 rounded-2xl border-2 border-slate-800 bg-slate-50 text-left transition relative shadow-sm hover:shadow group focus:outline-none' : defaultStyle;
    if (btnAdmin) btnAdmin.className = (tab === 'admin') ? 'p-5 rounded-2xl border-2 border-amber-500 bg-amber-50/80 text-left transition relative shadow-sm hover:shadow group focus:outline-none' : defaultStyle;

    if (checkBuyer) checkBuyer.classList.toggle('hidden', tab !== 'buyer');
    if (checkSeller) checkSeller.classList.toggle('hidden', tab !== 'seller');
    if (checkAdmin) checkAdmin.classList.toggle('hidden', tab !== 'admin');

    // Update Banner Kartu
    const banner = [REDACTED]'login-form-banner');
    const title = [REDACTED]'login-form-title');
    const subtitle = [REDACTED]'login-form-subtitle');
    const badge = [REDACTED]'login-form-badge');
    const icon = [REDACTED]'login-form-icon');
    const hint = [REDACTED]'login-hint-role');
    const inputIdentifier = [REDACTED]'login-input-identifier');
    const submitLabel = [REDACTED]'login-submit-label');
    const submitBtn = [REDACTED]'login-submit-btn');
    const prompt = [REDACTED]'login-register-prompt');
    const identifierLabel = [REDACTED]'login-identifier-label');
    const sellerInfoBanner = [REDACTED]'seller-auto-register-info');

    if (tab === 'buyer') {
      if (banner) banner.className = 'px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between';
      if (title) title.textContent = 'Masuk sebagai Pembeli';
      if (subtitle) subtitle.textContent = 'Buka katalog, harga terverifikasi, & tiket timbang';
      if (badge) {
        badge.textContent = 'PORTAL PEMBELI';
        badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white border border-white/30';
      }
      if (icon) icon.className = 'fa-solid fa-crown text-amber-300';
      if (hint) {
        hint.textContent = 'Akun Pembeli';
        hint.className = 'text-[11px] font-semibold text-emerald-700';
      }
      if (identifierLabel) identifierLabel.textContent = 'Email Terdaftar / Nomor WhatsApp *';
      if (inputIdentifier) inputIdentifier.placeholder = 'pengadaan@hijaulestari.co.id';
      if (submitLabel) submitLabel.textContent = 'Masuk ke Portal Pembeli';
      if (submitBtn) submitBtn.className = 'w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition transform active:scale-95 flex items-center justify-center space-x-2';
      if (sellerInfoBanner) sellerInfoBanner.classList.add('hidden');
      if (prompt) {
        prompt.innerHTML = `
          Belum memiliki akun Pembeli?
          <button type="button" onclick="app.showBuyerRegisterModal()" class="text-emerald-700 font-bold hover:underline ml-1">
            Daftar & Berlangganan 3-Tier →
          </button>
        `;
      }
    } else if (tab === 'seller') {
      if (banner) banner.className = 'px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between';
      if (title) title.textContent = 'Masuk / Daftar sebagai Penjual';
      if (subtitle) subtitle.textContent = 'Login akun lama atau daftar baru instan cukup dengan memasukkan email aktif';
      if (badge) {
        badge.textContent = 'PORTAL MITRA PENJUAL';
        badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-500/40';
      }
      if (icon) icon.className = 'fa-solid fa-store text-emerald-300';
      if (hint) {
        hint.textContent = 'Login / Daftar dengan Email';
        hint.className = 'text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200';
      }
      if (identifierLabel) identifierLabel.textContent = 'Email Penjual (Baru / Terdaftar) *';
      if (inputIdentifier) inputIdentifier.placeholder = 'contoh: budi@sentrajelantah.id atau email baru';
      if (submitLabel) submitLabel.textContent = 'Masuk / Daftar sebagai Penjual';
      if (submitBtn) submitBtn.className = 'w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-sm shadow-lg shadow-slate-900/25 transition transform active:scale-95 flex items-center justify-center space-x-2';
      if (sellerInfoBanner) sellerInfoBanner.classList.remove('hidden');
      if (prompt) {
        prompt.innerHTML = `
          <div class="space-y-1">
            <p class="text-xs text-slate-600">
              💡 <strong>Email baru?</strong> Cukup ketik email & kata sandi di atas, akun Mitra Penjual akan <strong>otomatis dibuat</strong>.
            </p>
            <p class="text-[11px] text-slate-500">
              Ingin mendaftar lengkap dengan data NIB & rekening bank?
              <button type="button" onclick="app.showSellerRegisterModal()" class="text-emerald-700 font-bold hover:underline ml-1">
                Buka Formulir Pemasok Lengkap →
              </button>
            </p>
          </div>
        `;
      }
    } else if (tab === 'admin') {
      if (banner) banner.className = 'px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between';
      if (title) title.textContent = 'Masuk Pusat Pengelola (Admin)';
      if (subtitle) subtitle.textContent = 'Akses terbatas: kurasi pasokan, audit escrow, & kontrol 3-tier';
      if (badge) {
        badge.textContent = 'PUSAT PENGELOLA';
        badge.className = 'px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30';
      }
      if (icon) icon.className = 'fa-solid fa-user-shield text-amber-400';
      if (hint) {
        hint.textContent = 'Akun Administrator Utama';
        hint.className = 'text-[11px] font-semibold text-amber-700';
      }
      if (identifierLabel) identifierLabel.textContent = 'Email Administrator *';
      if (inputIdentifier) inputIdentifier.placeholder = 'admin@bursalimbah.com';
      if (submitLabel) submitLabel.textContent = 'Masuk ke Dashboard Pengelola';
      if (submitBtn) submitBtn.className = 'w-full py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-sm shadow-lg shadow-slate-950/30 border border-amber-400/30 transition transform active:scale-95 flex items-center justify-center space-x-2';
      if (sellerInfoBanner) sellerInfoBanner.classList.add('hidden');
      if (prompt) {
        prompt.innerHTML = `
          <div class="text-slate-500 text-xs flex items-center justify-center space-x-1.5 py-1">
            <i class="fa-solid fa-lock text-amber-600 text-[11px]"></i>
            <span>Area Terbatas: Khusus administrator & staf resmi Bursa Limbah.</span>
          </div>
        `;
      }
    }

    // Sembunyikan notifikasi error sebelumnya
    const alertBox = [REDACTED]'login-alert-box');
    if (alertBox) alertBox.classList.add('hidden');

    this.renderQuickLoginAccounts();
  }

  renderQuickLoginAccounts() {
    const container = [REDACTED]'login-quick-accounts-container');
    if (!container) return;

    const tab = this.currentLoginTab;

    if (tab === 'buyer') {
      container.innerHTML = `
        <button type="button" onclick="app.quickLogin('pengadaan@hijaulestari.co.id', '[REDACTED]', 'buyer')" class="p-3 text-left rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 hover:border-emerald-300 transition group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900 group-hover:text-emerald-900">PT Hijau Lestari Biofuel</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold">Tier Pro</span>
          </div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">pengadaan@hijaulestari.co.id</div>
        </button>

        <button type="button" onclick="app.quickLogin('purchasing@daurnusantara.co.id', '[REDACTED]', 'buyer')" class="p-3 text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900 group-hover:text-emerald-900">PT Daur Nusantara</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">Tier Enterprise</span>
          </div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">purchasing@daurnusantara.co.id</div>
        </button>
      `;
    } else if (tab === 'seller') {
      container.innerHTML = `
        <button type="button" onclick="app.quickLogin('budi@sentrajelantah.id', '[REDACTED]', 'seller')" class="p-3 text-left rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 transition group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900">Budi Santoso</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Pengepul Jelantah</span>
          </div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">budi@sentrajelantah.id • Login</div>
        </button>

        <button type="button" onclick="app.quickLogin('dwigraha@rongsok.co.id', '[REDACTED]', 'seller')" class="p-3 text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition group">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-900">PT Dwi Graha</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Pemasok Logam</span>
          </div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">dwigraha@rongsok.co.id • Login</div>
        </button>

        <button type="button" onclick="app.quickRegisterNewSellerDemo()" class="p-3 text-left rounded-xl border border-dashed border-emerald-500 bg-emerald-50/80 hover:bg-emerald-100 transition group sm:col-span-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <i class="fa-solid fa-user-plus text-emerald-600 text-xs"></i>
              <span class="text-xs font-bold text-emerald-900">Simulasi Daftar Penjual Baru via Email</span>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold">1-Klik Auto-Daftar</span>
          </div>
          <div class="text-[11px] text-slate-600 mt-0.5">Klik untuk membuat akun mitra penjual baru secara instan dengan email demo</div>
        </button>
      `;
    } else if (tab === 'admin') {
      container.innerHTML = `
        <button type="button" onclick="app.quickLogin('admin@bursalimbah.com', 'admin', 'admin')" class="p-3.5 text-left rounded-xl border border-amber-300/80 bg-amber-50/80 hover:bg-amber-100/90 transition group flex items-center justify-between">
          <div>
            <div class="flex items-center space-x-1.5">
              <i class="fa-solid fa-key text-amber-600 text-xs"></i>
              <span class="text-xs font-bold text-slate-900 group-hover:text-amber-950">Pengelola Utama Bursa Limbah</span>
            </div>
            <div class="text-[11px] text-slate-500 font-mono mt-0.5">admin@bursalimbah.com • Sandi: admin</div>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 font-bold">Akses Penuh</span>
        </button>
      `;
    }
  }

  quickRegisterNewSellerDemo() {
    const randId = Math.floor(100 + Math.random() * 900);
    const demoEmail = `penjual.mitra${randId}@sentralimbah.id`;
    const demoPass = '[REDACTED]';
    const inputId = [REDACTED]'login-input-identifier');
    const inputPass = [REDACTED]'login-input-password');
    if (inputId) inputId.value = demoEmail;
    if (inputPass) inputPass.value = demoPass;
    this.quickLogin(demoEmail, demoPass, 'seller');
  }

  async quickLogin(identifier, password, role) {
    const inputId = [REDACTED]'login-input-identifier');
    const inputPass = [REDACTED]'login-input-password');
    if (inputId) inputId.value = identifier;
    if (inputPass) inputPass.value = password;

    const res = await this.store.loginUserAsync(identifier, password, role);
    if (res.success) {
      this.triggerConfetti();
      if (res.isNewAccount) {
        if (res.role === 'seller') {
          this.showToast(`🎉 Pendaftaran berhasil! Selamat datang Mitra Penjual baru (${res.user.email}).`, 'success');
        } else {
          this.showToast(`🎉 Pendaftaran berhasil! Akun Pembeli (${res.user.email}) aktif dengan Starter Tier Gratis.`, 'success');
        }
      } else {
        this.showToast(`Berhasil masuk sebagai ${res.user.name}!`, 'success');
      }
      this.setRole(role, false);
    } else {
      this.showToast(res.message, 'error');
    }
  }

  async handleLoginFormSubmit(event) {
    event.preventDefault();
    const identifier = [REDACTED]'login-input-identifier').value.trim();
    const password = [REDACTED]'login-input-password').value;

    const res = await this.store.loginUserAsync(identifier, password, this.currentLoginTab);

    const alertBox = [REDACTED]'login-alert-box');
    const alertMsg = [REDACTED]'login-alert-msg');

    if (res.success) {
      if (alertBox) alertBox.classList.add('hidden');
      this.triggerConfetti();
      if (res.isNewAccount) {
        if (res.role === 'seller') {
          this.showToast(`🎉 Pendaftaran berhasil! Selamat datang Mitra Penjual baru (${res.user.email}).`, 'success');
        } else {
          this.showToast(`🎉 Pendaftaran berhasil! Akun Pembeli (${res.user.email}) aktif dengan Starter Tier Gratis.`, 'success');
        }
      } else {
        this.showToast(`Selamat datang kembali, ${res.user.name}!`, 'success');
      }
      this.setRole(res.role, false);
    } else {
      if (alertBox) {
        alertBox.classList.remove('hidden');
        if (alertMsg) alertMsg.textContent = res.message;
      }
      this.showToast(res.message, 'error');
    }
  }

  togglePasswordVisibility(inputId, btn) {
    const input = [REDACTED]inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btn) {
      btn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    }
  }

  showForgotPasswordInfo() {
    alert("Bantuan Kata Sandi:\n\nSeluruh akun demo dapat diakses menggunakan kata sandi bawaan: [REDACTED].\n\nJika Anda membutuhkan pengaturan ulang akun produksi, silakan hubungi tim dukungan Bursa Limbah di kemitraan@bursalimbah.com.");
  }

  showRegisterOptions() {
    const modal = [REDACTED]'modal-register-choice');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  showRegistrationTerms(role, preferredTierId = null) {
    this.pendingRegistration = { role, preferredTierId };
    const settings = this.store.getSettings();
    const modal = [REDACTED]'modal-registration-terms');
    if (!modal) return;
    [REDACTED]'registration-terms-title').textContent = settings.termsTitle || 'Syarat dan Ketentuan';
    [REDACTED]'registration-terms-version').textContent = `Versi ${settings.termsVersion || '1.0'}`;
    [REDACTED]'registration-terms-content').textContent = settings.termsContent || '';
    [REDACTED]'registration-terms-role').textContent = role === 'seller' ? 'Penjual' : 'Pembeli';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  cancelRegistrationTerms() {
    this.pendingRegistration = null;
    const modal = [REDACTED]'modal-registration-terms');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  acceptRegistrationTerms() {
    const pending = this.pendingRegistration;
    if (!pending) return;
    this.termsAcceptedForRegistration = pending.role;
    this.cancelRegistrationTerms();
    if (pending.role === 'seller') this.showSellerRegisterModal(true);
    else this.showBuyerRegisterModal(pending.preferredTierId, true);
  }

  showSellerRegisterModal(termsApproved = false) {
    const currentUser = this.store.getCurrentUser();
    if (!termsApproved && !(currentUser && currentUser.role === 'seller')) {
      this.showRegistrationTerms('seller');
      return;
    }
    const modal = [REDACTED]'modal-seller-register');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  async handleSellerRegister(event) {
    event.preventDefault();
    if (this.termsAcceptedForRegistration !== 'seller') {
      this.showRegistrationTerms('seller');
      this.showToast('Setujui Syarat dan Ketentuan sebelum mendaftar.', 'warning');
      return;
    }
    const email = [REDACTED]'reg-seller-email').value.trim();
    const name = [REDACTED]'reg-seller-name').value.trim();
    const phone = [REDACTED]'reg-seller-phone').value.trim();
    const password = [REDACTED]'reg-seller-password') ? [REDACTED]'reg-seller-password').value : '[REDACTED]';

    const company = name; // Default nama usaha sama dengan nama pengguna
    const location = 'Indonesia';
    const bankAccount = '-';

    const existing = this.store.state.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.role === 'seller') {
        this.showToast(`Email ${email} sudah terdaftar. Silakan langsung masuk.`, 'info');
        this.closeModals();
        this.showLoginPage('seller');
        const inputId = [REDACTED]'login-input-identifier');
        if (inputId) inputId.value = email;
        return;
      } else {
        this.showToast(`Email ${email} sudah terdaftar sebagai ${existing.role === 'buyer' ? 'Pembeli' : 'Pengelola'}.`, 'error');
        return;
      }
    }

    const res = await this.store.registerSellerAsync({
      company,
      name,
      phone,
      email,
      location,
      bankAccount,
      password,
      termsAccepted: true,
      termsVersion: this.store.getSettings().termsVersion
    });
    if (!res.success) { this.showToast(res.message || 'Pendaftaran penjual gagal.', 'error'); return; }

    this.closeModals();
    this.termsAcceptedForRegistration = null;
    this.triggerConfetti();
    this.showToast(`Selamat datang ${name}! Akun Penjual berhasil dibuat. Lengkapi data rekening & lokasi di Menu Pengaturan.`, 'success');
    this.setRole('seller', false);
  }

  logout() {
    this.store.logout();
    this.setRole('public', false);
    this.showToast("Anda telah keluar dari akun.", "info");
  }

  toggleMobileMenu() {
    const drawer = [REDACTED]'mobile-drawer');
    if (drawer) drawer.classList.toggle('hidden');
  }

  toggleMobileSearchBar() {
    const bar = [REDACTED]'mobile-search-container');
    if (bar) {
      bar.classList.toggle('hidden');
      if (!bar.classList.contains('hidden')) {
        const input = [REDACTED]'mobile-global-search-input');
        if (input) input.focus();
      }
    }
  }

  clearMobileSearch() {
    const globalInput = [REDACTED]'mobile-global-search-input');
    const liveInput = [REDACTED]'mobile-live-search-input');
    if (globalInput) globalInput.value = '';
    if (liveInput) liveInput.value = '';
    this.handleMobileInstantSearch('');
  }

  navToMobileTab(tab) {
    const tabs = ['home', 'bursa', 'calc', 'account'];
    tabs.forEach(t => {
      const btn = [REDACTED]`mob-dock-${t}`);
      if (btn) {
        if (t === tab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    if (tab === 'home') {
      this.navigateToSection('hero');
    } else if (tab === 'bursa') {
      this.navigateToSection('postingan-publik');
    } else if (tab === 'calc') {
      this.openMobileDpSimulator();
    } else if (tab === 'account') {
      this.handleMobileAccountNav();
    }
  }

  handleMobileSellAction() {
    const role = this.store.getCurrentRole();
    if (role === 'seller' && this.store.isSellerAuthenticated()) {
      this.showUploadModal();
    } else {
      this.showLoginPage('seller');
      this.showToast("Silakan masuk atau daftar sebagai Penjual untuk mengunggah pasokan limbah.", "info");
    }
  }

  // ================= NAVIGASI TAB MVP MOBILE APP (HOME, JUAL, BERLANGGANAN, SIMULASI) =================
  switchAppTab(tabKey) {
    const key = (tabKey || 'home').toLowerCase();
    const tabMap = {
      home: 'tab-home',
      sell: 'tab-sell',
      sub: 'tab-subscription',
      subscription: 'tab-subscription',
      sim: 'tab-simulation',
      simulation: 'tab-simulation',
      solutions: 'tab-solutions',
      solution: 'tab-solutions'
    };
    const activeTabId = tabMap[key] || 'tab-home';
    const normalizedKey = key === 'subscription' ? 'sub' : (key === 'simulation' ? 'sim' : (key === 'solution' ? 'solutions' : key));
    this.currentAppTab = normalizedKey;

    // Pastikan view-public aktif jika sedang di peran lain
    if (this.store.getCurrentRole() !== 'public') {
      this.setRole('public', false);
    }

    // Tampilkan panel tab yang dipilih dan sembunyikan yang lain (termasuk tab bottom nav)
    ['tab-home', 'tab-sell', 'tab-subscription', 'tab-simulation', 'tab-solutions',
     'tab-cari', 'tab-event', 'tab-pesan', 'tab-saya'].forEach(id => {
      const pane = [REDACTED]id);
      if (pane) {
        if (id === activeTabId) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      }
    });

    // Reset highlight tombol bottom nav baru
    ['home', 'cari', 'pesan', 'saya'].forEach(k => {
      const btn = [REDACTED]`bnav-${k}`);
      if (btn) {
        btn.className = this.bottomNavClass(k);
        btn.removeAttribute('aria-current');
      }
    });

    // Perbarui status tombol navigasi bawah mobile
    const bottomNavKeys = ['home', 'sell', 'sub', 'sim', 'solutions'];
    bottomNavKeys.forEach(k => {
      const bnavBtn = [REDACTED]`bnav-${k}`);
      if (bnavBtn) {
        if (k === normalizedKey) {
          bnavBtn.className = this.bottomNavClass(k, true);
          bnavBtn.setAttribute('aria-current', 'page');
        } else {
          bnavBtn.className = this.bottomNavClass(k);
          bnavBtn.removeAttribute('aria-current');
        }
      }

      // Perbarui status tombol header desktop
      const dnavBtn = [REDACTED]`dnav-${k}`);
      if (dnavBtn) {
        if (k === normalizedKey) {
          dnavBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 transition shadow-2xs flex items-center gap-1.5 cursor-pointer';
        } else {
          dnavBtn.className = 'px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer';
        }
      }
    });

    // Jika masuk ke tab Jual, pastikan dropdown kategori terisi dan aktifkan default tier
    if (normalizedKey === 'sell') {
      this.populateSelectCategories();
      const src = [REDACTED]'up-source-type');
      if (src && !src.value) {
        this.selectSourceTier('source_household');
      }
    }

    // Scroll halus ke puncak halaman
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Navigasi ke dashboard saat ini saat tab Akun di bottom nav ditekan
  bnavGoToDashboard() {
    const role = this.store.getCurrentRole();
    if (role === 'buyer' || role === 'seller' || role === 'admin') {
      // Sudah di dashboard yang benar — scroll ke atas
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.showToast('Silakan masuk ke akun terlebih dahulu.', 'info');
    }
  }

  // ===== NAVIGASI BOTTOM NAV BARU: Cari / Event / Pesan / Saya =====
  switchBottomTab(tabKey) {
    this.currentBottomTab = tabKey;

    // Pastikan view-public aktif
    if (this.store.getCurrentRole() !== 'public') {
      this.setRole('public', false);
    }

    // Sembunyikan semua tab pane (termasuk tab atas dan tab bawah)
    const allPanes = ['tab-home', 'tab-sell', 'tab-subscription', 'tab-simulation',
                      'tab-cari', 'tab-event', 'tab-pesan', 'tab-saya'];
    allPanes.forEach(id => {
      const el = [REDACTED]id);
      if (el) el.classList.add('hidden');
    });

    // Tampilkan tab yang dipilih
    const activePane = [REDACTED]`tab-${tabKey}`);
    if (activePane) activePane.classList.remove('hidden');

    // Update highlight tombol bottom nav
    const bnavKeys = ['home', 'cari', 'sell', 'pesan', 'saya'];
    bnavKeys.forEach(k => {
      const btn = [REDACTED]`bnav-${k}`);
      if (btn) {
        if (k === tabKey) {
          btn.className = this.bottomNavClass(k, true);
          btn.setAttribute('aria-current', 'page');
        } else {
          btn.className = this.bottomNavClass(k);
          btn.removeAttribute('aria-current');
        }
      }
    });

    // Render konten tab
    if (tabKey === 'event') this.renderTabEvent();
    if (tabKey === 'saya') this.renderTabSaya();
    if (tabKey === 'cari') this.renderCariResults();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render tab Event — menampilkan daftar event dari store
  renderTabEvent() {
    const grid = [REDACTED]'tab-event-grid');
    if (!grid) return;
    const events = this.store.getEvents ? this.store.getEvents() : [];
    if (!events.length) {
      grid.innerHTML = `<p class="text-center text-slate-400 text-sm py-10 col-span-full">
        <i class="fa-solid fa-calendar-xmark text-3xl text-slate-300 block mb-2"></i>
        Belum ada event yang dijadwalkan
      </p>`;
      return;
    }
    grid.innerHTML = events.map(ev => `
      <div class="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-xs flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
            <i class="fa-solid fa-calendar-star text-white text-sm"></i>
          </span>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-extrabold text-slate-800 truncate">${esc(ev.title || ev.name)}</h3>
            <span class="text-[10px] text-violet-700 font-semibold">${esc(ev.date || '')} ${ev.location ? '• ' + esc(ev.location) : ''}</span>
          </div>
        </div>
        ${ev.description ? `<p class="text-xs text-slate-600 leading-relaxed">${esc(ev.description)}</p>` : ''}
        <div class="flex items-center justify-between mt-auto pt-2 border-t border-violet-100 gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.status === 'Aktif' || ev.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${ev.status === 'published' ? 'Dibuka' : (ev.status || 'Mendatang')}</span>
          <div class="flex items-center gap-1.5">
            ${ev.waLink ? `<a href="${ev.waLink}" target="_blank" class="text-[10px] font-bold text-emerald-700 flex items-center gap-1 hover:underline"><i class="fa-brands fa-whatsapp"></i> WA</a>` : ''}
            <button onclick="app.openEventRegistration('${ev.id}')" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-xs flex items-center gap-1">Daftar Event →</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render tab Saya — login/profil/akun sesuai role
  renderTabSaya() {
    const container = [REDACTED]'tab-saya-content');
    if (!container) return;
    const role = this.store.getCurrentRole();
    const user = this.store.getCurrentUser();

    if (role === 'buyer' && user) {
      const tier = this.store.getUserSubscriptionTier ? this.store.getUserSubscriptionTier(user) : { name: '-' };
      container.innerHTML = `
        <div class="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-white text-center mb-4">
          <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
            <i class="fa-solid fa-crown text-amber-300 text-2xl"></i>
          </div>
          <h3 class="font-extrabold text-lg">${esc(user.company || user.name)}</h3>
          <p class="text-emerald-200 text-xs">${esc(user.email || '')}</p>
          <span class="inline-block mt-2 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-bold">${esc(tier.name)}</span>
        </div>
        <div class="space-y-2">
          <button onclick="app.setRole('buyer')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-store text-emerald-600 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-slate-800">Portal Pembeli</span>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showUserProfileModal()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-gear text-emerald-600 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Menu Pengaturan Akun</p>
              <p class="text-[10px] text-slate-500">Ubah nama perusahaan, alamat, rekening & verifikasi</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showBuyerRegisterModal()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-crown text-amber-500 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-slate-800">Upgrade Berlangganan</span>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.logout()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-right-from-bracket text-rose-500 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-rose-700">Keluar</span>
          </button>
        </div>`;
    } else if (role === 'seller' && user) {
      container.innerHTML = `
        <div class="rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-900 p-5 text-white text-center mb-4">
          <div class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
            <i class="fa-solid fa-store text-emerald-300 text-2xl"></i>
          </div>
          <h3 class="font-extrabold text-lg">${esc(user.name)}</h3>
          <p class="text-slate-300 text-xs">${esc(user.email || '')}</p>
          <span class="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">${esc(user.verifiedBadge || 'Pemasok Terverifikasi')}</span>
        </div>
        <div class="space-y-2">
          <button onclick="app.setRole('seller')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-boxes-stacked text-emerald-600 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-slate-800">Dashboard Penjual</span>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showUserProfileModal()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-gear text-emerald-600 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Menu Pengaturan Akun</p>
              <p class="text-[10px] text-slate-500">Ubah nama usaha, lokasi gudang, & rekening bank</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showUploadModal()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-circle-plus text-emerald-600 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-slate-800">Unggah Pasokan Baru</span>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.logout()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-right-from-bracket text-rose-500 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-rose-700">Keluar</span>
          </button>
        </div>`;
    } else if (role === 'admin') {
      container.innerHTML = `
        <div class="rounded-2xl bg-gradient-to-br from-slate-950 to-indigo-950 p-5 text-white text-center mb-4">
          <div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
            <i class="fa-solid fa-user-shield text-amber-300 text-2xl"></i>
          </div>
          <h3 class="font-extrabold text-lg">Pengelola</h3>
          <span class="inline-block mt-2 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-bold">ADMIN</span>
        </div>
        <div class="space-y-2">
          <button onclick="app.setRole('admin')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-user-shield text-indigo-600 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-slate-800">Pusat Pengelola</span>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.logout()" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-right-from-bracket text-rose-500 text-lg w-7 text-center"></i>
            <span class="text-sm font-bold text-rose-700">Keluar</span>
          </button>
        </div>`;
    } else {
      // Belum login
      container.innerHTML = `
        <div class="rounded-2xl bg-gradient-to-br from-slate-100 to-white border border-slate-200 p-6 text-center mb-4">
          <div class="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-circle-user text-slate-400 text-3xl"></i>
          </div>
          <h3 class="font-extrabold text-lg text-slate-800">Belum Masuk</h3>
          <p class="text-slate-500 text-xs mt-1">Masuk ke akun untuk mengakses fitur lengkap</p>
        </div>
        <div class="space-y-2">
          <button onclick="app.showLoginPage('buyer')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-crown text-amber-500 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Masuk sebagai Pembeli</p>
              <p class="text-[10px] text-slate-500">Akses harga, GPS & kontak penjual</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showLoginPage('seller')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-store text-emerald-600 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Masuk sebagai Penjual</p>
              <p class="text-[10px] text-slate-500">Kelola pasokan & statistik penjualan</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.switchAppTab('sub')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-98 text-left">
            <i class="fa-solid fa-star text-amber-500 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Lihat Paket Berlangganan</p>
              <p class="text-[10px] text-slate-500">Mulai dari Rp 150.000/bulan</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
        </div>`;
    }
  }

  // Render hasil pencarian di tab Cari
  renderCariResults() {
    const keyword = ([REDACTED]'cari-keyword')?.value || '').toLowerCase().trim();
    const resultsEl = [REDACTED]'cari-results');
    if (!resultsEl) return;

    const allPostings = this.store.getPostings ? this.store.getPostings() : [];
    const filter = this.currentCariFilter || '';

    let filtered = allPostings.filter(p => {
      const matchKeyword = !keyword ||
        (p.title || '').toLowerCase().includes(keyword) ||
        (p.category || '').toLowerCase().includes(keyword) ||
        (p.location || '').toLowerCase().includes(keyword) ||
        (p.description || '').toLowerCase().includes(keyword);
      const matchFilter = !filter || (p.category || '').toLowerCase().includes(filter.toLowerCase());
      return matchKeyword && matchFilter;
    });

    if (!filtered.length) {
      resultsEl.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">
        <i class="fa-solid fa-search-minus text-3xl text-slate-300 block mb-2"></i>
        Tidak ada hasil untuk "${keyword || filter}"
      </p>`;
      return;
    }

    resultsEl.innerHTML = filtered.map(p => `
      <div class="flex items-start gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition cursor-pointer" onclick="app.showProductDetail('${p.id}')">
        <div class="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold text-lg overflow-hidden">
          ${p.imageUrl ? `<img src="${p.imageUrl}" class="w-full h-full object-cover rounded-xl" onerror="this.style.display='none'" />` : '<i class="fa-solid fa-recycle text-xl"></i>'}
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-slate-800 truncate">${esc(p.title)}</h4>
          <p class="text-[10px] text-slate-500">${p.category || '-'} • ${esc(p.location || '-')}</p>
          <p class="text-xs font-bold text-emerald-700 mt-0.5">${this.formatRupiah(p.pricePerUnit || 0)}<span class="text-[10px] font-normal text-slate-500">/${p.unit || 'kg'}</span></p>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${p.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} flex-shrink-0 mt-1">
          ${p.verified ? '✓ Terverifikasi' : 'Pending'}
        </span>
      </div>
    `).join('');
  }

  // Set filter kategori di tab Cari
  setCariFilter(category) {
    this.currentCariFilter = category;
    // Update highlight tombol filter
    document.querySelectorAll('.cari-filter-btn').forEach(btn => {
      const btnText = btn.textContent.trim();
      const isActive = category === '' ? btnText === 'Semua' : btnText === category;
      if (isActive) {
        btn.className = 'cari-filter-btn px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white transition active:scale-95';
      } else {
        btn.className = 'cari-filter-btn px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 transition active:scale-95';
      }
    });
    this.renderCariResults();
  }

  navigateToSection(sectionId) {
    if (this.store.getCurrentRole() !== 'public') {
      this.setRole('public', false);
    }
    if (sectionId === 'kalkulator') {
      this.switchAppTab('sim');
    } else if (sectionId === 'tarif') {
      this.switchAppTab('sub');
    } else {
      this.switchAppTab('home');
    }
    setTimeout(() => {
      const el = [REDACTED]sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  handleMobileAccountNav() {
    const role = this.store.getCurrentRole();
    if (role === 'buyer' && this.store.isBuyerAuthenticated()) {
      this.showUserProfileModal();
    } else if (role === 'seller' && this.store.isSellerAuthenticated()) {
      this.showUserProfileModal();
    } else if (role === 'admin' && this.store.isAdminAuthenticated()) {
      this.setRole('admin');
    } else {
      this.showLoginPage('buyer');
    }
  }

  filterMobileByCat(catId) {
    this.navigateToSection('postingan-publik');
    const pubGrid = [REDACTED]'public-postings-grid');
    if (!pubGrid) return;
    const cards = pubGrid.querySelectorAll('.public-posting-card');
    cards.forEach(card => {
      if (catId === 'all') {
        card.style.display = '';
      } else {
        const cId = card.getAttribute('data-category-id') || '';
        card.style.display = (cId === catId || cId.includes(catId) || catId.includes(cId)) ? '' : 'none';
      }
    });

    // Perbarui style tombol filter chip yang dipilih
    document.querySelectorAll('.mobile-chip-filter').forEach(btn => {
      btn.className = 'mobile-chip-filter px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 transition active:scale-95 flex items-center space-x-1.5';
    });
    if (window.event && window.event.currentTarget) {
      window.event.currentTarget.className = 'mobile-chip-filter px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 bg-emerald-600 text-white shadow-xs transition active:scale-95 flex items-center space-x-1.5';
    }
  }

  handleMobileInstantSearch(query) {
    const cleanQuery = (query || '').toLowerCase().trim();
    const globalInput = [REDACTED]'mobile-global-search-input');
    const liveInput = [REDACTED]'mobile-live-search-input');
    if (globalInput && globalInput.value !== query) globalInput.value = query;
    if (liveInput && liveInput.value !== query) liveInput.value = query;

    const cards = document.querySelectorAll('.public-posting-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (!cleanQuery || text.includes(cleanQuery)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  switchMobileFeedTab(type) {
    const types = ['all', 'supply', 'demand'];
    types.forEach(t => {
      const btn = [REDACTED]`mob-seg-${t}`);
      if (btn) {
        if (t === type) {
          btn.className = 'mobile-seg-btn active flex-1 min-w-[75px] py-2 px-2.5 rounded-xl text-center text-xs font-bold transition';
        } else {
          btn.className = 'mobile-seg-btn flex-1 min-w-[75px] py-2 px-2.5 rounded-xl text-center text-xs font-medium text-slate-600 transition';
        }
      }
    });

    this.filterPublicPostings(type);
  }

  openMobileDpSimulator(itemData = null) {
    const modal = [REDACTED]'modal-mobile-dp-calculator');
    if (!modal) return;

    if (itemData) {
      const catSelect = [REDACTED]'mob-calc-commodity');
      if (catSelect && itemData.category) {
        const itemCat = itemData.category.toLowerCase();
        for (let i = 0; i < catSelect.options.length; i++) {
          const optVal = catSelect.options[i].value.toLowerCase();
          if (itemCat.includes(optVal) || optVal.includes(itemCat)) {
            catSelect.selectedIndex = i;
            break;
          }
        }
      }

      const slider = [REDACTED]'mob-calc-slider');
      if (slider && itemData.qty) {
        slider.value = Math.min(20000, Math.max(100, itemData.qty));
      }
    }

    this.updateMobileDpCalc();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeMobileDpSimulator() {
    const modal = [REDACTED]'modal-mobile-dp-calculator');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  updateMobileDpCalc() {
    const select = [REDACTED]'mob-calc-commodity');
    const slider = [REDACTED]'mob-calc-slider');
    const qtyDisplay = [REDACTED]'mob-calc-qty-display');
    const totalDisplay = [REDACTED]'mob-calc-total-val');
    const dpDisplay = [REDACTED]'mob-calc-dp-val');
    const remDisplay = [REDACTED]'mob-calc-remaining-val');

    if (!select || !slider) return;

    const opt = select.options[select.selectedIndex];
    const price = parseInt(opt.getAttribute('data-price') || '10500', 10);
    const unit = opt.getAttribute('data-unit') || 'Liter';
    const qty = parseInt(slider.value, 10);

    if (qtyDisplay) {
      qtyDisplay.textContent = `${qty.toLocaleString('id-ID')} ${unit}`;
    }

    const total = price * qty;
    const isDp = this.store.isDpEnabled();
    const settings = this.store.getSettings();
    const dpPercent = settings.downPaymentPercent || 30;
    const dp = isDp ? Math.round(total * (dpPercent / 100)) : total;
    const remaining = isDp ? total - dp : 0;

    if (totalDisplay) totalDisplay.textContent = this.formatRupiah(total);
    if (dpDisplay) dpDisplay.textContent = isDp ? this.formatRupiah(dp) : this.formatRupiah(total);
    if (remDisplay) remDisplay.textContent = isDp ? this.formatRupiah(remaining) : "Rp 0 (Pelunasan Penuh)";

    const modalTitle = [REDACTED]'mob-calc-title');
    const dpLabel = [REDACTED]'mob-calc-dp-label');
    const remRow = [REDACTED]'mob-calc-remaining-row');

    if (modalTitle) {
      modalTitle.textContent = isDp ? `Simulasi DP ${dpPercent}% & Rekber Escrow` : "Simulasi Nilai & Rekber Escrow";
    }
    if (dpLabel) {
      dpLabel.innerHTML = isDp
        ? `<i class="fa-solid fa-shield-halved mr-1 text-[10px]"></i> DP ${dpPercent}% Rekber Escrow:`
        : `<i class="fa-solid fa-shield-halved mr-1 text-[10px]"></i> Alokasi Rekber Escrow:`;
    }
    if (remRow) {
      remRow.style.display = isDp ? 'flex' : 'none';
    }
  }

  consultDpWa() {
    const select = [REDACTED]'mob-calc-commodity');
    const slider = [REDACTED]'mob-calc-slider');
    const opt = select ? select.options[select.selectedIndex] : null;
    const commName = opt ? opt.text.split('(')[0].trim() : 'Minyak Jelantah';
    const unit = opt ? (opt.getAttribute('data-unit') || 'Liter') : 'Liter';
    const qty = slider ? parseInt(slider.value, 10).toLocaleString('id-ID') : '2.500';
    const dpDisplay = [REDACTED]'mob-calc-dp-val');
    const dpVal = dpDisplay ? dpDisplay.textContent : 'Rp7.875.000';
    const isDp = this.store.isDpEnabled();

    const msg = isDp
      ? `Halo Admin Bursa Limbah, saya ingin konsultasi simulasi DP 30% Rekening Bersama Escrow untuk ${commName} sebanyak ${qty} ${unit} (Estimasi DP: ${dpVal}). Mohon info panduan booking & verifikasinya.`
      : `Halo Admin Bursa Limbah, saya ingin konsultasi pemesanan Rekening Bersama Escrow untuk ${commName} sebanyak ${qty} ${unit} (Nilai Transaksi: ${dpVal}). Mohon info panduan booking & verifikasinya.`;
    window.open(`https://wa.me/628[REDACTED]7890?text=${encodeURIComponent(msg)}`, '_blank');
  }

  showMobileQuickActionSheet() {
    const modal = [REDACTED]'modal-mobile-quick-actions');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeMobileQuickActionSheet() {
    const modal = [REDACTED]'modal-mobile-quick-actions');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // ================= EVENT & AGENDA RENDERING (DINAMIS DARI STORE) =================
  renderEvents(category = 'semua') {
    const grid = [REDACTED]'event-cards-grid');
    if (!grid) return;

    const events = this.store.getEvents('semua').filter(e => e.status === 'published');
    const filtered = category === 'semua' ? events : events.filter(e => e.category === category);

    // Update active filter pills
    const pills = document.querySelectorAll('#event-filter-pills .event-filter-btn');
    pills.forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === category;
      if (isActive) {
        btn.className = 'event-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white border border-indigo-600 transition';
      } else {
        btn.className = 'event-filter-btn px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 transition';
      }
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div id="event-empty-state" class="col-span-full text-center py-16 text-slate-400">
          <i class="fa-solid fa-calendar-xmark text-4xl mb-3 block text-indigo-300"></i>
          <p class="text-sm font-semibold">Belum ada agenda event untuk kategori ini.</p>
          <p class="text-xs mt-1">Pantau terus untuk update agenda kegiatan berikutnya!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(evt => {
      const categoryBadgeColors = {
        workshop: 'bg-violet-600 text-white',
        seminar: 'bg-rose-600 text-white',
        pameran: 'bg-orange-500 text-white',
        'business-matching': 'bg-emerald-600 text-white',
        webinar: 'bg-blue-600 text-white'
      };
      const badgeClass = categoryBadgeColors[evt.category] || 'bg-indigo-600 text-white';

      return `
        <article class="event-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group" data-category="${evt.category}">
          <div class="relative">
            <img src="${evt.image}" alt="${esc(evt.title)}" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'">
            <div class="absolute top-3 left-3">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeClass} shadow">${evt.categoryLabel || evt.category}</span>
            </div>
            <div class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-center shadow-sm">
              <div class="text-lg font-black text-indigo-700 leading-none">${evt.day}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase">${evt.monthYear}</div>
            </div>
          </div>
          <div class="p-5 flex flex-col flex-1">
            <div class="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mb-2">
              <i class="fa-solid fa-location-dot text-indigo-400"></i>
              <span class="truncate">${esc(evt.location)}</span>
              ${evt.time ? `<span class="text-slate-300">|</span><i class="fa-solid fa-clock text-indigo-400"></i><span>${evt.time}</span>` : ''}
            </div>
            <h3 class="text-sm font-extrabold text-slate-900 mb-1.5 leading-snug">${esc(evt.title)}</h3>
            <p class="text-xs text-slate-500 flex-1 leading-relaxed line-clamp-3">${esc(evt.description)}</p>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-[11px] font-semibold ${evt.isFree ? 'text-emerald-700' : 'text-amber-700'}">
                <i class="fa-solid fa-ticket ${evt.isFree ? 'text-emerald-500' : 'text-amber-500'}"></i>
                <span>${evt.priceLabel}</span>
              </div>
              <button onclick="app.openEventRegistration('${evt.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-sm">Minat / Daftar →</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  filterEvents(category) {
    this.renderEvents(category);
  }

  getEventTicketPrice(eventData) {
    if (Number.isFinite(Number(eventData?.price))) return Number(eventData.price);
    const label = String(eventData?.priceLabel || '');
    const numeric = label.match(/Rp\s*([0-9.]+)/i);
    return numeric ? Number(numeric[1].replace(/\./g, '')) : 0;
  }

  openEventRegistration(eventId) {
    const eventData = this.store.getEventById(eventId);
    const modal = [REDACTED]'modal-event-registration');
    if (!eventData || !modal) return;
    const user = this.store.getCurrentUser?.();
    const price = this.getEventTicketPrice(eventData);
    [REDACTED]'event-registration-title').textContent = eventData.title;
    [REDACTED]'event-registration-price').textContent = price > 0 ? `Tiket ${this.formatRupiah(price)} / peserta` : 'Event gratis';
    [REDACTED]'event-registration-form').classList.remove('hidden');
    [REDACTED]'event-payment-panel').classList.add('hidden');
    [REDACTED]'event-registration-form').reset();
    // Isi ulang setelah reset agar informasi akun tidak hilang.
    [REDACTED]'event-registration-id').value = eventId;
    [REDACTED]'event-participant-name').value = user?.name || user?.company || '';
    [REDACTED]'event-participant-email').value = user?.email || '';
    [REDACTED]'event-participant-phone').value = user?.phone || '';
    [REDACTED]'event-participant-company').value = user?.company || '';
    modal.classList.remove('hidden'); modal.classList.add('flex');
  }

  closeEventRegistrationModal() {
    const modal = [REDACTED]'modal-event-registration');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  async submitEventRegistration(event) {
    event.preventDefault();
    const eventId = [REDACTED]'event-registration-id').value;
    const action = document.querySelector('input[name="event-action"]:checked')?.value || 'interest';
    const payload = {
      fullName: [REDACTED]'event-participant-name').value.trim(),
      email: [REDACTED]'event-participant-email').value.trim(),
      phone: [REDACTED]'event-participant-phone').value.trim(),
      company: [REDACTED]'event-participant-company').value.trim(),
      attendeeCount: Number([REDACTED]'event-attendee-count').value),
      note: [REDACTED]'event-participant-note').value.trim()
    };
    try {
      const endpoint = action === 'interest' ? 'interests' : 'registrations';
      const response = await fetch(`${this.store.apiBaseUrl}/api/events/${encodeURIComponent(eventId)}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Pendaftaran event gagal diproses.');
      if (action === 'interest' || !result.paymentRequired) {
        this.closeEventRegistrationModal();
        this.showToast(result.message, 'success');
        return;
      }
      const payment = result.paymentInstructions;
      [REDACTED]'event-registration-form').classList.add('hidden');
      const panel = [REDACTED]'event-payment-panel');
      panel.innerHTML = `<div class="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900"><strong>Total tagihan: ${this.formatRupiah(result.totalAmount)}</strong><br>Transfer ke ${payment.bank} a.n. ${payment.accountName}, rekening ${payment.accountNumber}.</div><label class="block text-xs font-bold text-slate-700">Nomor referensi transfer<input id="event-payment-reference" required class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"></label><button onclick="app.submitEventPayment('${result.registrationId}')" class="w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">Kirim Konfirmasi Pembayaran</button>`;
      panel.classList.remove('hidden');
    } catch (error) { this.showToast(error.message, 'error'); }
  }

  async submitEventPayment(registrationId) {
    const paymentReference = [REDACTED]'event-payment-reference')?.value.trim();
    try {
      const response = await fetch(`${this.store.apiBaseUrl}/api/event-payments/${encodeURIComponent(registrationId)}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentReference }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Konfirmasi pembayaran gagal.');
      this.closeEventRegistrationModal();
      this.showToast(result.message, 'success');
    } catch (error) { this.showToast(error.message, 'error'); }
  }

  subscribeEventNotification() {
    const emailInput = [REDACTED]'event-notify-email');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) {
      this.showToast('Masukkan alamat email yang valid terlebih dahulu.', 'error');
      return;
    }
    if (emailInput) emailInput.value = '';
    this.showToast(`Berhasil! Notifikasi event akan dikirim ke ${email}.`, 'success');
  }

  // ================= TICKER HARGA LIVE & KURS =================
  async fetchLiveMarketRates() {
    if (window.circulinkSupabase && this.store.getSettings().supabaseConfig?.enabled) {
      window.circulinkSupabase.init();
      window.circulinkSupabase.syncWithStore(this.store).catch(e => console.warn('[Supabase] Sync:', e.message));
    }
    const tickerSettings = this.store.getSettings();
    if (!tickerSettings.tickerEnabled) return;
    try {
      const response = await fetch(`${this.store.apiBaseUrl}/api/market-prices`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.success && data.rates && data.rates.USD_IDR) {
          const liveUsd = Math.round(data.rates.USD_IDR);
          const previousRate = this.marketCurrencies?.usd?.rate;
          const delta = previousRate ? liveUsd - previousRate : 0;
          const changePercent = previousRate && delta !== 0 ? `${delta > 0 ? '+' : ''}${((delta / previousRate) * 100).toFixed(2)}%` : '0.00%';
          if (!this.marketCurrencies) this.marketCurrencies = { usd: { rate: liveUsd, trend: 'flat', changePercent: '0.00%' } };
          this.marketCurrencies.usd.rate = liveUsd;
          this.marketCurrencies.usd.trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
          this.marketCurrencies.usd.changePercent = changePercent;
          this.marketTickerUpdatedAt = data.updatedAt || new Date().toISOString();
          this.marketTickerSource = data.source || 'Market Price API';
          this.renderPriceTicker();
        }
      }
    } catch (e) {
      console.warn("Ticker memakai harga terakhir karena Market Price API tidak tersedia.", e);
    } finally {
      this.scheduleTickerRefresh();
    }
  }

  scheduleTickerRefresh() {
    if (this.tickerRefreshTimer) clearTimeout(this.tickerRefreshTimer);
    const settings = this.store.getSettings();
    if (!settings.tickerEnabled) return;
    const minutes = Math.min(120, Math.max(1, Number(settings.tickerRefreshMinutes) || 15));
    this.tickerRefreshTimer = setTimeout(() => this.fetchLiveMarketRates(), minutes * 60 * 1000);
  }

  renderPriceTicker() {
    const tickerContainer = [REDACTED]'price-ticker-strip');
    const tickerSection = [REDACTED]'market-price-ticker');
    if (!tickerContainer || !tickerSection) return;

    const settings = this.store.getSettings();
    const isEnabled = settings.tickerEnabled !== false;
    tickerSection.classList.toggle('hidden', !isEnabled);
    if (!isEnabled) {
      if (this.tickerRefreshTimer) clearTimeout(this.tickerRefreshTimer);
      return;
    }

    const title = [REDACTED]'price-ticker-title');
    if (title) title.textContent = settings.tickerTitle || 'Harga Pasar Terkini';
    const updated = [REDACTED]'price-ticker-updated');
    if (updated) {
      const date = this.marketTickerUpdatedAt ? new Date(this.marketTickerUpdatedAt) : null;
      updated.textContent = date && !Number.isNaN(date.getTime())
        ? `Diperbarui ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`
        : 'Memuat harga pasar…';
    }

    if (!this.marketCurrencies) {
      this.marketCurrencies = {
        usd: {
          rate: 16180,
          trend: 'flat',
          changePercent: '0.00%'
        }
      };
    }

    const categories = this.store.getCategories();
    let html = '';

    // 1. Kurs Dolar AS terhadap Rupiah (USD/IDR)
    const usd = this.marketCurrencies.usd;
    const usdIsUp = usd.trend === 'up';
    const usdIsDown = usd.trend === 'down';
    const usdTrendColor = usdIsUp ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/70' : usdIsDown ? 'text-rose-400 border-rose-800/60 bg-rose-950/70' : 'text-slate-400 border-slate-700 bg-slate-800';
    const usdTrendIcon = usdIsUp ? 'fa-arrow-trend-up' : usdIsDown ? 'fa-arrow-trend-down' : 'fa-minus';

    html += `
      <div class="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-950/90 to-slate-900 px-3 py-1 rounded-lg border border-emerald-500/50 hover:border-emerald-400 transition shadow-sm">
        <span class="w-2 h-2 rounded-full ${usdIsUp ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse"></span>
        <span class="text-emerald-400 font-bold flex items-center space-x-1 text-xs">
          <i class="fa-solid fa-dollar-sign text-[11px]"></i>
          <span>USD/IDR:</span>
        </span>
        <span class="text-white font-bold font-mono text-xs">${this.formatRupiah(usd.rate)}</span>
        <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${usdTrendColor} flex items-center">
          <i class="fa-solid ${usdTrendIcon} mr-1 text-[9px]"></i>${usd.changePercent}
        </span>
      </div>
    `;

    // 2. Kategori komoditas berasal dari rata-rata listing aktif Bursa Limbah.
    categories.forEach(cat => {
      const approvedProducts = this.store.getProducts({ category: cat.id, status: 'approved' });
      let currentPrice = cat.avgPrice;
      if (approvedProducts.length > 0) {
        const sum = approvedProducts.reduce((acc, p) => acc + p.offerPrice, 0);
        currentPrice = Math.round(sum / approvedProducts.length);
      }

      const isUp = cat.trend === 'up';
      const isDown = cat.trend === 'down';
      const trendColor = isUp ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/70' : isDown ? 'text-rose-400 border-rose-800/60 bg-rose-950/70' : 'text-slate-400 border-slate-700 bg-slate-800';
      const trendIcon = isUp ? 'fa-arrow-trend-up' : isDown ? 'fa-arrow-trend-down' : 'fa-minus';

      html += `
        <div class="inline-flex items-center space-x-2 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition">
          <span class="w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : isDown ? 'bg-rose-400' : 'bg-slate-400'} animate-pulse"></span>
          <span class="text-slate-300 font-semibold">${esc(cat.name)}:</span>
          <span class="text-white font-bold font-mono">${this.formatRupiah(currentPrice)}<span class="text-[10px] text-slate-400 font-normal">/${cat.unit}</span></span>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${trendColor} flex items-center">
            <i class="fa-solid ${trendIcon} mr-1 text-[9px]"></i>${cat.changePercent || '0.0%'}
          </span>
        </div>
      `;
    });

    tickerContainer.innerHTML = html + html;
  }

  simulateLiveMarketTick() {
    // Dipertahankan untuk kompatibilitas pemanggil lama; tidak lagi membuat harga acak.
    this.fetchLiveMarketRates();
  }

  renderPublicCategories(groupFilter = 'all') {
    const grid = [REDACTED]'category-grid-public');
    if (!grid) return;

    ['all', 'utama', 'industri', 'b3'].forEach(g => {
      const btn = [REDACTED]`cat-tab-${g}`);
      if (btn) {
        btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ' + 
          (g === 'b3' ? 'bg-slate-100 text-rose-700 hover:bg-rose-100 border border-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200');
      }
    });

    const activeTab = [REDACTED]`cat-tab-${groupFilter}`);
    if (activeTab) {
      if (groupFilter === 'b3') {
        activeTab.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-rose-600 text-white shadow-sm border border-rose-600';
      } else {
        activeTab.className = 'px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 bg-brand-600 text-white shadow-sm';
      }
    }

    const categories = this.store.getCategories(groupFilter);
    grid.innerHTML = categories.map(cat => {
      const isB3 = Boolean(cat.isB3 || cat.group === 'b3');
      return `
        <div class="rounded-2xl border ${isB3 ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'} overflow-hidden hover:border-brand-500 hover:shadow-lg transition group cursor-pointer flex flex-col justify-between" onclick="app.filterByPill('${cat.id}')">
          <div>
            <div class="relative h-32 overflow-hidden bg-slate-100">
              <img src="${cat.image}" alt="${esc(cat.name)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                ${esc(cat.name)}
              </span>
              <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] font-semibold ${isB3 ? 'bg-rose-600 text-white' : 'bg-brand-600/90 text-white'}">
                ${cat.badge || (isB3 ? 'Izin Khusus KLHK' : 'Standar Daur Ulang')}
              </span>
            </div>

            <div class="p-4">
              <div class="text-xs font-mono font-bold ${isB3 ? 'text-rose-700 bg-rose-100/70 border border-rose-200' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded-md inline-block">
                ${cat.priceRange}
              </div>
              <p class="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">
                ${esc(cat.description)}
              </p>
            </div>
          </div>

          <div class="p-4 pt-0">
            <div class="text-[11px] font-bold ${isB3 ? 'text-rose-600 group-hover:text-rose-700' : 'text-brand-600 group-hover:text-brand-700'} flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span>${isB3 ? '⚠️ Buka Bursa B3' : 'Buka Bursa Pembeli'}</span>
              <i class="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition"></i>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================= 1. POSTINGAN PUBLIK: GATED ACCESS DATA HARGA, ALAMAT, GPS, WA =================
  filterPublicPostings(filterType) {
    this.publicPostingFilter = filterType;
    const btnAll = [REDACTED]'btn-filter-pub-all');
    const btnSupply = [REDACTED]'btn-filter-pub-supply');
    const btnDemand = [REDACTED]'btn-filter-pub-demand');

    [btnAll, btnSupply, btnDemand].forEach(b => {
      if (b) b.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900';
    });

    if (filterType === 'all' && btnAll) btnAll.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-brand-600 text-white shadow-sm';
    if (filterType === 'supply' && btnSupply) btnSupply.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-brand-600 text-white shadow-sm';
    if (filterType === 'demand' && btnDemand) btnDemand.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-brand-600 text-white shadow-sm';

    this.renderPublicPostings();
  }

  renderPublicPostings() {
    const grid = [REDACTED]'public-postings-grid');
    if (!grid) return;

    const products = this.store.getProducts({ status: 'approved' });
    const requests = this.store.getBuyerRequests();

    const countSupplyEl = [REDACTED]'count-supply');
    const countDemandEl = [REDACTED]'count-demand');
    if (countSupplyEl) countSupplyEl.textContent = products.length;
    if (countDemandEl) countDemandEl.textContent = requests.length;

    const mobCountAllEl = [REDACTED]'mob-count-all');
    const mobCountSupplyEl = [REDACTED]'mob-count-supply');
    const mobCountDemandEl = [REDACTED]'mob-count-demand');
    if (mobCountAllEl) mobCountAllEl.textContent = products.length + requests.length;
    if (mobCountSupplyEl) mobCountSupplyEl.textContent = products.length;
    if (mobCountDemandEl) mobCountDemandEl.textContent = requests.length;

    let items = [];

    if (this.publicPostingFilter === 'all' || this.publicPostingFilter === 'supply') {
      products.forEach(p => items.push({ ...p, postingType: 'supply' }));
    }
    if (this.publicPostingFilter === 'all' || this.publicPostingFilter === 'demand') {
      requests.forEach(r => items.push({ ...r, postingType: 'demand' }));
    }

    grid.innerHTML = items.map(item => {
      const isSupply = item.postingType === 'supply';
      const mainPhoto = isSupply && item.evidences && item.evidences[0] 
        ? item.evidences[0].url 
        : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';
      const qtyText = isSupply 
        ? (item.volume > 0 ? `${item.volume.toLocaleString('id-ID')} Liter` : `${item.weight.toLocaleString('id-ID')} Kg`)
        : `${item.volume.toLocaleString('id-ID')} ${item.unit}`;
      const partnerName = isSupply ? item.sellerName : item.buyerCompany;
      const itemCity = this.getCity(item);

      return `
        <div class="public-posting-card bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between" data-category-id="${item.category || item.categoryId || ''}">
          <div>
            <!-- Banner Gambar & Label Tipe Postingan -->
            <div class="relative h-44 bg-slate-100 overflow-hidden">
              <img src="${mainPhoto}" alt="${esc(item.title)}" class="w-full h-full object-cover">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                  ${esc(item.code)}
                </span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${isSupply ? 'bg-emerald-600/90 text-white' : 'bg-blue-600/90 text-white'} backdrop-blur-sm">
                  ${isSupply ? 'Pasokan Penjual' : 'Permintaan Pembeli'}
                </span>
              </div>

              <div class="absolute top-2 right-2">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow flex items-center">
                  <i class="fa-solid fa-lock mr-1 text-[9px]"></i>Data Terproteksi
                </span>
              </div>

              <div class="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span class="truncate"><i class="fa-solid fa-location-dot text-emerald-400 mr-1"></i>Kota: ${itemCity}</span>
                <span class="shrink-0 text-amber-300 font-mono text-[10px]">Akses Publik</span>
              </div>
            </div>

            <!-- Konten Postingan Publik -->
            <div class="p-4 space-y-3">
              <div>
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${esc(item.title)}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-scale-balanced mr-1 text-slate-400"></i>Volume:</span>
                  <span class="font-bold text-slate-800">${qtyText}</span>
                  ${item.pickupSchedule ? `<span>• <i class="fa-solid fa-calendar-check mr-1 text-slate-400"></i>${item.pickupSchedule}</span>` : ''}
                </div>

                <!-- 10 Atribut Wajib Listing Badges -->
                <div class="flex flex-wrap gap-1 mt-2">
                  ${item.isB3 ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center">
                      <i class="fa-solid fa-triangle-exclamation mr-1 text-rose-600"></i>Limbah B3 (Izin KLHK)
                    </span>
                  ` : ''}
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                    <i class="fa-solid fa-box-open mr-1 text-slate-400"></i>Kondisi: ${esc(item.condition || 'Bersih')}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                    <i class="fa-solid fa-certificate mr-1 text-slate-400"></i>${esc(item.grade || 'Standar')}
                  </span>
                  ${item.minimumOrder ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      Min: ${item.minimumOrder} ${item.minimumOrderUnit || item.unit || 'Kg'}
                    </span>
                  ` : ''}
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${item.listingStatus === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                    ${esc(item.listingStatus || 'Tersedia')}
                  </span>
                </div>
              </div>

              <!-- 4 Kriteria Terproteksi Sesuai Permintaan Pengguna: Harga, Alamat, GPS Map, No WA -->
              <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2 text-xs">
                
                <!-- 1. Kriteria Harga Disembunyikan -->
                <div class="flex items-center justify-between">
                  <span class="text-slate-500 flex items-center">
                    <i class="fa-solid fa-tag text-amber-600 mr-1.5 text-[11px]"></i>Harga:
                  </span>
                  <span class="font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded text-[11px] flex items-center">
                    <i class="fa-solid fa-lock mr-1 text-[9px]"></i>Disembunyikan untuk Publik
                  </span>
                </div>

                <!-- 2. Kriteria Alamat Presisi Disembunyikan: HANYA TAMPIL NAMA KOTA SAJA -->
                <div class="flex items-center justify-between">
                  <span class="text-slate-500 flex items-center">
                    <i class="fa-solid fa-location-dot text-emerald-600 mr-1.5 text-[11px]"></i>Kota:
                  </span>
                  <span class="font-bold text-slate-900 text-[11px] flex items-center bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                    <i class="fa-solid fa-city mr-1.5 text-emerald-600 text-[10px]"></i>${itemCity}
                  </span>
                </div>

                <!-- 3. Kriteria GPS Map Disembunyikan -->
                <div class="flex items-center justify-between">
                  <span class="text-slate-500 flex items-center">
                    <i class="fa-solid fa-map-location-dot text-amber-600 mr-1.5 text-[11px]"></i>Peta GPS:
                  </span>
                  <span class="text-slate-600 font-medium text-[11px] flex items-center">
                    <i class="fa-solid fa-lock mr-1 text-slate-400 text-[10px]"></i>Peta GPS Terkunci
                  </span>
                </div>

                <!-- 4. Kriteria Nomor WhatsApp Disembunyikan -->
                <div class="flex items-center justify-between border-t border-amber-200/60 pt-1.5">
                  <span class="text-slate-500 flex items-center">
                    <i class="fa-brands fa-whatsapp text-amber-600 mr-1.5 text-[11px]"></i>Kontak WA:
                  </span>
                  <span class="font-mono text-slate-500 text-[11px] flex items-center">
                    <i class="fa-solid fa-lock mr-1 text-slate-400 text-[10px]"></i>08xx-****-****
                  </span>
                </div>

              </div>

              <!-- Identitas Mitra -->
              <div class="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                <span class="truncate"><i class="fa-solid fa-building mr-1 text-slate-400"></i>${partnerName}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">Terverifikasi</span>
              </div>
            </div>
          </div>

          <!-- Tombol Aksi: Simulasi DP & Buka Akses -->
          <div class="p-4 pt-0 space-y-2">
            <div class="grid ${this.store.isDpEnabled() ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5">
              ${this.store.isDpEnabled() ? `
              <button onclick="app.openMobileDpSimulator({ category: '${item.category || item.categoryId || 'jelantah'}', qty: ${item.volume || item.weight || 2500}, title: '${(item.title || '').replace(/'/g, "\\'")}' })" class="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center justify-center space-x-1 active:scale-95 shadow-2xs">
                <i class="fa-solid fa-calculator text-amber-600"></i>
                <span>Simulasi DP</span>
              </button>
              ` : ''}
              <button onclick="app.showProductDetail('${item.id}')" class="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold transition flex items-center justify-center space-x-1 active:scale-95">
                <i class="fa-solid fa-eye text-emerald-600"></i>
                <span>Detail Pasokan</span>
              </button>
            </div>
            <button onclick="app.showBuyerRegisterModal()" class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 active:scale-95">
              <i class="fa-solid fa-crown text-amber-300"></i>
              <span>Daftar &amp; Buka Akses (3 Paket)</span>
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  // ================= 2. 3 PILIHAN JENIS BERLANGGANAN PEMBELI =================
  renderPublicSubscriptionTiers() {
    const container = [REDACTED]'subscription-cards-container');
    if (!container) return;

    const tiers = this.store.getSubscriptionTiers();

    container.innerHTML = tiers.map(tier => {
      const isPopular = tier.popular;
      const isEnterprise = tier.id === 'tier_enterprise';
      const limitText = (!tier.maxPriceLimit || tier.maxPriceLimit === 0) 
        ? 'Unlimited (Semua Nilai Transaksi)' 
        : `Maksimal ${this.formatRupiah(tier.maxPriceLimit)}`;

      return `
        <div class="rounded-3xl p-7 border-2 transition flex flex-col justify-between ${
          isPopular 
            ? 'bg-gradient-to-b from-brand-900 to-slate-900 text-white border-brand-500 shadow-2xl relative md:-translate-y-2' 
            : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:border-brand-400'
        }">
          ${isPopular ? `
            <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow">
              Pilihan Paling Diminati
            </div>
          ` : ''}

          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider ${isPopular ? 'text-emerald-400' : 'text-slate-500'}">
                ${tier.badge}
              </span>
              ${isEnterprise ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950">Akses Tanpa Batas</span>` : ''}
            </div>

            <h4 class="text-2xl font-extrabold mt-1 ${isPopular ? 'text-white' : 'text-slate-900'}">${esc(tier.name)}</h4>
            <p class="text-xs mt-2 leading-relaxed ${isPopular ? 'text-slate-300' : 'text-slate-500'}">${esc(tier.description)}</p>
            
            <div class="mt-6 mb-6">
              <div class="flex items-baseline">
                <span class="text-3xl font-extrabold font-mono ${isPopular ? 'text-white' : 'text-slate-900'}">${this.formatRupiah(tier.monthlyFee)}</span>
                <span class="text-xs ml-1.5 ${isPopular ? 'text-slate-400' : 'text-slate-500'}"> / bulan</span>
              </div>
              <div class="text-[11px] font-bold mt-1 ${isPopular ? 'text-emerald-400' : 'text-emerald-700'}">
                <i class="fa-solid fa-shield-halved mr-1"></i>${tier.tagline}
              </div>
            </div>

            <!-- Daftar Hak Akses Sesuai Jenis Langganan -->
            <ul class="space-y-3 text-xs ${isPopular ? 'text-slate-200' : 'text-slate-600'}">
              <li class="flex items-start">
                <i class="fa-solid fa-check ${isPopular ? 'text-emerald-400' : 'text-emerald-600'} mr-2 mt-0.5"></i>
                <span><strong>Batas Rentang Harga:</strong> ${limitText}</span>
              </li>
              <li class="flex items-start">
                <i class="fa-solid fa-check ${isPopular ? 'text-emerald-400' : 'text-emerald-600'} mr-2 mt-0.5"></i>
                <span><strong>Alamat Gudang:</strong> ${tier.allowAddress === 'full' ? 'Alamat lengkap detail hingga patokan' : 'Kota & area umum saja'}</span>
              </li>
              <li class="flex items-start">
                <i class="fa-solid ${tier.allowGpsMap ? 'fa-check text-emerald-400' : 'fa-xmark text-slate-400'} mr-2 mt-0.5"></i>
                <span><strong>Peta GPS Gudang:</strong> ${tier.allowGpsMap ? 'Peta Leaflet GPS interaktif presisi' : 'Terkunci (Khusus Pro & Enterprise)'}</span>
              </li>
              <li class="flex items-start">
                <i class="fa-solid ${tier.allowWhatsapp ? 'fa-check text-emerald-400' : 'fa-xmark text-slate-400'} mr-2 mt-0.5"></i>
                <span><strong>Kontak WhatsApp Penjual:</strong> ${tier.allowWhatsapp ? 'Nomor tampil & tombol direct wa.me' : 'Terkunci (Gunakan Layar Chat)'}</span>
              </li>
              <li class="flex items-start">
                <i class="fa-solid fa-check ${isPopular ? 'text-emerald-400' : 'text-emerald-600'} mr-2 mt-0.5"></i>
                <span><strong>Fitur Layar Chat:</strong> Muncul & aktif untuk kirim pesan ke penjual</span>
              </li>
              <li class="flex items-start">
                <i class="fa-solid fa-check ${isPopular ? 'text-emerald-400' : 'text-emerald-600'} mr-2 mt-0.5"></i>
                <span><strong>Pemesanan DP 30%:</strong> Rekening bersama (Escrow) terpercaya</span>
              </li>
            </ul>
          </div>

          <div class="mt-8">
            <button onclick="app.showBuyerRegisterModal('${tier.id}')" class="w-full py-3 rounded-xl text-xs font-bold transition shadow ${
              isPopular 
                ? 'bg-brand-500 hover:bg-brand-400 text-slate-950 font-extrabold shadow-lg shadow-brand-500/30' 
                : 'border-2 border-brand-600 text-brand-700 hover:bg-brand-50'
            }">
              Pilih & Daftar ${esc(tier.name)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================= 3. MODAL PENDAFTARAN PEMBELI & PILIHAN 3-TIER =================
  showBuyerRegisterModal(preferredTierId = null, termsApproved = false) {
    const currentUser = this.store.getCurrentUser();
    if (!termsApproved && !(currentUser && currentUser.role === 'buyer')) {
      this.showRegistrationTerms('buyer', preferredTierId);
      return;
    }
    if (preferredTierId) {
      this.selectedRegisterTier = preferredTierId;
    }
    this.renderRegisterTierOptions();

    const modal = [REDACTED]'modal-buyer-register');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  renderRegisterTierOptions() {
    const container = [REDACTED]'register-tier-cards');
    if (!container) return;

    const tiers = this.store.getSubscriptionTiers();

    container.innerHTML = tiers.map(t => {
      const isSelected = t.id === this.selectedRegisterTier;
      const limitText = (!t.maxPriceLimit || t.maxPriceLimit === 0) ? 'Unlimited' : `Maks ${this.formatRupiah(t.maxPriceLimit)}`;

      return `
        <div onclick="app.selectRegisterTier('${t.id}')" class="p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
          isSelected 
            ? 'border-brand-600 bg-brand-50/80 shadow-md ring-2 ring-brand-500/20' 
            : 'border-slate-200 bg-white hover:border-slate-300'
        }">
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-bold uppercase ${isSelected ? 'text-brand-800' : 'text-slate-500'}">${t.badge}</span>
              <input type="radio" name="reg-tier-choice" ${isSelected ? 'checked' : ''} class="accent-brand-600">
            </div>
            <div class="font-extrabold text-xs text-slate-900">${esc(t.name)}</div>
            <div class="text-sm font-bold font-mono text-brand-700 mt-1">${this.formatRupiah(t.monthlyFee)}<span class="text-[10px] text-slate-400 font-normal">/bln</span></div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-600 space-y-1">
            <div class="font-semibold text-slate-800">Rentang: ${limitText}</div>
            <div>Peta GPS: ${t.allowGpsMap ? '✅ Ya' : '🔒 Tidak'}</div>
            <div>Nomor WA: ${t.allowWhatsapp ? '✅ Ya' : '🔒 Chat'}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  selectRegisterTier(tierId) {
    this.selectedRegisterTier = tierId;
    this.renderRegisterTierOptions();
  }

  async handleBuyerRegister(event) {
    event.preventDefault();
    if (this.termsAcceptedForRegistration !== 'buyer') {
      this.showRegistrationTerms('buyer');
      this.showToast('Setujui Syarat dan Ketentuan sebelum mendaftar.', 'warning');
      return;
    }
    const email = [REDACTED]'reg-buyer-email').value.trim();
    const name = [REDACTED]'reg-buyer-name').value.trim();
    const phone = [REDACTED]'reg-buyer-phone').value.trim();
    const password = [REDACTED]'reg-buyer-password') ? [REDACTED]'reg-buyer-password').value : '[REDACTED]';

    const company = name; // Default nama perusahaan sama dengan nama penanggung jawab
    const chosenTierId = 'tier_starter';

    const existing = this.store.state.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.role === 'buyer') {
        this.showToast(`Email ${email} sudah terdaftar. Silakan langsung masuk.`, 'info');
        this.closeModals();
        this.showLoginPage('buyer');
        const inputId = [REDACTED]'login-input-identifier');
        if (inputId) inputId.value = email;
        return;
      } else {
        this.showToast(`Email ${email} sudah terdaftar sebagai ${existing.role === 'seller' ? 'Penjual' : 'Pengelola'}.`, 'error');
        return;
      }
    }

    const res = await this.store.registerBuyerAsync({
      name,
      company,
      phone,
      email,
      password,
      tierId: chosenTierId,
      subscriptionActive: true,
      termsAccepted: true,
      termsVersion: this.store.getSettings().termsVersion
    });
    if (!res.success) { this.showToast(res.message || 'Pendaftaran pembeli gagal.', 'error'); return; }

    const tier = this.store.getSubscriptionTierById(chosenTierId);

    this.closeModals();
    this.termsAcceptedForRegistration = null;
    this.setRole('buyer', false);
    this.triggerConfetti();
    this.showToast(`Selamat datang ${name}! Akun Pembeli aktif dengan ${tier ? tier.name : 'Paket Starter'}. Lengkapi profil di Menu Pengaturan.`, 'success');
  }

  // ================= 4. KATALOG PEMBELI: PENGECEKAN TIER RENTANG HARGA & FITUR =================
  switchBuyerTab(tab) {
    this.currentBuyerTab = tab;
    const tabs = ['market', 'orders', 'offers', 'reports'];
    tabs.forEach(t => {
      const btn = [REDACTED]`buyer-tab-${t}`);
      const content = [REDACTED]`buyer-content-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm transition shrink-0 flex items-center gap-1.5';
        } else {
          btn.className = 'px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 flex items-center gap-1.5';
        }
      }
      if (content) {
        if (t === tab) content.classList.remove('hidden');
        else content.classList.add('hidden');
      }
    });

    if (tab === 'market') this.renderBuyerMarketplace();
    if (tab === 'orders') this.renderBuyerOrders();
    if (tab === 'offers') this.renderBuyerAcceptedOffers();
    if (tab === 'reports') this.renderBuyerPurchaseReport();
  }

  switchBuyerTierSim(tierId) {
    const user = this.store.getCurrentUser();
    if (user && user.role === 'buyer') {
      this.store.setBuyerTier(user.id, tierId);
      const tier = this.store.getSubscriptionTierById(tierId);
      this.renderBuyerMarketplace();
      this.showToast(`Simulasi: Beralih ke ${esc(tier.name)}`, 'success');
    }
  }

  renderBuyerMarketplace() {
    const grid = [REDACTED]'buyer-products-grid');
    if (!grid) return;

    const user = this.store.getCurrentUser();
    const tier = this.store.getUserSubscriptionTier(user) || this.store.getSubscriptionTiers()[1];

    // Perbarui badge tier di atas
    const tierBadge = [REDACTED]'buyer-tier-name');
    const tierDesc = [REDACTED]'buyer-tier-limit-desc');
    if (tierBadge) tierBadge.textContent = tier.name;
    if (tierDesc) {
      const limitText = (!tier.maxPriceLimit || tier.maxPriceLimit === 0) ? 'Unlimited (Semua Nilai)' : `Maksimal ${this.formatRupiah(tier.maxPriceLimit)}`;
      tierDesc.innerHTML = `Akses Harga: <strong>${limitText}</strong> • Alamat: ${tier.allowAddress === 'full' ? 'Lengkap' : 'Kota Saja'} • Peta GPS: ${tier.allowGpsMap ? 'Aktif' : 'Terkunci'} • Nomor WA: ${tier.allowWhatsapp ? 'Terbuka' : 'Gunakan Layar Chat'}.`;
    }

    const products = this.store.getProducts({ status: 'approved' });

    grid.innerHTML = products.map(p => {
      const qtyDisplay = p.volume > 0 ? `${p.volume.toLocaleString('id-ID')} Liter` : `${p.weight.toLocaleString('id-ID')} Kg`;
      const isBooked = p.status === 'booked';
      const mainPhoto = (p.evidences && p.evidences[0]) ? p.evidences[0].url : 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';

      // Evaluasi akses tier
      const access = this.store.checkProductAccess(p, user, 'buyer');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${isBooked ? 'opacity-75' : ''}">
          <div>
            <!-- Banner Foto & Kode -->
            <div class="relative h-44 bg-slate-100 overflow-hidden">
              <img src="${mainPhoto}" alt="${esc(p.title)}" class="w-full h-full object-cover">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                  ${esc(p.code)}
                </span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-600/90 backdrop-blur-sm text-white">
                  ${esc(p.categoryName)}
                </span>
                ${p.sourceType ? `
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm ${
                    p.sourceType === 'source_household' ? 'bg-emerald-600/90 text-white' :
                    p.sourceType === 'source_medium_industry' ? 'bg-blue-600/90 text-white' :
                    'bg-amber-600/90 text-white'
                  }">
                    ${p.sourceType === 'source_household' ? '🏠 Rumah Tangga' : p.sourceType === 'source_medium_industry' ? '🏢 Industri Menengah' : '🏭 Industri Besar'}
                  </span>
                ` : ''}
              </div>

              <div class="absolute top-2 right-2">
                ${isBooked 
                  ? `<span class="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600 text-white shadow"><i class="fa-solid fa-lock mr-1"></i>Dipesan (DP)</span>` 
                  : `<span class="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 text-white shadow"><i class="fa-solid fa-check mr-1"></i>Terverifikasi</span>`
                }
              </div>

              <div class="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span class="truncate"><i class="fa-solid fa-location-dot text-emerald-400 mr-1"></i>Kota: ${this.getCity(p)}</span>
                <span class="shrink-0 text-emerald-300 font-mono text-[10px]">3 Eviden OK</span>
              </div>
            </div>

            <!-- Konten Pasokan -->
            <div class="p-4 space-y-3">
              <div>
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${esc(p.title)}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-truck-ramp-box mr-1"></i>${esc(p.containerType)}</span>
                  <span>•</span>
                  <span class="font-semibold text-slate-700">${qtyDisplay}</span>
                  <span>•</span>
                  <span class="text-emerald-700 font-semibold flex items-center"><i class="fa-solid fa-city mr-1 text-[10px]"></i>${this.getCity(p)}</span>
                </div>
              </div>

              <!-- Rincian Harga Sesuai Rentang Nilai Jual Tier -->
              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                ${access.canViewPrice ? `
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-500">Harga Satuan:</span>
                    <span class="font-bold text-slate-900 font-mono text-sm">${this.formatRupiah(p.offerPrice)} / ${p.unit}</span>
                  </div>

                  <div class="flex justify-between items-center text-xs border-t border-slate-200/60 pt-1">
                    <span class="text-slate-500">Total Transaksi:</span>
                    <span class="font-bold text-emerald-700 font-mono">${this.formatRupiah(p.totalPrice)}</span>
                  </div>

                  ${this.store.isDpEnabled() ? `
                  <div class="text-[10px] text-brand-700 font-semibold pt-0.5 flex justify-between">
                    <span>DP ${(this.store.getSettings().downPaymentPercent || 30)}%: ${this.formatRupiah(Math.round(p.totalPrice * ((this.store.getSettings().downPaymentPercent || 30) / 100)))}</span>
                    <span>Penanganan: ${this.formatRupiah(this.store.getHandlingFeeForUser(user))}</span>
                  </div>
                  ` : `
                  <div class="text-[10px] text-emerald-700 font-semibold pt-0.5 flex justify-between">
                    <span>Pelunasan Penuh (Tanpa DP)</span>
                    <span>Penanganan: ${this.formatRupiah(this.store.getHandlingFeeForUser(user))}</span>
                  </div>
                  `}
                ` : `
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-500">Nilai Transaksi:</span>
                      <span class="font-mono text-slate-400 text-xs">Rp ***.***.***</span>
                    </div>
                    <div class="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                      <i class="fa-solid fa-lock text-amber-600 mr-1"></i>
                      <strong>Di luar Kuota ${esc(tier.name)}:</strong> Nilai limbah melebihi batas kuota Anda (${this.formatRupiah(tier.maxPriceLimit)}).
                      <button onclick="app.showBuyerRegisterModal()" class="text-brand-700 underline font-bold ml-1">Upgrade Tier</button>
                    </div>
                  </div>
                `}
              </div>

              <!-- Info Penjual & Kontak -->
              <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span class="truncate"><i class="fa-solid fa-store mr-1 text-slate-400"></i>${esc(p.sellerName)} (${this.getCity(p)})</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">${esc(p.sellerType)}</span>
              </div>
            </div>
          </div>

          <!-- Tombol Aksi: Chat Penjual, Foto & GPS, Pesan DP -->
          <div class="p-4 pt-0 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <button onclick="app.openChatWithSeller('${p.id}', '${p.sellerId}')" class="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm">
                <i class="fa-solid fa-comments text-emerald-400"></i>
                <span>Chat Penjual</span>
              </button>
              <button onclick="app.showProductDetail('${p.id}')" class="py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-camera"></i>
                <span>Foto & GPS</span>
              </button>
            </div>

            ${!isBooked && access.canViewPrice ? `
              <button onclick="app.showOfferModal('${p.id}')" class="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-handshake"></i><span>Tawar Harga ke Penjual</span>
              </button>
              <button onclick="app.initiateCheckout('${p.id}')" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-cart-check"></i>
                <span>${this.store.isDpEnabled() ? `Pesan DP ${(this.store.getSettings().downPaymentPercent || 30)}% Rekening Bersama` : 'Pesan Pasokan Rekening Bersama'}</span>
              </button>
            ` : !isBooked && !access.canViewPrice ? `
              <button onclick="app.showBuyerRegisterModal()" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <span>Upgrade Tier untuk Pesan</span>
              </button>
            ` : `
              <button disabled class="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed">
                Telah Dipesan
              </button>
            `}
          </div>

        </div>
      `;
    }).join('');
  }

  // ================= 5. MODAL RINCIAN PRODUK & EVALUASI AKSES DATA GATED =================
  showProductDetail(productId) {
    const p = this.store.getProductById(productId) || this.store.getBuyerRequests().find(r => r.id === productId);
    if (!p) return;

    const modal = [REDACTED]'modal-product-detail');
    const container = [REDACTED]'modal-product-detail-content');
    const currentRole = this.store.getCurrentRole();
    const currentUser = this.store.getCurrentUser();

    // Cek hak akses gated
    const access = this.store.checkProductAccess(p, currentUser, currentRole);
    const qtyDisplay = p.volume > 0 ? `${p.volume.toLocaleString('id-ID')} Liter` : `${p.weight ? p.weight.toLocaleString('id-ID') : 0} Kg`;

    container.innerHTML = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center space-x-2 flex-wrap gap-y-1">
            <span class="text-xs font-bold font-mono px-2 py-0.5 rounded bg-brand-100 text-brand-800">${esc(p.code)}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">${esc(p.categoryName)}</span>
            ${p.sourceType ? `
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${
                p.sourceType === 'source_household' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                p.sourceType === 'source_medium_industry' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                'bg-amber-100 text-amber-900 border border-amber-300'
              }">
                ${p.sourceType === 'source_household' ? '🏠 Limbah Rumah Tangga' : p.sourceType === 'source_medium_industry' ? '🏢 Industri Menengah' : '🏭 Industri Besar'}
              </span>
            ` : ''}
          </div>
          <h3 class="text-lg font-bold text-slate-900 mt-1">${esc(p.title)}</h3>
        </div>
        <button onclick="app.closeModals()" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-6">
        
        <!-- Galeri Foto Eviden -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center">
            <i class="fa-solid fa-images mr-1.5 text-emerald-600"></i>
            Dokumentasi Eviden Tera & Fisik
          </h4>
          <div class="grid grid-cols-3 gap-3">
            ${(p.evidences || []).map(e => `
              <div class="space-y-1.5">
                <div class="relative h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <img src="${e.url}" alt="${e.type}" class="w-full h-full object-cover group-hover:scale-105 transition">
                  <span class="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-[10px] text-white truncate">
                    ${e.type}
                  </span>
                </div>
                <p class="text-[10px] text-slate-500 leading-tight">${esc(e.notes || '')}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Bagian Alamat & Peta GPS Sesuai Hak Akses Tier -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <i class="fa-solid fa-location-crosshairs mr-1.5 text-emerald-600"></i>
              Koordinat GPS & Lokasi Gudang Pengambilan
            </h4>
            ${access.canViewGpsMap ? `
              <span class="text-[11px] font-mono text-slate-500">${p.lat}, ${p.lng}</span>
            ` : `
              <span class="text-[11px] text-amber-700 font-bold"><i class="fa-solid fa-lock mr-1"></i>Peta GPS Terkunci</span>
            `}
          </div>

          ${access.canViewGpsMap ? `
            <div id="product-modal-map" class="map-container border border-slate-200 shadow-inner h-48 rounded-2xl"></div>
          ` : `
            <div class="h-40 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center p-4 space-y-2">
              <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-lock"></i>
              </div>
              <div class="text-xs font-bold text-slate-800">Peta GPS Interaktif Terkunci</div>
              <p class="text-[11px] text-slate-500 max-w-sm">Tersedia pada Paket <strong>Bisnis Pro</strong> dan <strong>Korporat Enterprise</strong>. Pembeli Starter hanya dapat melihat kota/wilayah umum.</p>
              <button onclick="app.closeModals(); app.showBuyerRegisterModal();" class="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition">
                Buka Peta GPS
              </button>
            </div>
          `}

          <div class="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span class="font-bold text-slate-800">Kota & Lokasi:</span>
              ${access.canViewFullAddress 
                ? `<span class="text-slate-900 font-semibold">${esc(p.address || this.getCity(p))}</span>` 
                : `<span class="text-slate-900 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 inline-flex items-center"><i class="fa-solid fa-city mr-1 text-emerald-600 text-[10px]"></i>${this.getCity(p)}</span> <span class="text-slate-400 text-[11px] ml-1">(Alamat detail jalan terkunci)</span>`
              }
            </div>
            ${access.canViewGpsMap ? `
              <a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" class="text-brand-600 hover:text-brand-700 font-bold shrink-0 ml-2 text-xs">
                <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Buka Peta
              </a>
            ` : ''}
          </div>
        </div>

        <!-- 10 Atribut Wajib Listing & Finansial -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
              <h5 class="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <i class="fa-solid fa-list-check text-emerald-600"></i>
                <span>10 Atribut Wajib Listing</span>
              </h5>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.listingStatus === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">
                ${esc(p.listingStatus || 'Tersedia')}
              </span>
            </div>

            <div class="divide-y divide-slate-200">
              ${p.sourceType ? `
              <div class="py-1.5 flex justify-between items-center">
                <span class="text-slate-500">Sumber Limbah:</span>
                <span class="font-bold ${
                  p.sourceType === 'source_household' ? 'text-emerald-700' :
                  p.sourceType === 'source_medium_industry' ? 'text-blue-700' : 'text-amber-800'
                }">
                  ${p.sourceType === 'source_household' ? '🏠 Rumah Tangga / Perorangan' : p.sourceType === 'source_medium_industry' ? '🏢 Industri Menengah / UMKM' : '🏭 Industri Besar / Pabrik'}
                </span>
              </div>
              ` : ''}
              ${p.nib ? `
              <div class="py-1.5 flex justify-between items-center">
                <span class="text-slate-500">Nomor Induk Berusaha (NIB):</span>
                <span class="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">${p.nib}</span>
              </div>
              ` : ''}
              ${p.tpsPermit ? `
              <div class="py-1.5 flex justify-between items-center">
                <span class="text-slate-500">No. Izin TPS / KLHK:</span>
                <span class="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">${esc(p.tpsPermit)}</span>
              </div>
              ` : ''}
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">1. Komoditas / Jenis:</span>
                <span class="font-semibold text-slate-900">${esc(p.categoryName)}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">2. Berat / Volume:</span>
                <span class="font-bold text-slate-900">${qtyDisplay} (${esc(p.containerType)})</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">3. Kondisi Material:</span>
                <span class="font-semibold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">${esc(p.condition || 'Bersih')}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">4. Kadar / Grade Mutu:</span>
                <span class="font-semibold text-emerald-800">${esc(p.grade || 'Grade Standar Industri')}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">5. Foto Eviden:</span>
                <span class="font-semibold text-slate-800">3 Sudut (Wadah, Sampel, Tera)</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">6. Lokasi Gudang:</span>
                <span class="font-semibold text-slate-800">${this.getCity(p)}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">7. Minimal Order (MOQ):</span>
                <span class="font-semibold text-slate-900">${p.minimumOrder || 1} ${p.minimumOrderUnit || p.unit || 'Kg'}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">8. Jadwal Pengambilan:</span>
                <span class="font-semibold text-slate-900">${p.pickupSchedule || 'Siap Angkut Segera'}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">9. Asal Usul Limbah:</span>
                <span class="font-semibold text-slate-800 truncate max-w-[180px]">${esc(p.origin || 'Sentra Industri')}</span>
              </div>
              <div class="py-1.5 flex justify-between items-center">
                <span class="text-slate-500">10. Regulasi KLHK:</span>
                ${p.isB3 ? `
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    ⚠️ Limbah B3 (${esc(p.b3PermitNumber || 'Izin KLHK Valid')})
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Limbah Non-B3 (Umum)
                  </span>
                `}
              </div>
            </div>
          </div>

          <!-- Finansial Sesuai Hak Akses -->
          <div class="bg-slate-900 text-white p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <span class="text-[10px] font-mono text-brand-400 font-bold uppercase">Struktur Nilai Transaksi</span>
              
              ${access.canViewPrice ? `
                <div class="mt-2 mb-3">
                  <div class="text-xs text-slate-400">Total Nilai Limbah:</div>
                  <div class="text-2xl font-extrabold font-mono text-white">${this.formatRupiah(p.totalPrice)}</div>
                  <div class="text-xs text-emerald-400 font-mono">@ ${this.formatRupiah(p.offerPrice)} / ${p.unit}</div>
                </div>

                <div class="space-y-1.5 text-xs border-t border-slate-800 pt-2 font-mono">
                  ${this.store.isDpEnabled() ? `
                  <div class="flex justify-between text-slate-300">
                    <span>DP ${(this.store.getSettings().downPaymentPercent || 30)}% Escrow:</span>
                    <span class="font-bold text-brand-400">${this.formatRupiah(Math.round(p.totalPrice * ((this.store.getSettings().downPaymentPercent || 30) / 100)))}</span>
                  </div>
                  ` : `
                  <div class="flex justify-between text-emerald-400 font-semibold">
                    <span>Sistem Transaksi:</span>
                    <span>Pelunasan Penuh Rekening Bersama</span>
                  </div>
                  `}
                  <div class="flex justify-between text-slate-300">
                    <span>Biaya Penanganan:</span>
                    <span>${this.formatRupiah(this.store.getHandlingFeeForUser(currentUser))}</span>
                  </div>
                </div>
              ` : `
                <div class="mt-2 mb-3 space-y-1">
                  <div class="text-xs text-slate-400">Total Nilai Limbah:</div>
                  <div class="text-xl font-bold text-amber-400 font-mono">🔒 Terproteksi</div>
                  <p class="text-[11px] text-slate-400">
                    ${access.priceBlockReason === 'public' 
                      ? 'Daftar sebagai Pembeli untuk melihat harga.' 
                      : `Nilai transaksi limbah ini di atas kuota paket Anda (${this.formatRupiah(access.tier ? access.tier.maxPriceLimit : 0)}).`
                    }
                  </p>
                </div>
              `}
            </div>

            <!-- Bagian Kontak WA Penjual Sesuai Tier -->
            <div class="mt-4 pt-3 border-t border-slate-800 text-xs">
              <div class="font-bold text-slate-300 mb-1.5 flex items-center">
                <i class="fa-brands fa-whatsapp text-emerald-400 mr-1.5"></i> Kontak Penjual:
              </div>
              ${access.canViewWhatsapp ? `
                <div class="flex items-center justify-between bg-slate-800 p-2 rounded-xl">
                  <span class="font-mono text-emerald-300 font-bold">${p.sellerPhone || '+62 813-8822-1100'}</span>
                  <a href="https://wa.me/${p.sellerWhatsapp || '6281388221100'}?text=Halo%20penjual%20BURSA LIMBAH,%20saya%20tertarik%20dengan%20${encodeURIComponent(p.title)}" target="_blank" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold">
                    Chat WA Langsung
                  </a>
                </div>
              ` : `
                <div class="text-[11px] text-slate-400 flex items-center justify-between bg-slate-800/80 p-2 rounded-xl">
                  <span>🔒 08xx-****-**** (Khusus Enterprise)</span>
                  <button onclick="app.closeModals(); app.openChatWithSeller('${p.id}', '${p.sellerId}')" class="text-emerald-400 font-bold underline">
                    Gunakan Layar Chat
                  </button>
                </div>
              `}
            </div>

            <!-- Tombol Aksi Bawah Modal -->
            <div class="mt-4 pt-3 border-t border-slate-800 flex gap-2">
              <button onclick="app.closeModals(); app.openChatWithSeller('${p.id}', '${p.sellerId}')" class="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 border border-slate-700">
                <i class="fa-solid fa-comments text-emerald-400"></i>
                <span>Buka Layar Chat</span>
              </button>

              ${access.canViewPrice ? `
                <button onclick="app.closeModals(); app.showOfferModal('${p.id}')" class="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-1.5">
                  <i class="fa-solid fa-handshake"></i><span>Tawar</span>
                </button>
                <button onclick="app.closeModals(); app.initiateCheckout('${p.id}')" class="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-1.5">
                  <i class="fa-solid fa-cart-check"></i>
                  <span>${this.store.isDpEnabled() ? `Pesan DP ${(this.store.getSettings().downPaymentPercent || 30)}%` : 'Pesan Pasokan'}</span>
                </button>
              ` : `
                <button onclick="app.closeModals(); app.showBuyerRegisterModal()" class="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-1.5">
                  <i class="fa-solid fa-crown"></i>
                  <span>Daftar / Buka Akses</span>
                </button>
              `}
            </div>

          </div>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (access.canViewGpsMap) {
      setTimeout(() => {
        this.initModalMap(p.lat, p.lng, p.title, p.origin);
      }, 150);
    }
  }

  initModalMap(lat, lng, title, origin) {
    const mapElement = [REDACTED]'product-modal-map');
    if (!mapElement) return;

    if (this.activeModalMap) {
      this.activeModalMap.remove();
      this.activeModalMap = null;
    }

    try {
      const map = L.map('product-modal-map').setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<strong>${title}</strong><br>${origin}`)
        .openPopup();

      this.activeModalMap = map;
      setTimeout(() => map.invalidateSize(), 200);
    } catch (e) {
      console.error("Leaflet map initialization error:", e);
    }
  }

  // ================= 6. FITUR LAYAR CHAT INTERAKTIF (IN-APP CHAT) =================
  openChatWithSeller(productId, sellerId) {
    const p = this.store.getProductById(productId) || this.store.getProducts()[0];
    this.currentChatProduct = p;
    this.currentChatSeller = sellerId || (p ? p.sellerId : 'user_seller_1');

    const drawer = [REDACTED]'chat-drawer');
    const titleEl = [REDACTED]'chat-product-title');
    const codeEl = [REDACTED]'chat-product-code');
    const sellerEl = [REDACTED]'chat-seller-name');

    if (p && titleEl) titleEl.textContent = p.title;
    if (p && codeEl) codeEl.textContent = p.code;
    if (p && sellerEl) sellerEl.textContent = p.sellerName;

    this.renderChatMessages();

    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
    this.chatOpen = true;

    // Bersihkan unread badge
    const badge = [REDACTED]'chat-unread-badge');
    if (badge) badge.classList.add('hidden');

    const input = [REDACTED]'chat-input-text');
    if (input) input.focus();
  }

  toggleChat() {
    return this.toggleChatDrawer();
  }

  toggleChatDrawer() {
    const drawer = [REDACTED]'chat-drawer');
    if (!drawer) return;

    if (drawer.classList.contains('hidden')) {
      if (!this.currentChatProduct) {
        const p = this.store.getProducts()[0];
        this.openChatWithSeller(p.id, p.sellerId);
      } else {
        drawer.classList.remove('hidden');
        drawer.classList.add('flex');
        this.chatOpen = true;
        this.renderChatMessages();
      }
    } else {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
      this.chatOpen = false;
    }
  }

  closeChatDrawer() {
    const drawer = [REDACTED]'chat-drawer');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
      this.chatOpen = false;
    }
  }

  renderChatMessages() {
    const body = [REDACTED]'chat-messages-body');
    if (!body) return;

    const productId = this.currentChatProduct ? this.currentChatProduct.id : null;
    const chats = this.store.getChats(productId);

    if (chats.length === 0) {
      body.innerHTML = `
        <div class="text-center text-slate-400 py-10 space-y-2">
          <i class="fa-solid fa-comments text-3xl text-slate-300"></i>
          <p class="text-xs">Mulai percakapan dengan penjual terkait spesifikasi limbah, ketersediaan tonase, atau jadwal armada.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = chats.map(msg => {
      const isBuyer = msg.senderRole === 'buyer';
      return `
        <div class="flex flex-col ${isBuyer ? 'items-end' : 'items-start'} space-y-1">
          <div class="text-[10px] text-slate-400 px-1 font-medium">${esc(msg.senderName)} • ${msg.timestamp}</div>
          <div class="max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
            isBuyer 
              ? 'bg-brand-600 text-white rounded-br-none shadow-sm' 
              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
          }">
            ${esc(msg.text)}
          </div>
        </div>
      `;
    }).join('');

    body.scrollTop = body.scrollHeight;
  }

  handleSendChatMessage(event) {
    event.preventDefault();
    const input = [REDACTED]'chat-input-text');
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    input.value = '';

    const p = this.currentChatProduct || this.store.getProducts()[0];
    const user = this.store.getCurrentUser();

    // Kirim pesan pembeli
    this.store.sendChatMessage({
      productId: p.id,
      productTitle: p.title,
      sellerId: p.sellerId,
      buyerId: user ? user.id : 'user_buyer_1',
      text,
      senderRole: 'buyer',
      senderName: user ? user.name : 'PT Pembeli'
    });

    this.renderChatMessages();

    // Simulasi respons otomatis penjual dalam 1.5 detik
    setTimeout(() => {
      const replies = [
        "Terima kasih atas pesannya! Pasokan limbah ini masih tersedia dan siap muat.",
        "Kadar mutu sudah sesuai eviden tera digital yang terverifikasi tim BURSA LIMBAH.",
        "Armada Anda dapat dijadwalkan datang sesuai kesepakatan setelah pembayaran DP 30% di rekening bersama masuk.",
        "Baik, kami siapkan dokumen jalan dan sampel uji sebelum armada tiba di gudang."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];

      this.store.sendChatMessage({
        productId: p.id,
        productTitle: p.title,
        sellerId: p.sellerId,
        buyerId: user ? user.id : 'user_buyer_1',
        text: randomReply,
        senderRole: 'seller',
        senderName: p.sellerName
      });

      this.renderChatMessages();
      this.showToast(`Pesan baru dari ${esc(p.sellerName)}`, 'success');
    }, 1500);
  }

  sendQuickReply(text) {
    const input = [REDACTED]'chat-input-text');
    if (input) {
      input.value = text;
      [REDACTED]'chat-input-form').dispatchEvent(new Event('submit'));
    }
  }

  updateChatUnreadBadge() {
    const badge = [REDACTED]'chat-unread-badge');
    if (badge) {
      const chats = this.store.getChats();
      badge.textContent = chats.length > 0 ? chats.length : 1;
    }
  }

  // ================= 7. KONTROL ADMIN: ATUR 3-TIER & BATAS RENTANG NILAI JUAL =================
  switchAdminTab(tab) {
    this.currentAdminTab = tab;
    const tabs = ['verification', 'orders', 'financial', 'reports', 'subscriptions', 'events', 'tickets', 'tiers', 'settings', 'support'];
    tabs.forEach(t => {
      const btn = [REDACTED]`admin-tab-btn-${t}`);
      const content = [REDACTED]`admin-content-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-4 py-2.5 text-xs font-bold border-b-2 border-brand-600 text-brand-700 bg-white rounded-t-lg transition flex items-center space-x-1.5 shrink-0';
        } else {
          btn.className = 'px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-t-lg transition flex items-center space-x-1.5 shrink-0';
        }
      }
      if (content) {
        if (t === tab) content.classList.remove('hidden');
        else content.classList.add('hidden');
      }
    });

    if (tab === 'verification') this.renderAdminPendingTable();
    if (tab === 'orders') this.renderAdminOrdersTable();
    if (tab === 'financial') this.renderAdminFinancialReport();
    if (tab === 'reports') this.renderAdminSalesPurchaseReport();
    if (tab === 'subscriptions') this.renderAdminSubscriptionRequestsTable();
    if (tab === 'events') this.renderAdminEventsTable();
    if (tab === 'tickets') this.renderAdminTicketsSection();
    if (tab === 'tiers') this.renderAdminTierForms();
    if (tab === 'settings') this.populateAdminSettings();
    if (tab === 'support') this.populateSupportSettings();
  }

  // ================= 7B. APPROVAL BERLANGGANAN PEMBELI (ADMIN CONTROL) =================
  filterAdminSubscriptionRequests(status) {
    this.currentAdminSubFilter = status;
    const buttons = ['all', 'pending', 'approved'];
    buttons.forEach(b => {
      const el = [REDACTED]`sub-filter-${b}`);
      if (el) {
        if (b === status) {
          el.className = 'sub-filter-btn px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white transition';
        } else {
          el.className = 'sub-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 transition';
        }
      }
    });
    this.renderAdminSubscriptionRequestsTable();
  }

  updateAdminSubPendingBadge() {
    const count = this.store.getPendingSubscriptionRequestsCount();
    const tabBadge = [REDACTED]'admin-tab-sub-pending-badge');
    const filterCount = [REDACTED]'sub-pending-count');
    if (tabBadge) {
      tabBadge.textContent = count;
      tabBadge.classList.toggle('hidden', count === 0);
    }
    if (filterCount) {
      filterCount.textContent = count;
    }
  }

  renderAdminSubscriptionRequestsTable() {
    const container = [REDACTED]'admin-subscriptions-table-container');
    if (!container) return;

    const filter = this.currentAdminSubFilter || 'all';
    const requests = this.store.getSubscriptionRequests(filter);

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
          <i class="fa-solid fa-clipboard-check text-3xl mb-2 text-slate-300"></i>
          <p class="text-xs font-bold">Tidak ada permohonan langganan ${filter === 'pending' ? 'yang menunggu verifikasi' : ''}.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Pemohon &amp; Perusahaan</th>
            <th class="p-3">Paket Langganan</th>
            <th class="p-3">Tarif Bulanan</th>
            <th class="p-3">Metode &amp; Bukti</th>
            <th class="p-3">Waktu Pengajuan</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Aksi Approval</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${requests.map(r => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3">
                <div class="font-bold text-slate-900">${r.userName}</div>
                <div class="text-[11px] text-slate-500">${esc(r.company)} • ${esc(r.phone || r.email)}</div>
              </td>
              <td class="p-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  ${r.tierName}
                </span>
              </td>
              <td class="p-3 font-mono font-bold text-slate-800">${this.formatRupiah(r.monthlyFee)}/bln</td>
              <td class="p-3">
                <div class="text-slate-700 font-medium">${r.paymentMethod}</div>
                ${r.paymentProof ? `
                  <a href="${r.paymentProof}" target="_blank" class="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 underline font-semibold mt-0.5">
                    <i class="fa-solid fa-receipt"></i> Bukti Bayar
                  </a>
                ` : `<span class="text-slate-400 text-[10px]">-</span>`}
              </td>
              <td class="p-3 text-slate-500 text-[11px] font-mono">${r.requestedAt}</td>
              <td class="p-3">
                ${r.status === 'approved' 
                  ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Disetujui</span>`
                  : r.status === 'rejected'
                  ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Ditolak</span>`
                  : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Menunggu Verifikasi</span>`
                }
              </td>
              <td class="p-3 text-right">
                ${r.status === 'pending' ? `
                  <div class="flex items-center justify-end gap-1.5">
                    <button onclick="app.approveSubscription('${r.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 active:scale-95 transition">
                      <i class="fa-solid fa-check"></i>
                      <span>Setujui</span>
                    </button>
                    <button onclick="app.rejectSubscription('${r.id}')" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition">
                      <i class="fa-solid fa-xmark"></i>
                      <span>Tolak</span>
                    </button>
                  </div>
                ` : `
                  <span class="text-slate-400 text-[11px] font-semibold">${r.approvedAt ? 'Diproses: ' + r.approvedAt : 'Selesai'}</span>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  approveSubscription(requestId) {
    const res = this.store.approveSubscriptionRequest(requestId);
    if (res.success) {
      this.updateAdminSubPendingBadge();
      this.renderAdminSubscriptionRequestsTable();
      this.renderBuyerMarketplace();
      this.showToast(`Langganan ${res.request.userName} (${res.request.tierName}) berhasil disetujui &amp; akun telah diaktifkan!`, "success");
    } else {
      this.showToast(res.message || "Gagal menyetujui langganan.", "error");
    }
  }

  rejectSubscription(requestId) {
    const res = this.store.rejectSubscriptionRequest(requestId);
    if (res.success) {
      this.updateAdminSubPendingBadge();
      this.renderAdminSubscriptionRequestsTable();
      this.showToast(`Permohonan langganan ${res.request.userName} ditolak.`, "warning");
    } else {
      this.showToast(res.message || "Gagal menolak permohonan.", "error");
    }
  }

  // ================= 7C. MANAJEMEN EVENT & AGENDA (ADMIN CONTROL) =================
  renderAdminEventsTable() {
    const container = [REDACTED]'admin-events-table-container');
    if (!container) return;

    const events = this.store.getEvents('semua');
    if (events.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
          <i class="fa-solid fa-calendar-plus text-3xl mb-2 text-indigo-300"></i>
          <p class="text-xs font-bold">Belum ada agenda event terdaftar.</p>
          <button onclick="app.showAddEventModal()" class="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">Tambah Event Pertama</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Agenda Event</th>
            <th class="p-3">Kategori</th>
            <th class="p-3">Tanggal &amp; Waktu</th>
            <th class="p-3">Lokasi</th>
            <th class="p-3">Tiket / Biaya</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${events.map(e => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3">
                <div class="flex items-center space-x-3">
                  <img src="${e.image}" alt="${esc(e.title)}" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" onerror="this.src='https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'">
                  <div>
                    <div class="font-bold text-slate-900 leading-tight">${esc(e.title)}</div>
                    <div class="text-[11px] text-slate-400 line-clamp-1">${esc(e.description)}</div>
                  </div>
                </div>
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  ${e.categoryLabel || e.category}
                </span>
              </td>
              <td class="p-3 font-mono text-[11px]">
                <div class="font-bold text-slate-800">${e.day} ${e.monthYear}</div>
                <div class="text-slate-400">${e.time || '-'}</div>
              </td>
              <td class="p-3 text-slate-600 text-[11px] max-w-[150px] truncate">${esc(e.location)}</td>
              <td class="p-3 font-semibold ${e.isFree ? 'text-emerald-700' : 'text-slate-800'}">${e.priceLabel}</td>
              <td class="p-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${e.status === 'published' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}">
                  ${e.status === 'published' ? 'Publik' : 'Draf'}
                </span>
              </td>
              <td class="p-3 text-right space-x-1 whitespace-nowrap">
                <button onclick="app.openTicketGeneratorForEvent('${e.id}')" title="Terbitkan &amp; Cetak Tiket QR" class="px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-bold text-[11px] transition inline-flex items-center gap-1">
                  <i class="fa-solid fa-qrcode text-[10px]"></i>
                  <span>Tiket</span>
                </button>
                <button onclick="app.showEditEventModal('${e.id}')" title="Edit Event" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="app.deleteEvent('${e.id}')" title="Hapus Event" class="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  showAddEventModal() {
    const modal = [REDACTED]'modal-admin-event');
    if (!modal) return;
    [REDACTED]'modal-admin-event-title').textContent = "Tambah Event Baru";
    [REDACTED]'form-admin-event').reset();
    [REDACTED]'evt-id').value = "";
    [REDACTED]'evt-date').value = new Date().toISOString().split('T')[0];
    [REDACTED]'evt-image').value = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  showEditEventModal(id) {
    const e = this.store.getEventById(id);
    if (!e) return;
    const modal = [REDACTED]'modal-admin-event');
    if (!modal) return;

    [REDACTED]'modal-admin-event-title').textContent = "Edit Event &amp; Agenda";
    [REDACTED]'evt-id').value = e.id;
    [REDACTED]'evt-title').value = e.title;
    [REDACTED]'evt-category').value = e.category;
    [REDACTED]'evt-status').value = e.status || "published";
    [REDACTED]'evt-date').value = e.date || "";
    [REDACTED]'evt-time').value = e.time || "";
    [REDACTED]'evt-location').value = e.location || "";
    [REDACTED]'evt-price').value = this.getEventTicketPrice(e);
    [REDACTED]'evt-image').value = e.image || "";
    [REDACTED]'evt-desc').value = e.description || "";

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  handleSaveEvent(event) {
    event.preventDefault();
    const id = [REDACTED]'evt-id').value;
    const title = [REDACTED]'evt-title').value.trim();
    const category = [REDACTED]'evt-category').value;
    const status = [REDACTED]'evt-status').value;
    const date = [REDACTED]'evt-date').value;
    const time = [REDACTED]'evt-time').value.trim();
    const location = [REDACTED]'evt-location').value.trim();
    const price = Math.max(0, Number([REDACTED]'evt-price').value) || 0);
    const image = [REDACTED]'evt-image').value.trim() || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';
    const description = [REDACTED]'evt-desc').value.trim();

    const categoryLabels = {
      workshop: 'Workshop',
      seminar: 'Seminar',
      pameran: 'Pameran & Expo',
      'business-matching': 'Business Matching',
      webinar: 'Webinar Online'
    };

    const isFree = price === 0;

    const eventPayload = {
      title,
      category,
      categoryLabel: categoryLabels[category] || category,
      status,
      date,
      time,
      location,
      price,
      priceLabel: isFree ? 'Gratis' : `${this.formatRupiah(price)} / peserta`,
      isFree,
      image,
      description
    };

    if (id) {
      this.store.updateEvent(id, eventPayload);
      this.showToast(`Event "${title}" berhasil diperbarui!`, "success");
    } else {
      this.store.addEvent(eventPayload);
      this.showToast(`Event "${title}" berhasil dipublikasikan!`, "success");
    }

    this.closeModals();
    this.renderAdminEventsTable();
    this.renderEvents('semua');
  }

  deleteEvent(id) {
    if (confirm("Apakah Anda yakin ingin menghapus agenda event ini?")) {
      this.store.deleteEvent(id);
      this.renderAdminEventsTable();
      this.renderEvents('semua');
      this.showToast("Event berhasil dihapus.", "success");
    }
  }

  // ================= 7D. PENGATURAN DP & STATUS TOGGLE (ADMIN CONTROL) =================
  handleDpToggleChange(checked) {
    const badge = [REDACTED]'setting-dp-status-badge');
    const label = [REDACTED]'setting-dp-toggle-label');
    const percentGroup = [REDACTED]'setting-dp-percent-group');

    if (checked) {
      if (badge) {
        badge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
        badge.textContent = 'AKTIF (DP ESCROW)';
      }
      if (label) label.textContent = 'Fitur DP Aktif: Pembeli wajib bayar uang muka ke Rekber';
      if (percentGroup) percentGroup.classList.remove('opacity-60');
    } else {
      if (badge) {
        badge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200';
        badge.textContent = 'NONAKTIF (SET OFF)';
      }
      if (label) label.textContent = 'Fitur DP Saat Ini Dinonaktifkan (Pelunasan Penuh)';
      if (percentGroup) percentGroup.classList.add('opacity-60');
    }
  }

  renderAdminTierForms() {
    const container = [REDACTED]'admin-tiers-input-cards');
    if (!container) return;

    const tiers = this.store.getSubscriptionTiers();

    container.innerHTML = tiers.map((t, idx) => {
      const canBooking = t.canBooking !== false;
      const minBookingPrice = Number(t.minBookingOfferPrice) || 0;
      const maxBookingPrice = t.maxBookingOfferPrice === null || t.maxBookingOfferPrice === undefined ? 0 : Number(t.maxBookingOfferPrice);
      const minBookingVol = Number(t.minBookingVolume) || 0;
      const maxBookingVol = t.maxBookingVolume === null || t.maxBookingVolume === undefined ? 0 : Number(t.maxBookingVolume);
      const volUnit = t.volumeUnit || 'Kg';

      return `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div>
              <span class="font-extrabold text-sm text-slate-900">${esc(t.name)}</span>
              <div class="text-[10px] text-slate-400">ID: ${t.id}</div>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 uppercase">${t.badge}</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tarif Bulanan (Rp)</label>
              <input type="number" id="admin-tier-fee-${t.id}" value="${t.monthlyFee}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Batas Lihat Harga (Rp)
              </label>
              <input type="number" id="admin-tier-limit-${t.id}" value="${t.maxPriceLimit || 0}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-brand-500 focus:outline-none">
              <span class="text-[9px] text-slate-400">0 = Unlimited</span>
            </div>
          </div>

          <!-- Rules Transaksi Booking untuk Tiap Tier -->
          <div class="p-3 bg-violet-50/70 rounded-xl border border-violet-200/80 space-y-3">
            <div class="flex items-center justify-between">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" id="admin-tier-can-booking-${t.id}" ${canBooking ? 'checked' : ''} class="accent-violet-600 rounded w-4 h-4">
                <span class="text-xs font-bold text-violet-950">Izinkan Fitur Booking</span>
              </label>
              <span class="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${canBooking ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                ${canBooking ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <!-- Rentang Nilai Penawaran yang Bisa Dibooking -->
            <div>
              <div class="text-[10px] font-bold uppercase text-violet-800 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-rupiah-sign"></i> Rentang Nilai Penawaran Booking (Rp)
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] text-slate-500 mb-0.5">Min Penawaran (Rp)</label>
                  <input type="number" id="admin-tier-min-booking-price-${t.id}" value="${minBookingPrice}" placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-[9px] text-slate-500 mb-0.5">Maks Penawaran (Rp)</label>
                  <input type="number" id="admin-tier-max-booking-price-${t.id}" value="${maxBookingPrice}" placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </div>
              </div>
              <span class="text-[9px] text-slate-400 mt-0.5 block">Maksimal 0 = Tanpa batas atas penawaran</span>
            </div>

            <!-- Rentang Volume yang Bisa Dibooking -->
            <div>
              <div class="text-[10px] font-bold uppercase text-violet-800 mb-1.5 flex items-center gap-1">
                <i class="fa-solid fa-weight-hanging"></i> Rentang Volume / Tonase Booking
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[9px] text-slate-500 mb-0.5">Min Volume</label>
                  <input type="number" id="admin-tier-min-booking-vol-${t.id}" value="${minBookingVol}" placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-[9px] text-slate-500 mb-0.5">Maks Volume</label>
                  <input type="number" id="admin-tier-max-booking-vol-${t.id}" value="${maxBookingVol}" placeholder="0" class="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-2 focus:ring-violet-500 focus:outline-none">
                </div>
                <div>
                  <label class="block text-[9px] text-slate-500 mb-0.5">Satuan</label>
                  <select id="admin-tier-vol-unit-${t.id}" class="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-violet-500 focus:outline-none">
                    <option value="Kg" ${volUnit === 'Kg' ? 'selected' : ''}>Kg</option>
                    <option value="Ton" ${volUnit === 'Ton' ? 'selected' : ''}>Ton</option>
                    <option value="Liter" ${volUnit === 'Liter' ? 'selected' : ''}>Liter</option>
                    <option value="Bal" ${volUnit === 'Bal' ? 'selected' : ''}>Bal</option>
                  </select>
                </div>
              </div>
              <span class="text-[9px] text-slate-400 mt-0.5 block">Maksimal 0 = Tanpa batas volume booking</span>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-200 text-xs">
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="admin-tier-gps-${t.id}" ${t.allowGpsMap ? 'checked' : ''} class="accent-brand-600 rounded">
              <span class="text-slate-700">Buka Akses Peta GPS Leaflet</span>
            </label>
            <label class="flex items-center space-x-2">
              <input type="checkbox" id="admin-tier-wa-${t.id}" ${t.allowWhatsapp ? 'checked' : ''} class="accent-brand-600 rounded">
              <span class="text-slate-700">Buka Nomor Direct WhatsApp Penjual</span>
            </label>
            <label class="flex items-center space-x-2">
              <input type="checkbox" checked disabled class="accent-brand-600 rounded">
              <span class="text-slate-500">Fitur Layar Chat (Selalu Aktif)</span>
            </label>
          </div>
        </div>
      `;
    }).join('');
  }

  saveAdminTiers(event) {
    event.preventDefault();
    const tiers = this.store.getSubscriptionTiers();

    tiers.forEach(t => {
      const feeInput = [REDACTED]`admin-tier-fee-${t.id}`);
      const limitInput = [REDACTED]`admin-tier-limit-${t.id}`);
      const gpsInput = [REDACTED]`admin-tier-gps-${t.id}`);
      const waInput = [REDACTED]`admin-tier-wa-${t.id}`);
      const canBookingInput = [REDACTED]`admin-tier-can-booking-${t.id}`);
      const minPriceInput = [REDACTED]`admin-tier-min-booking-price-${t.id}`);
      const maxPriceInput = [REDACTED]`admin-tier-max-booking-price-${t.id}`);
      const minVolInput = [REDACTED]`admin-tier-min-booking-vol-${t.id}`);
      const maxVolInput = [REDACTED]`admin-tier-max-booking-vol-${t.id}`);
      const volUnitInput = [REDACTED]`admin-tier-vol-unit-${t.id}`);

      if (feeInput && limitInput) {
        const rawMaxPrice = Number(maxPriceInput?.value) || 0;
        const rawMaxVol = Number(maxVolInput?.value) || 0;

        this.store.updateSubscriptionTier(t.id, {
          monthlyFee: Number(feeInput.value) || 0,
          maxPriceLimit: Number(limitInput.value) || 0,
          allowGpsMap: gpsInput ? gpsInput.checked : false,
          allowWhatsapp: waInput ? waInput.checked : false,
          canBooking: canBookingInput ? canBookingInput.checked : true,
          minBookingOfferPrice: Number(minPriceInput?.value) || 0,
          maxBookingOfferPrice: rawMaxPrice > 0 ? rawMaxPrice : null,
          minBookingVolume: Number(minVolInput?.value) || 0,
          maxBookingVolume: rawMaxVol > 0 ? rawMaxVol : null,
          volumeUnit: volUnitInput ? volUnitInput.value : 'Kg'
        });
      }
    });

    // Sync updated tiers into settings
    this.store.updateSettings({ subscriptionTiers: this.store.getSubscriptionTiers() });

    this.renderPublicSubscriptionTiers();
    this.renderBuyerMarketplace();
    this.showToast("Aturan transaksi, batas rentang nilai penawaran, volume booking, dan hak akses tier berhasil disimpan!", "success");
  }

  // ================= 8. ADMIN KURASI & DASHBOARD =================
  renderAdminDashboard() {
    const stats = this.store.getAdminStats();
    [REDACTED]'admin-stat-pending').textContent = stats.pendingReview;
    [REDACTED]'admin-stat-gmv').textContent = this.formatRupiah(stats.totalGMV);
    [REDACTED]'admin-stat-revenue').textContent = this.formatRupiah(stats.totalPlatformRevenue);
    [REDACTED]'admin-stat-subscribers').textContent = `${stats.activeSubscribers} Member Aktif`;

    this.renderAdminPendingTable();
    this.renderAdminOrdersTable();
    this.renderAdminSubscriptionRequestsTable();
    this.renderAdminEventsTable();
    this.renderAdminTierForms();
    this.updateAdminSubPendingBadge();
    this.updateAdminTicketsBadge();
  }

  updateAdminPendingBadge() {
    const stats = this.store.getAdminStats();
    const pill = [REDACTED]'admin-pending-pill');
    const tabBadge = [REDACTED]'admin-tab-pending-badge');
    if (pill) {
      pill.textContent = stats.pendingReview;
      pill.classList.toggle('hidden', stats.pendingReview === 0);
    }
    if (tabBadge) tabBadge.textContent = stats.pendingReview;
  }

  renderAdminPendingTable() {
    const container = [REDACTED]'admin-pending-table-container');
    if (!container) return;

    const pending = this.store.getProducts({ status: 'pending' });
    if (pending.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i>
          <p>Seluruh pasokan limbah telah selesai dikurasi.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode Pasokan</th>
            <th class="p-3">Komoditas & Judul</th>
            <th class="p-3">Penjual</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">Eviden & GPS</th>
            <th class="p-3 text-right">Tindakan Admin</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${pending.map(p => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-mono font-bold text-slate-700">${esc(p.code)}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${esc(p.title)}</div>
                <div class="text-[11px] text-slate-500">${esc(p.categoryName)} • ${esc(p.origin)}</div>
                ${p.sourceType ? `
                  <span class="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    p.sourceType === 'source_household' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    p.sourceType === 'source_medium_industry' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-amber-50 text-amber-800 border border-amber-200'
                  }">
                    ${p.sourceType === 'source_household' ? '🏠 Rumah Tangga' : p.sourceType === 'source_medium_industry' ? '🏢 Industri Menengah' : '🏭 Industri Besar'}
                  </span>
                ` : ''}
              </td>
              <td class="p-3 text-slate-800">${esc(p.sellerName)}</td>
              <td class="p-3 font-mono font-bold text-emerald-700">${this.formatRupiah(p.totalPrice)}</td>
              <td class="p-3 text-[11px] text-slate-600">
                <span class="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  <i class="fa-solid fa-images mr-1"></i>3 Foto Tera
                </span>
                <div class="font-mono text-[10px] text-slate-400 mt-0.5">${p.lat}, ${p.lng}</div>
              </td>
              <td class="p-3 text-right space-x-1.5">
                <button onclick="app.showProductDetail('${p.id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs">
                  Tinjau
                </button>
                <button onclick="app.approveProduct('${p.id}')" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  Setujui
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  approveProduct(productId) {
    this.store.updateProductStatus(productId, 'approved');
    this.showToast("Pasokan limbah berhasil disetujui dan tayang di bursa!", "success");
    this.renderAdminDashboard();
    this.renderPublicPostings();
    this.renderBuyerMarketplace();
    this.updateAdminPendingBadge();
  }

  renderAdminOrdersTable() {
    const container = [REDACTED]'admin-orders-table-container');
    if (!container) return;

    const orders = this.store.getOrders();
    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode Booking</th>
            <th class="p-3">Produk & Pembeli</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">DP 30% Terkunci</th>
            <th class="p-3">Biaya Penanganan</th>
            <th class="p-3">Sisa & Pelunasan</th>
            <th class="p-3">Status Rekening Bersama</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${orders.map(o => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-mono font-bold text-brand-700">
                <div>${esc(o.bookingCode)}</div>
                <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0,10)}</div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${esc(o.productTitle)}</div>
                <div class="text-[11px] text-slate-500">Pembeli: ${esc(o.buyerName)}</div>
                <div class="text-[10px] text-slate-400">Penjual: ${esc(o.sellerName || '-')}</div>
              </td>
              <td class="p-3 font-mono font-bold">${this.formatRupiah(o.totalPrice)}</td>
              <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.downPaymentAmount)}</td>
              <td class="p-3 font-mono text-slate-600">${this.formatRupiah(o.handlingFee)}</td>
              <td class="p-3">
                ${o.remainingPayment > 0 ? `
                  <div class="font-mono text-xs text-red-600 font-semibold">${this.formatRupiah(o.remainingPayment)}</div>
                  ${['submitted', 'proof_submitted'].includes(o.remainingPaymentStatus) ? `
                    <div class="mt-1 space-y-1">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <i class="fa-solid fa-clock-rotate-left"></i> Bukti Diterima
                      </span>
                      <div class="flex gap-1 mt-1">
                        <button onclick="app.openViewRemainingProofModal('${o.id}')" class="flex-1 px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold transition" title="Lihat foto bukti transfer dan catatan">
                          <i class="fa-solid fa-eye mr-0.5"></i> Cek
                        </button>
                        <button onclick="app.verifyRemainingPayment('${o.id}')" class="flex-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition" title="Verifikasi pelunasan">
                          <i class="fa-solid fa-circle-check mr-0.5"></i> Lunas
                        </button>
                      </div>
                    </div>
                  ` : ['paid', 'completed', 'verified_by_admin'].includes(o.remainingPaymentStatus) ? `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <i class="fa-solid fa-circle-check"></i> Lunas
                    </span>
                  ` : `
                    <span class="text-[10px] text-slate-400">Menunggu Pembayaran</span>
                  `}
                ` : `<span class="text-[10px] text-slate-400">-</span>`}
              </td>
              <td class="p-3">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ${o.paymentStatus}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Alias for admin/seller remaining payment re-render
  renderAdminOrders() { this.renderAdminOrdersTable(); }
  renderSellerOrders() {
    // Re-render seller dashboard orders section
    const user = this.store.getCurrentUser();
    if (user && user.role === 'seller') this.renderSellerDashboard();
  }



  populateAdminSettings() {
    const s = this.store.getSettings();
    const handling = [REDACTED]'setting-handling');
    const dp = [REDACTED]'setting-dp');
    const dpEnabledCheckbox = [REDACTED]'setting-dp-enabled');
    if (handling) handling.value = s.handlingFeePerTransaction || 10000;
    if (dp) dp.value = s.downPaymentPercent || 30;
    if (dpEnabledCheckbox) {
      dpEnabledCheckbox.checked = !!s.dpEnabled;
      this.handleDpToggleChange(!!s.dpEnabled);
    }
    this.updateDpSimulation();
    const fees = s.handlingFeeByTier || {};
    ['starter', 'basic', 'pro', 'enterprise'].forEach(tier => {
      const input = [REDACTED]`setting-handling-tier-${tier}`);
      if (input) input.value = Number(fees[`tier_${tier}`] ?? s.handlingFeePerTransaction ?? 10000);
    });

    // Payment Gateway fields
    const gatewayEnabled = [REDACTED]'setting-gateway-enabled');
    const provider = [REDACTED]'setting-gateway-provider');
    const environment = [REDACTED]'setting-gateway-environment');
    const clientKey = [REDACTED]'setting-gateway-client-key');
    const merchantId = [REDACTED]'setting-gateway-merchant-id');
    const serverKey = [REDACTED]'setting-gateway-server-key');
    const webhookUrl = [REDACTED]'setting-gateway-webhook-url');
    if (gatewayEnabled) gatewayEnabled.checked = !!s.paymentGatewayEnabled;
    if (provider) provider.value = s.paymentGatewayProvider || 'midtrans';
    if (environment) environment.value = s.paymentGatewayEnvironment || 'sandbox';
    if (clientKey) clientKey.value = s.paymentGatewayClientKey || '';
    if (merchantId) merchantId.value = s.paymentGatewayMerchantId || '';
    if (serverKey) serverKey.value = s.paymentGatewayServerKey || '';
    if (webhookUrl) webhookUrl.value = s.paymentGatewayWebhookUrl || '';

    // Payment Gateway channel checkboxes
    const channels = s.paymentGatewayChannels || [];
    ['qris', 'va', 'ewallet', 'cc', 'retail', 'paylater'].forEach(ch => {
      const chk = [REDACTED]`setting-gateway-ch-${ch}`);
      if (chk) chk.checked = channels.includes(ch);
    });

    // Expedition API fields
    const expedEnabled = [REDACTED]'setting-expedition-enabled');
    const expedProvider = [REDACTED]'setting-expedition-provider');
    const expedApiKey = [REDACTED]'setting-expedition-api-key');
    const expedOrigin = [REDACTED]'setting-expedition-origin');
    const expedWebhook = [REDACTED]'setting-expedition-webhook-url');
    if (expedEnabled) expedEnabled.checked = !!s.expeditionApiEnabled;
    if (expedProvider) expedProvider.value = s.expeditionApiProvider || 'rajaongkir';
    if (expedApiKey) expedApiKey.value = s.expeditionApiKey || '';
    if (expedOrigin) expedOrigin.value = s.expeditionApiOrigin || '';
    if (expedWebhook) expedWebhook.value = s.expeditionApiWebhookUrl || '';

    // Expedition courier checkboxes
    const couriers = s.expeditionApiCouriers || [];
    ['jne', 'jnt', 'sicepat', 'anteraja', 'pos', 'ninja', 'tiki', 'wahana'].forEach(c => {
      const chk = [REDACTED]`setting-expedition-courier-${c}`);
      if (chk) chk.checked = couriers.includes(c);
    });

    // Cloudinary Storage fields
    const cloudEnabled = [REDACTED]'setting-cloudinary-enabled');
    const cloudName = [REDACTED]'setting-cloudinary-cloud-name');
    const cloudPreset = [REDACTED]'setting-cloudinary-upload-preset');
    const cloudApiKey = [REDACTED]'setting-cloudinary-api-key');
    const cloudFolder = [REDACTED]'setting-cloudinary-folder');
    const cloudAutoOpt = [REDACTED]'setting-cloudinary-auto-optimize');
    const cldCfg = s.cloudinaryConfig || {};
    if (cloudEnabled) cloudEnabled.checked = !!cldCfg.enabled;
    if (cloudName) cloudName.value = cldCfg.cloudName || '';
    if (cloudPreset) cloudPreset.value = cldCfg.uploadPreset || '';
    if (cloudApiKey) cloudApiKey.value = cldCfg.apiKey || '';
    if (cloudFolder) cloudFolder.value = cldCfg.folder || 'circulink';
    if (cloudAutoOpt) cloudAutoOpt.checked = cldCfg.autoOptimize !== false;

    // Supabase Database fields
    const supaEnabled = [REDACTED]'setting-supabase-enabled');
    const supaUrl = [REDACTED]'setting-supabase-url');
    const supaAnonKey = [REDACTED]'setting-supabase-anon-key');
    const supaAutoSync = [REDACTED]'setting-supabase-auto-sync');
    const supaCfg = s.supabaseConfig || {};
    if (supaEnabled) supaEnabled.checked = !!supaCfg.enabled;
    if (supaUrl) supaUrl.value = supaCfg.url || '';
    if (supaAnonKey) supaAnonKey.value = supaCfg.anonKey || '';
    if (supaAutoSync) supaAutoSync.checked = !!supaCfg.syncEnabled;

    const tickerEnabled = [REDACTED]'setting-ticker-enabled');
    const tickerTitle = [REDACTED]'setting-ticker-title');
    const tickerRefreshMinutes = [REDACTED]'setting-ticker-refresh-minutes');
    if (tickerEnabled) tickerEnabled.checked = s.tickerEnabled !== false;
    if (tickerTitle) tickerTitle.value = s.tickerTitle || 'Harga Pasar Terkini';
    if (tickerRefreshMinutes) tickerRefreshMinutes.value = Math.min(120, Math.max(1, Number(s.tickerRefreshMinutes) || 15));
    const termsTitle = [REDACTED]'setting-terms-title');
    const termsVersion = [REDACTED]'setting-terms-version');
    const termsContent = [REDACTED]'setting-terms-content');
    if (termsTitle) termsTitle.value = s.termsTitle || 'Syarat dan Ketentuan Penggunaan Bursa Limbah';
    if (termsVersion) termsVersion.value = s.termsVersion || '1.0';
    if (termsContent) termsContent.value = s.termsContent || '';
    this.renderAdminFeesList();
  }


  saveAdminSettings(event) {
    event.preventDefault();
    const handling = Number([REDACTED]'setting-handling').value) || 10000;
    const dp = Number([REDACTED]'setting-dp').value) || 30;
    const dpEnabled = [REDACTED]'setting-dp-enabled')?.checked || false;
    const handlingFeeByTier = {
      tier_starter: Number([REDACTED]'setting-handling-tier-starter')?.value) || 0,
      tier_basic: Number([REDACTED]'setting-handling-tier-basic')?.value) || 0,
      tier_pro: Number([REDACTED]'setting-handling-tier-pro')?.value) || 0,
      tier_enterprise: Number([REDACTED]'setting-handling-tier-enterprise')?.value) || 0
    };

    // Collect payment channel checkboxes
    const paymentGatewayChannels = ['qris', 'va', 'ewallet', 'cc', 'retail', 'paylater']
      .filter(ch => [REDACTED]`setting-gateway-ch-${ch}`)?.checked);

    // Collect expedition courier checkboxes
    const expeditionApiCouriers = ['jne', 'jnt', 'sicepat', 'anteraja', 'pos', 'ninja', 'tiki', 'wahana']
      .filter(c => [REDACTED]`setting-expedition-courier-${c}`)?.checked);

    this.store.setDpSettings(dpEnabled, dp);
    this.store.updateSettings({
      handlingFeePerTransaction: handling,
      handlingFeeByTier,
      // Payment Gateway
      paymentGatewayEnabled: [REDACTED]'setting-gateway-enabled')?.checked || false,
      paymentGatewayProvider: [REDACTED]'setting-gateway-provider')?.value || 'midtrans',
      paymentGatewayEnvironment: [REDACTED]'setting-gateway-environment')?.value || 'sandbox',
      paymentGatewayClientKey: [REDACTED]'setting-gateway-client-key')?.value.trim() || '',
      paymentGatewayMerchantId: [REDACTED]'setting-gateway-merchant-id')?.value.trim() || '',
      paymentGatewayServerKey: [REDACTED]'setting-gateway-server-key')?.value.trim() || '',
      paymentGatewayWebhookUrl: [REDACTED]'setting-gateway-webhook-url')?.value.trim() || '',
      paymentGatewayChannels,
      // Expedition API
      expeditionApiEnabled: [REDACTED]'setting-expedition-enabled')?.checked || false,
      expeditionApiProvider: [REDACTED]'setting-expedition-provider')?.value || 'rajaongkir',
      expeditionApiKey: [REDACTED]
      expeditionApiOrigin: [REDACTED]'setting-expedition-origin')?.value.trim() || '',
      expeditionApiWebhookUrl: [REDACTED]'setting-expedition-webhook-url')?.value.trim() || '',
      expeditionApiCouriers,
      // Cloudinary Storage
      cloudinaryConfig: {
        enabled: [REDACTED]'setting-cloudinary-enabled')?.checked || false,
        cloudName: [REDACTED]'setting-cloudinary-cloud-name')?.value.trim() || '',
        uploadPreset: [REDACTED]'setting-cloudinary-upload-preset')?.value.trim() || '',
        apiKey: [REDACTED]
        folder: [REDACTED]'setting-cloudinary-folder')?.value.trim() || 'circulink',
        autoOptimize: [REDACTED]'setting-cloudinary-auto-optimize')?.checked !== false
      },
      // Supabase Database
      supabaseConfig: {
        enabled: [REDACTED]'setting-supabase-enabled')?.checked || false,
        url: [REDACTED]'setting-supabase-url')?.value.trim() || '',
        anonKey: [REDACTED]'setting-supabase-anon-key')?.value.trim() || '',
        syncEnabled: [REDACTED]'setting-supabase-auto-sync')?.checked || false
      },
      // Ticker & Terms
      tickerEnabled: [REDACTED]'setting-ticker-enabled')?.checked || false,
      tickerTitle: [REDACTED]'setting-ticker-title')?.value.trim() || 'Harga Pasar Terkini',
      tickerRefreshMinutes: Math.min(120, Math.max(1, Number([REDACTED]'setting-ticker-refresh-minutes')?.value) || 15)),
      termsTitle: [REDACTED]'setting-terms-title')?.value.trim() || 'Syarat dan Ketentuan Penggunaan Bursa Limbah',
      termsVersion: [REDACTED]'setting-terms-version')?.value.trim() || '1.0',
      termsContent: [REDACTED]'setting-terms-content')?.value.trim() || this.store.getSettings().termsContent
    });

    const tickerSettings = this.store.getSettings();
    this.renderPriceTicker();
    if (tickerSettings.tickerEnabled) this.fetchLiveMarketRates();

    this.setupCalculator();
    if (this.currentRole === 'buyer') {
      this.renderBuyerMarketplace();
    } else if (this.currentRole === 'public') {
      this.renderPublicMarketplace();
    }

    this.applyFeatureFlags();
    const statusText = dpEnabled ? `diaktifkan (DP ${dp}%)` : 'dinonaktifkan (SET OFF)';
    this.showToast(`Pengaturan berhasil disimpan! Fitur DP ${statusText}; ticker harga pasar ${tickerSettings.tickerEnabled ? 'aktif' : 'nonaktif'}.`, "success");
  }


  // ================= 7C. PUSAT KONTROL FITUR SISTEM (FEATURE FLAGS) =================
  onFeatureToggleChange(key, checked) {
    if (this.store.setFeature) {
      this.store.setFeature(key, checked);
    }
    if (key === 'escrowDp') {
      const dpChk = [REDACTED]'setting-dp-enabled');
      if (dpChk) dpChk.checked = checked;
    }
    if (key === 'marketTicker') {
      const tickerChk = [REDACTED]'setting-ticker-enabled');
      if (tickerChk) tickerChk.checked = checked;
    }
    if (key === 'cryptoWallet') {
      const cryptoChk = [REDACTED]'setting-crypto-enabled');
      if (cryptoChk) cryptoChk.checked = checked;
    }
    this.applyFeatureFlags();
    this.showToast(`Fitur '${key}' berhasil ${checked ? 'diaktifkan' : 'dinonaktifkan'}.`, 'info');
  }

  setAllFeatures(enableAll) {
    const featureKeys = [
      'marketplace', 'productUpload', 'escrowDp', 'offersNegotiation',
      'chatSystem', 'buyerSubscription', 'eventsModule', 'supportTickets',
      'marketTicker', 'userRegistration', 'logisticsService', 'cryptoWallet'
    ];
    featureKeys.forEach(k => {
      if (this.store.setFeature) this.store.setFeature(k, !!enableAll);
    });
    this.populateAdminSettings();
    this.applyFeatureFlags();
    this.showToast(`Semua master fitur sistem telah ${enableAll ? 'diaktifkan' : 'dinonaktifkan'}.`, enableAll ? 'success' : 'warning');
  }

  applyFeatureFlags() {
    const isCrypto = this.store.isFeatureEnabled ? this.store.isFeatureEnabled('cryptoWallet') : true;
    const isTicker = this.store.isFeatureEnabled ? this.store.isFeatureEnabled('marketTicker') : true;

    // Tombol dompet kripto di header navbar
    const btnCrypto = [REDACTED]'btn-header-crypto-wallet');
    if (btnCrypto) {
      btnCrypto.classList.toggle('hidden', !isCrypto);
    }
    this.updateCryptoNavBadge();

    // Bar ticker harga pasar terkini
    const tickerBar = [REDACTED]'price-ticker-bar');
    if (tickerBar) {
      tickerBar.classList.toggle('hidden', !isTicker);
    }
  }

  // ================= 7D. DOMPET KRIPTO WEB3 & DISTRIBUSI TOKEN =================
  showCryptoWalletModal() {
    const modal = [REDACTED]'modal-crypto-wallet');
    if (!modal) return;
    const user = this.store.getCurrentUser();
    if (!user) {
      this.showLoginModal();
      this.showToast('Silakan masuk akun terlebih dahulu untuk mengakses dompet kripto.', 'warning');
      return;
    }

    const wallet = this.store.getCryptoWallet ? this.store.getCryptoWallet(user.id) : null;
    const config = this.store.getCryptoConfig ? this.store.getCryptoConfig() : {};
    const rate = config.tokenRateIdr || config.exchangeRateIdr || 1500;

    if (wallet) {
      const addrEl = [REDACTED]'crypto-wallet-address');
      const clnkEl = [REDACTED]'crypto-balance-clnk');
      const clnkIdrEl = [REDACTED]'crypto-balance-clnk-idr');
      const usdtEl = [REDACTED]'crypto-balance-usdt');
      const maticEl = [REDACTED]'crypto-balance-matic');
      const pendingEl = [REDACTED]'crypto-reward-pending-clnk');
      const reasonEl = [REDACTED]'crypto-reward-reason');
      const netBadge = [REDACTED]'crypto-network-badge');

      const clnkBal = wallet.balances?.CLNK ?? wallet.balanceClnk ?? 0;
      const usdtBal = wallet.balances?.USDT ?? wallet.balanceUsdt ?? 0;
      const maticBal = wallet.balances?.MATIC ?? wallet.balanceMatic ?? 0.25;
      const unclaimed = wallet.unclaimedRewards?.CLNK ?? wallet.pendingRewards ?? 0;
      const unclaimedReason = wallet.unclaimedRewards?.reason ?? wallet.pendingRewardsReason ?? 'Reward pasokan limbah terverifikasi';

      if (addrEl) addrEl.textContent = wallet.address || '0x...';
      if (clnkEl) clnkEl.textContent = Number(clnkBal).toLocaleString('id-ID');
      if (clnkIdrEl) clnkIdrEl.textContent = `(≈ ${this.formatRupiah(clnkBal * rate)})`;
      if (usdtEl) usdtEl.textContent = `${Number(usdtBal).toFixed(2)} USDT`;
      if (maticEl) maticEl.textContent = `${Number(maticBal).toFixed(2)} MATIC`;
      if (pendingEl) pendingEl.textContent = `+${unclaimed}`;
      if (reasonEl) reasonEl.textContent = unclaimedReason;
      if (netBadge) netBadge.textContent = config.networkName || config.network || 'Polygon PoS';

      this.renderCryptoTxHistory(wallet.txHistory || wallet.history || []);
    }

    this.switchCryptoWalletTab('balance');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeCryptoWalletModal() {
    const modal = [REDACTED]'modal-crypto-wallet');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  switchCryptoWalletTab(tab) {
    const tabs = ['balance', 'send', 'history'];
    tabs.forEach(t => {
      const btn = [REDACTED]`crypto-tab-btn-${t}`);
      const content = [REDACTED]`crypto-tab-content-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'pb-2.5 px-3 text-xs font-bold border-b-2 border-amber-500 text-amber-900 transition flex items-center gap-1.5';
        } else {
          btn.className = 'pb-2.5 px-3 text-xs font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5';
        }
      }
      if (content) {
        content.classList.toggle('hidden', t !== tab);
      }
    });
  }

  copyCryptoAddress() {
    const addr = [REDACTED]'crypto-wallet-address')?.textContent?.trim();
    if (!addr) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(() => {
        this.showToast('Alamat dompet Web3 berhasil disalin ke clipboard!', 'success');
      }).catch(() => {
        this.showToast(`Alamat dompet: ${addr}`, 'info');
      });
    } else {
      this.showToast(`Alamat dompet: ${addr}`, 'info');
    }
  }

  claimCryptoReward() {
    const user = this.store.getCurrentUser();
    if (!user) return;
    const res = this.store.claimRecyclingRewards(user.id);
    if (!res || !res.success) {
      this.showToast(res?.message || 'Tidak ada reward yang dapat diklaim saat ini.', 'warning');
      return;
    }
    this.triggerConfetti();
    this.showToast(`Selamat! Berhasil mengklaim +${res.claimed} CLNK reward daur ulang ke dompet!`, 'success');
    this.showCryptoWalletModal();
    this.updateCryptoNavBadge();
  }

  setMaxSendAmount() {
    const symbol = [REDACTED]'crypto-send-token-symbol')?.value || 'CLNK';
    const user = this.store.getCurrentUser();
    const wallet = user && this.store.getCryptoWallet ? this.store.getCryptoWallet(user.id) : null;
    const amountInput = [REDACTED]'crypto-send-amount');
    if (!wallet || !amountInput) return;
    const bal = wallet.balances ? wallet.balances[symbol] : (symbol === 'CLNK' ? wallet.balanceClnk : wallet.balanceUsdt);
    amountInput.value = bal || 0;
  }

  handleSendCryptoToken(event) {
    event.preventDefault();
    const user = this.store.getCurrentUser();
    if (!user) return;
    const symbol = [REDACTED]'crypto-send-token-symbol')?.value || 'CLNK';
    const toAddress = [REDACTED]'crypto-send-to-address')?.value?.trim();
    const amount = Number([REDACTED]'crypto-send-amount')?.value);

    if (!toAddress || !toAddress.startsWith('0x') || toAddress.length < 10) {
      this.showToast('Format alamat tujuan tidak valid (harus diawali 0x).', 'error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      this.showToast('Jumlah token yang dikirim harus lebih dari 0.', 'error');
      return;
    }

    const res = this.store.transferCrypto(user.id, toAddress, amount, symbol);
    if (!res || !res.success) {
      this.showToast(res?.message || 'Transfer token gagal.', 'error');
      return;
    }

    this.showToast(`Pengiriman ${amount} ${symbol} berhasil! TxHash: ${res.txHash.slice(0, 10)}...`, 'success');
    [REDACTED]'crypto-send-form')?.reset();
    this.showCryptoWalletModal();
    this.switchCryptoWalletTab('history');
    this.updateCryptoNavBadge();
  }

  renderCryptoTxHistory(history) {
    const container = [REDACTED]'crypto-tx-history-list');
    if (!container) return;
    if (!history || history.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-clock-rotate-left text-2xl mb-1 text-slate-300"></i>
          <p>Belum ada riwayat transaksi on-chain tercatat.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = history.slice().reverse().map(tx => {
      const isPositive = ['reward_claim', 'airdrop_welcome', 'airdrop_distribution', 'receive', 'REWARD_CLAIM', 'AIRDROP', 'RECEIVE'].includes(tx.type);
      const title = tx.title || tx.type || 'Transaksi On-Chain';
      return `
        <div class="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-xs space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-800 flex items-center gap-1.5">
              <i class="fa-solid ${isPositive ? 'fa-arrow-down text-emerald-600' : 'fa-arrow-up text-amber-600'}"></i>
              ${esc(title)}
            </span>
            <span class="font-mono font-bold ${isPositive ? 'text-emerald-700' : 'text-slate-900'}">
              ${isPositive ? '+' : '-'}${Number(tx.amount).toLocaleString('id-ID')} ${esc(tx.symbol || 'CLNK')}
            </span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
            <span class="truncate max-w-[200px]" title="${esc(tx.txHash)}">Tx: ${esc(tx.txHash ? tx.txHash.slice(0, 10) + '...' + tx.txHash.slice(-6) : '-')}</span>
            <span>${new Date(tx.timestamp || Date.now()).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  showAdminAirdropModal() {
    const modal = [REDACTED]'modal-admin-airdrop');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeAdminAirdropModal() {
    const modal = [REDACTED]'modal-admin-airdrop');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  onAirdropTargetChange(val) {
    const customGroup = [REDACTED]'airdrop-custom-address-group');
    if (customGroup) {
      customGroup.classList.toggle('hidden', val !== 'custom');
    }
  }

  handleExecuteAdminAirdrop(event) {
    event.preventDefault();
    const target = [REDACTED]'airdrop-target')?.value || 'all_users';
    const customAddr = [REDACTED]'airdrop-custom-address')?.value?.trim();
    const amount = Number([REDACTED]'airdrop-amount')?.value);
    const reason = [REDACTED]'airdrop-reason')?.value?.trim() || 'Distribusi Airdrop Ekosistem';

    const actualTarget = target === 'custom' ? customAddr : target;
    if (target === 'custom' && (!customAddr || !customAddr.startsWith('0x'))) {
      this.showToast('Masukkan alamat dompet kustom yang valid (diawali 0x).', 'error');
      return;
    }

    const res = this.store.adminDistributeAirdrop(actualTarget, amount, reason);
    if (!res || !res.success) {
      this.showToast(res?.message || 'Distribusi airdrop gagal.', 'error');
      return;
    }

    this.closeAdminAirdropModal();
    this.populateAdminSettings();
    this.triggerConfetti();
    this.showToast(`Sukses mendistribusikan airdrop ${amount} CLNK kepada ${res.count || 1} penerima! Sisa pool: ${Number(res.remainingPool || 0).toLocaleString('id-ID')} CLNK.`, 'success');
    this.updateCryptoNavBadge();
  }

  updateCryptoNavBadge() {
    const isCrypto = this.store.isFeatureEnabled ? this.store.isFeatureEnabled('cryptoWallet') : true;
    const btn = [REDACTED]'btn-header-crypto-wallet');
    const badge = [REDACTED]'nav-crypto-balance-badge');
    if (btn) btn.classList.toggle('hidden', !isCrypto);
    if (badge && isCrypto) {
      const user = this.store.getCurrentUser();
      const wallet = user && this.store.getCryptoWallet ? this.store.getCryptoWallet(user.id) : null;
      const bal = wallet ? (wallet.balances?.CLNK ?? wallet.balanceClnk ?? 0) : 0;
      badge.textContent = `${Number(bal).toLocaleString('id-ID')} CLNK`;
    }
  }

  testPaymentGatewayConnection() {
    const provider = [REDACTED]'setting-gateway-provider')?.value || 'midtrans';
    const serverKey = [REDACTED]'setting-gateway-server-key')?.value.trim() || '';
    const merchantId = [REDACTED]'setting-gateway-merchant-id')?.value.trim() || '';
    if (!serverKey && !merchantId) {
      this.showToast('Isi Merchant ID dan Server Key terlebih dahulu sebelum menguji koneksi.', 'error');
      return;
    }
    this.showToast(`Menguji koneksi ke ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`, 'info');
    setTimeout(() => {
      this.showToast(`Koneksi ${provider} berhasil diuji (mode simulasi). Pastikan kunci valid di lingkungan produksi.`, 'success');
    }, 1500);
  }

  testExpeditionConnection() {
    const provider = [REDACTED]'setting-expedition-provider')?.value || 'rajaongkir';
    const apiKey = [REDACTED]'setting-expedition-api-key')?.value.trim() || '';
    if (!apiKey) {
      this.showToast('Masukkan API Key ekspedisi terlebih dahulu.', 'error');
      return;
    }
    this.showToast(`Menguji koneksi ke ${provider}...`, 'info');
    setTimeout(() => {
      this.showToast(`Koneksi API ekspedisi ${provider} berhasil diuji (mode simulasi). Verifikasi di dasbor provider.`, 'success');
    }, 1500);
  }

  async testSupabaseConnection() {
    const url = [REDACTED]'setting-supabase-url')?.value.trim();
    const anonKey = [REDACTED]'setting-supabase-anon-key')?.value.trim();
    if (!url || !anonKey) {
      this.showToast('Masukkan Project URL dan Anon Key Supabase terlebih dahulu.', 'error');
      return;
    }
    this.showToast('Menguji koneksi ke Supabase...', 'info');
    if (window.circulinkSupabase) {
      try {
        const res = await window.circulinkSupabase.testConnection({ url, anonKey });
        if (res && res.ok) {
          this.showToast(`Koneksi ke Supabase berhasil terhubung! (Latensi: ${res.latency}ms)`, 'success');
        } else {
          this.showToast(`Gagal terhubung ke Supabase: ${res?.error || 'Periksa URL dan Anon Key.'}`, 'error');
        }
      } catch (err) {
        this.showToast(`Koneksi gagal: ${err.message}`, 'error');
      }
    } else {
      this.showToast('Klien Supabase belum dimuat di browser.', 'warning');
    }
  }



  // ================= 7B.1 DP SIMULATION & PRESET =================
  setDpPreset(pct) {
    const dpInput = [REDACTED]'setting-dp');
    if (dpInput) { dpInput.value = pct; this.updateDpSimulation(); }
  }

  updateDpSimulation() {
    const sample = 10000000;
    const pct = Number([REDACTED]'setting-dp')?.value) || 30;
    const dp = Math.round(sample * pct / 100);
    const el = (id, val) => { const e = [REDACTED]id); if (e) e.textContent = val; };
    el('dp-sim-pct', pct);
    el('dp-sim-dp', 'Rp ' + dp.toLocaleString('id-ID'));
    el('dp-sim-remaining', 'Rp ' + (sample - dp).toLocaleString('id-ID'));
  }

  // ================= 7B.2 CUSTOM FEES EDITOR =================
  renderAdminFeesList() {
    const container = [REDACTED]'admin-fees-list-container');
    if (!container) return;
    const fees = this.store.getCustomFees();
    if (!fees.length) {
      container.innerHTML = '<div class="text-center py-6 text-xs text-slate-400">Belum ada jenis biaya. Klik "+ Tambah Jenis Biaya" untuk mulai.</div>';
      this._renderFeesSimulation([]);
      return;
    }
    const targetLabel = t => ({ buyer: 'Pembeli', seller: 'Penjual', both: 'Keduanya' }[t] || t);
    container.innerHTML = fees.map(fee => `
      <div class="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs group">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-slate-900">${this._escHtml(fee.name)}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${fee.type === 'percentage' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}">
              ${fee.type === 'percentage' ? fee.value + '%' : 'Rp ' + Number(fee.value).toLocaleString('id-ID')}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">${targetLabel(fee.target)}</span>
            ${fee.enabled
              ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Aktif</span>'
              : '<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">Nonaktif</span>'}
          </div>
          ${fee.description ? `<p class="text-[10px] text-slate-500 mt-0.5 truncate">${this._escHtml(fee.description)}</p>` : ''}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <!-- Toggle aktif -->
          <label class="relative inline-flex items-center cursor-pointer" title="${fee.enabled ? 'Nonaktifkan' : 'Aktifkan'}">
            <input type="checkbox" class="sr-only peer" ${fee.enabled ? 'checked' : ''} onchange="app.toggleCustomFeeStatus('${fee.id}')">
            <div class="w-8 h-4 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
          <button type="button" onclick="app.editCustomFeeItem('${fee.id}')" class="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" title="Edit"><i class="fa-solid fa-pen text-xs"></i></button>
          <button type="button" onclick="app.deleteCustomFeeItem('${fee.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Hapus"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
      </div>
    `).join('');
    this._renderFeesSimulation(fees);
  }

  _renderFeesSimulation(fees) {
    const simEl = [REDACTED]'admin-fees-simulation');
    const totalEl = [REDACTED]'admin-fees-sim-total');
    const sample = 10000000;
    let grandTotal = 0;
    const lines = fees.filter(f => f.enabled).map(fee => {
      const amount = fee.type === 'percentage'
        ? Math.round(sample * fee.value / 100)
        : Number(fee.value);
      grandTotal += amount;
      return `<div class="flex justify-between text-slate-700">
        <span>${this._escHtml(fee.name)} ${fee.type === 'percentage' ? '(' + fee.value + '%)' : ''}</span>
        <span class="font-semibold">Rp ${amount.toLocaleString('id-ID')}</span>
      </div>`;
    });
    if (simEl) simEl.innerHTML = lines.length ? lines.join('') : '<div class="text-slate-400 italic text-[11px]">Tidak ada biaya aktif.</div>';
    if (totalEl) totalEl.textContent = 'Rp ' + grandTotal.toLocaleString('id-ID');
  }

  _escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  showAddFeeModal() {
    [REDACTED]'fee-modal-title').textContent = 'Tambah Jenis Biaya Baru';
    [REDACTED]'fee-modal-edit-id').value = '';
    [REDACTED]'fee-modal-name').value = '';
    [REDACTED]'fee-modal-type').value = 'fixed';
    [REDACTED]'fee-modal-value').value = '';
    [REDACTED]'fee-modal-target').value = 'buyer';
    [REDACTED]'fee-modal-description').value = '';
    [REDACTED]'fee-modal-enabled').checked = true;
    this.onFeeTypeChange();
    [REDACTED]'modal-fee-editor').classList.remove('hidden');
  }

  editCustomFeeItem(id) {
    const fee = this.store.getCustomFees().find(f => f.id === id);
    if (!fee) return;
    [REDACTED]'fee-modal-title').textContent = 'Edit Jenis Biaya';
    [REDACTED]'fee-modal-edit-id').value = fee.id;
    [REDACTED]'fee-modal-name').value = fee.name;
    [REDACTED]'fee-modal-type').value = fee.type;
    [REDACTED]'fee-modal-value').value = fee.value;
    [REDACTED]'fee-modal-target').value = fee.target;
    [REDACTED]'fee-modal-description').value = fee.description || '';
    [REDACTED]'fee-modal-enabled').checked = fee.enabled;
    this.onFeeTypeChange();
    [REDACTED]'modal-fee-editor').classList.remove('hidden');
  }

  closeFeeModal() {
    [REDACTED]'modal-fee-editor').classList.add('hidden');
  }

  onFeeTypeChange() {
    const type = [REDACTED]'fee-modal-type')?.value;
    const label = [REDACTED]'fee-modal-value-label');
    const prefix = [REDACTED]'fee-modal-value-prefix');
    const suffix = [REDACTED]'fee-modal-value-suffix');
    const valueInput = [REDACTED]'fee-modal-value');
    if (type === 'percentage') {
      if (label) label.textContent = 'Nilai (%)';
      if (prefix) prefix.classList.add('hidden');
      if (suffix) suffix.classList.remove('hidden');
      if (valueInput) { valueInput.classList.remove('pl-9'); valueInput.classList.add('pl-4', 'pr-9'); valueInput.placeholder = '0.5'; }
    } else {
      if (label) label.textContent = 'Nilai (Rp)';
      if (prefix) prefix.classList.remove('hidden');
      if (suffix) suffix.classList.add('hidden');
      if (valueInput) { valueInput.classList.add('pl-9'); valueInput.classList.remove('pr-9'); valueInput.placeholder = '10000'; }
    }
  }

  saveCustomFeeItem(event) {
    event.preventDefault();
    const editId = [REDACTED]'fee-modal-edit-id').value;
    const data = {
      name: [REDACTED]'fee-modal-name').value.trim(),
      type: [REDACTED]'fee-modal-type').value,
      value: Number([REDACTED]'fee-modal-value').value) || 0,
      target: [REDACTED]'fee-modal-target').value,
      description: [REDACTED]'fee-modal-description').value.trim(),
      enabled: [REDACTED]'fee-modal-enabled').checked
    };
    if (!data.name) { this.showToast('Nama biaya tidak boleh kosong.', 'error'); return; }
    if (data.value < 0) { this.showToast('Nilai biaya tidak boleh negatif.', 'error'); return; }
    if (editId) {
      this.store.updateCustomFee(editId, data);
      this.showToast(`Jenis biaya "${esc(data.name)}" berhasil diperbarui.`, 'success');
    } else {
      this.store.addCustomFee(data);
      this.showToast(`Jenis biaya "${esc(data.name)}" berhasil ditambahkan.`, 'success');
    }
    this.closeFeeModal();
    this.renderAdminFeesList();
  }

  deleteCustomFeeItem(id) {
    const fee = this.store.getCustomFees().find(f => f.id === id);
    if (!fee) return;
    if (!confirm(`Hapus jenis biaya "${esc(fee.name)}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    this.store.deleteCustomFee(id);
    this.showToast(`Jenis biaya "${esc(fee.name)}" berhasil dihapus.`, 'success');
    this.renderAdminFeesList();
  }

  toggleCustomFeeStatus(id) {
    const fee = this.store.toggleCustomFee(id);
    if (fee) {
      this.showToast(`Biaya "${esc(fee.name)}" ${fee.enabled ? 'diaktifkan' : 'dinonaktifkan'}.`, 'success');
      this.renderAdminFeesList();
    }
  }

  // ================= 7C. EDITOR PUSAT LAYANAN RESMI (FOOTER & KONTAK) =================

  openSupportEditor() {
    if (this.currentRole !== 'admin') {
      this.setRole('admin');
    }
    this.switchAdminTab('support');
    setTimeout(() => {
      const el = [REDACTED]'admin-content-support');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  populateSupportSettings() {
    const s = this.store.getSettings();
    const titleInput = [REDACTED]'support-edit-title');
    const hoursInput = [REDACTED]'support-edit-hours');
    const phoneInput = [REDACTED]'support-edit-phone');
    const waInput = [REDACTED]'support-edit-wa');
    const waMsgInput = [REDACTED]'support-edit-wa-msg');
    const emailInput = [REDACTED]'support-edit-email');
    const addrInput = [REDACTED]'support-edit-address');
    const mapsInput = [REDACTED]'support-edit-maps');
    const btnEnabledInput = [REDACTED]'support-edit-btn-enabled');
    const btnTextInput = [REDACTED]'support-edit-btn-text');
    const btnActionInput = [REDACTED]'support-edit-btn-action');
    const btnUrlInput = [REDACTED]'support-edit-btn-url');

    if (titleInput) titleInput.value = s.supportSectionTitle || 'Pusat Layanan Resmi';
    if (hoursInput) hoursInput.value = s.supportOperationalHours || 'Senin – Jumat: 08.00 – 17.00 WIB';
    if (phoneInput) phoneInput.value = s.contactPhone || '+62 812-3456-7890';
    if (waInput) waInput.value = s.contactWaNumber || '628[REDACTED]7890';
    if (waMsgInput) waMsgInput.value = s.contactWaMessage || 'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi';
    if (emailInput) emailInput.value = s.contactEmail || 'kemitraan@bursalimbah.id';
    if (addrInput) addrInput.value = s.address || 'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur';
    if (mapsInput) mapsInput.value = s.supportMapsUrl || 'https://maps.google.com/?q=Sentra+Inovasi+Hijau';
    if (btnEnabledInput) btnEnabledInput.checked = s.supportGuideBtnEnabled !== false;
    if (btnTextInput) btnTextInput.value = s.supportGuideBtnText || 'Panduan Transaksi Aman';
    if (btnActionInput) btnActionInput.value = s.supportGuideBtnAction || 'modal';
    if (btnUrlInput) btnUrlInput.value = s.supportGuideBtnUrl || '';

    this.handleSupportBtnActionChange();
    this.updateSupportLivePreview();
  }

  handleSupportBtnActionChange() {
    const action = [REDACTED]'support-edit-btn-action')?.value || 'modal';
    const container = [REDACTED]'support-edit-btn-url-container');
    if (container) {
      if (action === 'url') {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    }
    this.updateSupportLivePreview();
  }

  updateSupportLivePreview() {
    const previewBox = [REDACTED]'support-live-preview-box');
    if (!previewBox) return;

    const s = this.store.getSettings();
    const title = [REDACTED]'support-edit-title')?.value.trim() || s.supportSectionTitle || 'Pusat Layanan Resmi';
    const hours = [REDACTED]'support-edit-hours')?.value.trim() || s.supportOperationalHours || '';
    const phone = [REDACTED]'support-edit-phone')?.value.trim() || s.contactPhone || '+62 812-3456-7890';
    const wa = ([REDACTED]'support-edit-wa')?.value.trim() || s.contactWaNumber || '628[REDACTED]7890').replace(/\D/g, '');
    const waMsg = [REDACTED]'support-edit-wa-msg')?.value.trim() || s.contactWaMessage || 'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi';
    const email = [REDACTED]'support-edit-email')?.value.trim() || s.contactEmail || 'kemitraan@bursalimbah.id';
    const address = [REDACTED]'support-edit-address')?.value.trim() || s.address || 'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur';
    const maps = [REDACTED]'support-edit-maps')?.value.trim() || s.supportMapsUrl || '';
    const btnEnabled = [REDACTED]'support-edit-btn-enabled') ? [REDACTED]'support-edit-btn-enabled').checked : (s.supportGuideBtnEnabled !== false);
    const btnText = [REDACTED]'support-edit-btn-text')?.value.trim() || s.supportGuideBtnText || 'Panduan Transaksi Aman';
    const btnAction = [REDACTED]'support-edit-btn-action')?.value || s.supportGuideBtnAction || 'modal';
    const btnUrl = [REDACTED]'support-edit-btn-url')?.value.trim() || s.supportGuideBtnUrl || '';

    const waLink = `https://wa.me/${wa || '628[REDACTED]7890'}?text=${encodeURIComponent(waMsg)}`;

    let btnHtml = '';
    if (btnEnabled) {
      if (btnAction === 'modal') {
        btnHtml = `
          <button type="button" onclick="app.showHelpModal()" class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/20 hover:text-white">
            <i class="fa-solid fa-shield-heart"></i>
            <span>${btnText}</span>
          </button>
        `;
      } else {
        btnHtml = `
          <a href="${btnUrl || '#'}" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/20 hover:text-white">
            <i class="fa-solid fa-shield-heart"></i>
            <span>${btnText}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-75"></i>
          </a>
        `;
      }
    }

    previewBox.innerHTML = `
      <div>
        <h4 class="text-white font-bold mb-3 uppercase tracking-wider text-xs">${title}</h4>
        ${hours ? `
          <div class="mb-2.5 text-[10px] text-emerald-400 flex items-center gap-1.5 font-medium">
            <i class="fa-regular fa-clock"></i>
            <span>${hours}</span>
          </div>
        ` : ''}
        <ul class="space-y-2 text-slate-400 text-xs">
          <li>
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400 transition inline-flex items-center gap-1.5 group">
              <i class="fa-solid fa-phone text-emerald-400"></i>
              <span>${phone}</span>
              <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono group-hover:bg-emerald-500/30">WA Chat</span>
            </a>
          </li>
          <li>
            <a href="mailto:${email}" class="hover:text-emerald-400 transition inline-flex items-center gap-1.5">
              <i class="fa-solid fa-envelope text-emerald-400"></i>
              <span>${email}</span>
            </a>
          </li>
          <li>
            ${maps ? `
              <a href="${maps}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400 transition inline-flex items-start gap-1.5">
                <i class="fa-solid fa-location-dot text-emerald-400 mt-0.5 shrink-0"></i>
                <span class="leading-relaxed">${address}</span>
              </a>
            ` : `
              <div class="inline-flex items-start gap-1.5">
                <i class="fa-solid fa-location-dot text-emerald-400 mt-0.5 shrink-0"></i>
                <span class="leading-relaxed">${address}</span>
              </div>
            `}
          </li>
        </ul>
        ${btnHtml}
      </div>
    `;
  }

  saveSupportSettings(event) {
    if (event) event.preventDefault();
    const title = [REDACTED]'support-edit-title')?.value.trim() || 'Pusat Layanan Resmi';
    const hours = [REDACTED]'support-edit-hours')?.value.trim() || '';
    const phone = [REDACTED]'support-edit-phone')?.value.trim() || '+62 812-3456-7890';
    let wa = [REDACTED]'support-edit-wa')?.value.trim() || '628[REDACTED]7890';
    wa = wa.replace(/\D/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    const waMsg = [REDACTED]'support-edit-wa-msg')?.value.trim() || 'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi';
    const email = [REDACTED]'support-edit-email')?.value.trim() || 'kemitraan@bursalimbah.id';
    const address = [REDACTED]'support-edit-address')?.value.trim() || 'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur';
    const maps = [REDACTED]'support-edit-maps')?.value.trim() || '';
    const btnEnabled = [REDACTED]'support-edit-btn-enabled') ? [REDACTED]'support-edit-btn-enabled').checked : true;
    const btnText = [REDACTED]'support-edit-btn-text')?.value.trim() || 'Panduan Transaksi Aman';
    const btnAction = [REDACTED]'support-edit-btn-action')?.value || 'modal';
    const btnUrl = [REDACTED]'support-edit-btn-url')?.value.trim() || '';

    this.store.updateSettings({
      supportSectionTitle: title,
      supportOperationalHours: hours,
      contactPhone: phone,
      contactWaNumber: wa,
      contactWaMessage: waMsg,
      contactEmail: email,
      address: address,
      supportMapsUrl: maps,
      supportGuideBtnEnabled: btnEnabled,
      supportGuideBtnText: btnText,
      supportGuideBtnAction: btnAction,
      supportGuideBtnUrl: btnUrl
    });

    this.renderFooterSupport();
    this.updateSupportLivePreview();
    this.showToast('Pengaturan Pusat Layanan Resmi berhasil disimpan!', 'success');
  }

  resetSupportSettings() {
    if (!confirm('Pulihkan isian form ke nilai bawaan?')) return;
    const titleInput = [REDACTED]'support-edit-title');
    const hoursInput = [REDACTED]'support-edit-hours');
    const phoneInput = [REDACTED]'support-edit-phone');
    const waInput = [REDACTED]'support-edit-wa');
    const waMsgInput = [REDACTED]'support-edit-wa-msg');
    const emailInput = [REDACTED]'support-edit-email');
    const addrInput = [REDACTED]'support-edit-address');
    const mapsInput = [REDACTED]'support-edit-maps');
    const btnEnabledInput = [REDACTED]'support-edit-btn-enabled');
    const btnTextInput = [REDACTED]'support-edit-btn-text');
    const btnActionInput = [REDACTED]'support-edit-btn-action');
    const btnUrlInput = [REDACTED]'support-edit-btn-url');

    if (titleInput) titleInput.value = 'Pusat Layanan Resmi';
    if (hoursInput) hoursInput.value = 'Senin – Jumat: 08.00 – 17.00 WIB';
    if (phoneInput) phoneInput.value = '+62 812-3456-7890';
    if (waInput) waInput.value = '628[REDACTED]7890';
    if (waMsgInput) waMsgInput.value = 'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi';
    if (emailInput) emailInput.value = 'kemitraan@bursalimbah.id';
    if (addrInput) addrInput.value = 'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur';
    if (mapsInput) mapsInput.value = 'https://maps.google.com/?q=Sentra+Inovasi+Hijau';
    if (btnEnabledInput) btnEnabledInput.checked = true;
    if (btnTextInput) btnTextInput.value = 'Panduan Transaksi Aman';
    if (btnActionInput) btnActionInput.value = 'modal';
    if (btnUrlInput) btnUrlInput.value = '';

    this.handleSupportBtnActionChange();
    this.updateSupportLivePreview();
    this.showToast('Form telah direset ke nilai awal. Klik "Simpan Pengaturan Layanan" untuk menetapkan.', 'info');
  }

  renderFooterSupport() {
    const col = [REDACTED]'footer-support-column');
    if (!col) return;

    const s = this.store.getSettings();
    const title = s.supportSectionTitle || 'Pusat Layanan Resmi';
    const hours = s.supportOperationalHours || '';
    const phone = s.contactPhone || '+62 812-3456-7890';
    const wa = (s.contactWaNumber || '628[REDACTED]7890').replace(/\D/g, '');
    const waMsg = s.contactWaMessage || 'Halo Admin Bursa Limbah, saya ingin konsultasi transaksi';
    const email = s.contactEmail || 'kemitraan@bursalimbah.id';
    const address = s.address || 'Sentra Inovasi Hijau BURSA LIMBAH Lt. 5, Jakarta Timur';
    const maps = s.supportMapsUrl || '';
    const btnEnabled = s.supportGuideBtnEnabled !== false;
    const btnText = s.supportGuideBtnText || 'Panduan Transaksi Aman';
    const btnAction = s.supportGuideBtnAction || 'modal';
    const btnUrl = s.supportGuideBtnUrl || '';

    const isAdmin = this.store.isAdminAuthenticated() || this.currentRole === 'admin';
    const waLink = `https://wa.me/${wa || '628[REDACTED]7890'}?text=${encodeURIComponent(waMsg)}`;

    let btnHtml = '';
    if (btnEnabled) {
      if (btnAction === 'modal') {
        btnHtml = `
          <button type="button" onclick="app.showHelpModal()" class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/20 hover:text-white">
            <i class="fa-solid fa-shield-heart"></i>
            <span>${btnText}</span>
          </button>
        `;
      } else {
        btnHtml = `
          <a href="${btnUrl || '#'}" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-400/20 hover:text-white">
            <i class="fa-solid fa-shield-heart"></i>
            <span>${btnText}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-75"></i>
          </a>
        `;
      }
    }

    col.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-3">
        <h4 class="text-white font-bold uppercase tracking-wider text-xs">${title}</h4>
        ${isAdmin ? `
          <button type="button" onclick="app.openSupportEditor()" title="Edit Pusat Layanan Resmi" class="inline-flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-lg transition font-semibold cursor-pointer">
            <i class="fa-solid fa-pen-to-square text-[9px]"></i>
            <span>Edit</span>
          </button>
        ` : ''}
      </div>
      ${hours ? `
        <div class="mb-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
          <i class="fa-regular fa-clock"></i>
          <span>${hours}</span>
        </div>
      ` : ''}
      <ul class="space-y-2 text-slate-400 text-xs">
        <li>
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400 transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-phone mr-1.5 text-emerald-400"></i>
            <span>${phone}</span>
          </a>
        </li>
        <li>
          <a href="mailto:${email}" class="hover:text-emerald-400 transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-envelope mr-1.5 text-emerald-400"></i>
            <span>${email}</span>
          </a>
        </li>
        <li>
          ${maps ? `
            <a href="${maps}" target="_blank" rel="noopener noreferrer" class="hover:text-emerald-400 transition inline-flex items-start gap-1.5">
              <i class="fa-solid fa-location-dot mr-1.5 text-emerald-400 mt-0.5 shrink-0"></i>
              <span class="leading-relaxed">${address}</span>
            </a>
          ` : `
            <div class="inline-flex items-start gap-1.5">
              <i class="fa-solid fa-location-dot mr-1.5 text-emerald-400 mt-0.5 shrink-0"></i>
              <span class="leading-relaxed">${address}</span>
            </div>
          `}
        </li>
      </ul>
      ${btnHtml}
    `;

    // Sinkronkan juga tautan WhatsApp pada modal-help dan floating action button jika ada
    const helpWaBtn = document.querySelector('#modal-help a[href*="wa.me"]');
    if (helpWaBtn) {
      helpWaBtn.href = `https://wa.me/${wa || '628[REDACTED]7890'}?text=${encodeURIComponent(s.contactWaMessage || 'Halo Admin Bursa Limbah, saya butuh bantuan transaksi')}`;
    }
    const floatWaBtn = document.querySelector('.float-action-btn[href*="wa.me"]');
    if (floatWaBtn) {
      floatWaBtn.href = `https://wa.me/${wa || '628[REDACTED]7890'}?text=${encodeURIComponent(waMsg)}`;
    }
  }

  // ================= 7D. GENERATOR & PENCETAK TIKET EVENT (QR CODE & ABSENSI) =================
  renderAdminTicketsSection() {
    this.populateEventSelectForTickets();
    const codeInput = [REDACTED]'ticket-form-code');
    if (!codeInput || !codeInput.value) {
      this.generateNewTicketCode();
    }
    this.updateAdminTicketStats();
    this.updateLiveTicketPreview();
    this.renderAdminTicketsTable();
    this.updateAdminTicketsBadge();
  }

  updateAdminTicketsBadge() {
    const badge = [REDACTED]'admin-tab-tickets-badge');
    if (!badge) return;
    const tickets = this.store.getEventTickets ? this.store.getEventTickets() : [];
    badge.textContent = tickets.length;
  }

  updateAdminTicketStats() {
    const tickets = this.store.getEventTickets ? this.store.getEventTickets() : [];
    const events = this.store.getEvents ? this.store.getEvents('semua') : [];
    const checkedIn = tickets.filter(t => t.status === 'checked_in').length;
    const pending = tickets.filter(t => t.status !== 'checked_in').length;

    const elTotal = [REDACTED]'stat-tickets-total');
    const elChecked = [REDACTED]'stat-tickets-checkedin');
    const elPending = [REDACTED]'stat-tickets-pending');
    const elEvents = [REDACTED]'stat-tickets-events');

    if (elTotal) elTotal.textContent = tickets.length;
    if (elChecked) elChecked.textContent = checkedIn;
    if (elPending) elPending.textContent = pending;
    if (elEvents) elEvents.textContent = events.length;
  }

  populateEventSelectForTickets(selectedEventId = null) {
    const select = [REDACTED]'ticket-form-event');
    const filterSelect = [REDACTED]'ticket-table-filter-event');
    if (!select) return;

    const events = this.store.getEvents ? this.store.getEvents('semua') : [];
    
    // Form Select Options
    if (events.length === 0) {
      select.innerHTML = '<option value="">Belum ada event tersedia</option>';
    } else {
      select.innerHTML = events.map(e => `
        <option value="${e.id}" ${selectedEventId === e.id ? 'selected' : ''}>
          ${esc(e.title)} (${e.date || e.monthYear || '2026'})
        </option>
      `).join('');
    }

    // Table Filter Options
    if (filterSelect) {
      const curFilter = filterSelect.value || 'all';
      filterSelect.innerHTML = `
        <option value="all">Semua Agenda Event</option>
        ${events.map(e => `<option value="${e.id}" ${curFilter === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
      `;
    }
  }

  handleTicketEventChange() {
    this.updateLiveTicketPreview();
  }

  generateNewTicketCode() {
    const codeInput = [REDACTED]'ticket-form-code');
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newCode = `BL-TKT-${year}-${rand}`;
    if (codeInput) codeInput.value = newCode;
    this.updateLiveTicketPreview();
    return newCode;
  }

  resetTicketGeneratorForm() {
    const form = [REDACTED]'admin-ticket-generator-form');
    if (form) form.reset();
    this.generateNewTicketCode();
    this.updateLiveTicketPreview();
    this.showToast('Form generator tiket dikosongkan.', 'info');
  }

  updateLiveTicketPreview() {
    const eventId = [REDACTED]'ticket-form-event')?.value;
    const type = [REDACTED]'ticket-form-type')?.value || 'entry';
    const name = [REDACTED]'ticket-form-name')?.value.trim() || 'Nama Lengkap Peserta';
    const company = [REDACTED]'ticket-form-company')?.value.trim() || 'Nama Instansi / Perusahaan';
    const gate = [REDACTED]'ticket-form-gate')?.value.trim() || 'Gate A - Meja Presensi';
    const code = [REDACTED]'ticket-form-code')?.value.trim() || 'BL-TKT-2026-0000';
    const notes = [REDACTED]'ticket-form-notes')?.value.trim() || 'Tunjukkan QR Code ini kepada panitia registrasi di pintu masuk acara.';

    const event = (this.store.getEventById && eventId) ? this.store.getEventById(eventId) : null;
    const eventTitle = event ? event.title : 'Workshop Pengelolaan & Monetisasi Minyak Jelantah (UCO)';
    const eventDate = event ? (event.date || `${event.day} ${event.monthYear}`) : '22 September 2026';
    const eventTime = event ? (event.time || '09.00 – 15.00 WIB') : '09.00 – 15.00 WIB';
    const eventLocation = event ? (event.location || 'Balai Kartini, Jakarta') : 'Balai Kartini, Jakarta Selatan';

    // Type labels & badges
    const typeLabels = {
      entry: { label: 'TIKET MASUK RESMI', class: 'bg-violet-100 text-violet-900 border-violet-300' },
      attendance: { label: 'ABSENSI KEDATANGAN', class: 'bg-blue-100 text-blue-900 border-blue-300' },
      vip: { label: 'VIP GUEST PASS', class: 'bg-amber-100 text-amber-900 border-amber-300' },
      committee: { label: 'STAFF & PANITIA', class: 'bg-purple-100 text-purple-900 border-purple-300' }
    };
    const tConfig = typeLabels[type] || typeLabels.entry;

    // Update Preview Elements
    const elBadge = [REDACTED]'ticket-preview-badge');
    const elTitle = [REDACTED]'ticket-preview-title');
    const elDate = [REDACTED]'ticket-preview-date');
    const elTime = [REDACTED]'ticket-preview-time');
    const elLoc = [REDACTED]'ticket-preview-location');
    const elName = [REDACTED]'ticket-preview-name');
    const elComp = [REDACTED]'ticket-preview-company');
    const elGate = [REDACTED]'ticket-preview-gate');
    const elNotes = [REDACTED]'ticket-preview-notes');
    const elCode = [REDACTED]'ticket-preview-code');

    if (elBadge) {
      elBadge.textContent = tConfig.label;
      elBadge.className = `px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${tConfig.class}`;
    }
    if (elTitle) elTitle.textContent = eventTitle;
    if (elDate) elDate.textContent = eventDate;
    if (elTime) elTime.textContent = eventTime;
    if (elLoc) elLoc.textContent = eventLocation;
    if (elName) elName.textContent = name;
    if (elComp) elComp.textContent = company;
    if (elGate) elGate.textContent = gate;
    if (elNotes) elNotes.textContent = notes;
    if (elCode) elCode.textContent = code;

    // QR Payload: encoded JSON verification
    const qrPayload = JSON.stringify({
      code: code,
      evt: eventId || 'evt',
      title: eventTitle,
      name: name,
      type: type,
      check: 'BURSA-LIMBAH-VALID'
    });

    this.renderQrCodeInto('ticket-qr-container', qrPayload);
  }

  renderQrCodeInto(containerId, textPayload) {
    const container = [REDACTED]containerId);
    if (!container) return;
    container.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(container, {
          text: textPayload,
          width: 128,
          height: 128,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: (typeof QRCode.CorrectLevel !== 'undefined' ? QRCode.CorrectLevel.M : 0)
        });
        return;
      } catch (e) {
        console.warn('QRCode JS error, using SVG fallback', e);
      }
    }

    container.innerHTML = this.generateFallbackSvgQr(textPayload, 128);
  }

  generateFallbackSvgQr(text, size = 128) {
    const n = 25;
    const grid = Array.from({ length: n }, () => Array(n).fill(false));

    const setFinder = (r0, c0) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            grid[r0 + r][c0 + c] = true;
          }
        }
      }
    };
    setFinder(0, 0);
    setFinder(0, n - 7);
    setFinder(n - 7, 0);

    for (let i = 8; i < n - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    let bitIdx = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= n - 8;
        const inBL = r >= n - 8 && c < 8;
        const inCenter = r >= 10 && r <= 14 && c >= 10 && c <= 14;
        if (inTL || inTR || inBL || inCenter || r === 6 || c === 6) continue;

        const pseudo = Math.sin(seed + bitIdx * 97) * 10000;
        grid[r][c] = (pseudo - Math.floor(pseudo)) > 0.45;
        bitIdx++;
      }
    }

    const cellSize = (size / n).toFixed(2);
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c]) {
          rects += `<rect x="${(c * (size / n)).toFixed(2)}" y="${(r * (size / n)).toFixed(2)}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
        }
      }
    }

    const badgeX = (size / 2 - 12).toFixed(1);
    const badgeY = (size / 2 - 12).toFixed(1);
    const badge = `
      <rect x="${badgeX}" y="${badgeY}" width="24" height="24" rx="6" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
      <text x="${(size / 2).toFixed(1)}" y="${(size / 2 + 4).toFixed(1)}" font-family="monospace" font-size="10" font-weight="900" fill="#7c3aed" text-anchor="middle">BL</text>
    `;

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" class="rounded-lg">${rects}${badge}</svg>`;
  }

  handleIssueTicketSubmit(event) {
    if (event) event.preventDefault();
    const eventId = [REDACTED]'ticket-form-event')?.value;
    const type = [REDACTED]'ticket-form-type')?.value || 'entry';
    const name = [REDACTED]'ticket-form-name')?.value.trim();
    const company = [REDACTED]'ticket-form-company')?.value.trim() || '-';
    const phone = [REDACTED]'ticket-form-phone')?.value.trim() || '';
    const email = [REDACTED]'ticket-form-email')?.value.trim() || '';
    const gate = [REDACTED]'ticket-form-gate')?.value.trim() || 'Gate A';
    const code = [REDACTED]'ticket-form-code')?.value.trim();
    const notes = [REDACTED]'ticket-form-notes')?.value.trim() || 'Tunjukkan QR Code ini di meja registrasi.';

    if (!name) {
      this.showToast('Nama peserta wajib diisi.', 'error');
      return;
    }

    const ev = (this.store.getEventById && eventId) ? this.store.getEventById(eventId) : null;
    const typeLabels = {
      entry: 'Tiket Masuk Resmi (Entrance Pass)',
      attendance: 'Tiket Absen Kedatangan (Attendance Check-In)',
      vip: 'VIP Guest & Buyer Pass',
      committee: 'Staff & Panitia Pelaksana'
    };

    const newTicket = this.store.addEventTicket({
      ticketCode: code,
      eventId: eventId,
      eventTitle: ev ? ev.title : 'Agenda Event Bursa Limbah',
      eventDate: ev ? (ev.date || `${ev.day} ${ev.monthYear}`) : '2026',
      eventTime: ev ? ev.time : '09.00 – 17.00 WIB',
      eventLocation: ev ? ev.location : 'Lokasi Acara',
      ticketType: type,
      ticketTypeLabel: typeLabels[type] || 'Tiket Resmi',
      holderName: name,
      companyName: company,
      phone: phone,
      email: email,
      gateOrSeat: gate,
      notes: notes,
      status: 'issued'
    });

    this.triggerConfetti();
    this.showToast(`Tiket ${newTicket.ticketCode} berhasil diterbitkan untuk ${name}!`, 'success');

    this.updateAdminTicketStats();
    this.renderAdminTicketsTable();
    this.updateAdminTicketsBadge();

    // Prepare next code
    this.generateNewTicketCode();
  }

  printCurrentTicket() {
    this.updateLiveTicketPreview();
    this.showToast('Menyiapkan dokumen cetak tiket & QR Code...', 'info');
    setTimeout(() => {
      window.print();
    }, 250);
  }

  shareTicketWhatsApp() {
    const name = [REDACTED]'ticket-preview-name')?.textContent || 'Peserta';
    const code = [REDACTED]'ticket-preview-code')?.textContent || '';
    const title = [REDACTED]'ticket-preview-title')?.textContent || '';
    const date = [REDACTED]'ticket-preview-date')?.textContent || '';
    const time = [REDACTED]'ticket-preview-time')?.textContent || '';
    const loc = [REDACTED]'ticket-preview-location')?.textContent || '';
    const gate = [REDACTED]'ticket-preview-gate')?.textContent || '';
    let phone = [REDACTED]'ticket-form-phone')?.value.trim() || '';

    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const message = `Halo ${name},\n\nBerikut adalah konfirmasi e-Tiket Resmi Bursa Limbah Anda:\n\n🎫 *${title}*\n• No. Tiket: *${code}*\n• Waktu: ${date} (${time})\n• Lokasi: ${loc}\n• Akses / Meja: ${gate}\n\nSilakan simpan tiket ini dan tunjukkan QR Code tiket saat tiba di lokasi untuk validasi masuk dan presensi kehadiran. Terima kasih!`;

    const waUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }

  checkInCurrentTicket() {
    const code = [REDACTED]'ticket-preview-code')?.textContent.trim();
    if (!code) return;
    this.quickCheckInTicket(code);
  }

  quickCheckInTicket(code) {
    const res = this.store.checkInEventTicket(code);
    if (res.success) {
      this.showToast(res.message, 'success');
      this.triggerConfetti();
      const elStatus = [REDACTED]'ticket-preview-status');
      if (elStatus) {
        elStatus.textContent = 'SUDAH CHECK-IN / HADIR';
        elStatus.className = 'inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow';
      }
    } else if (res.alreadyCheckedIn) {
      this.showToast(res.message, 'warning');
    } else {
      this.showToast(res.message, 'error');
    }

    this.updateAdminTicketStats();
    this.renderAdminTicketsTable();
  }

  handleQuickScannerSubmit(event) {
    if (event) event.preventDefault();
    const input = [REDACTED]'ticket-scanner-input');
    const resultBox = [REDACTED]'ticket-scanner-result');
    if (!input || !resultBox) return;

    let code = input.value.trim();
    // Support parsing if scanned string is JSON from our QR generator
    if (code.startsWith('{')) {
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) code = parsed.code;
      } catch (_) {}
    }

    if (!code) {
      this.showToast('Masukkan atau scan nomor tiket terlebih dahulu.', 'warning');
      return;
    }

    const res = this.store.checkInEventTicket(code);
    resultBox.classList.remove('hidden');

    if (res.success) {
      const t = res.ticket;
      resultBox.className = 'p-4 rounded-xl bg-emerald-500/20 border border-emerald-400 text-xs text-white backdrop-blur-sm flex items-start gap-3';
      resultBox.innerHTML = `
        <i class="fa-solid fa-circle-check text-2xl text-emerald-400 mt-0.5"></i>
        <div>
          <div class="font-extrabold text-sm text-emerald-200">VALIDASI BERHASIL — PRESENSI DICATAT</div>
          <div class="mt-1 text-slate-100 font-semibold">${t.holderName} (${t.companyName || '-'})</div>
          <div class="text-[11px] text-slate-300 font-mono mt-0.5">Tiket: ${t.ticketCode} • ${t.eventTitle} • Hadir: ${t.checkedInAt}</div>
        </div>
      `;
      this.triggerConfetti();
      this.showToast(res.message, 'success');
      input.value = '';
    } else if (res.alreadyCheckedIn) {
      const t = res.ticket;
      resultBox.className = 'p-4 rounded-xl bg-amber-500/20 border border-amber-400 text-xs text-white backdrop-blur-sm flex items-start gap-3';
      resultBox.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation text-2xl text-amber-400 mt-0.5"></i>
        <div>
          <div class="font-extrabold text-sm text-amber-200">TIKET SUDAH DIGUNAKAN SEBELUMNYA</div>
          <div class="mt-1 text-slate-100">${t.holderName} telah tercatat check-in pada: <strong>${t.checkedInAt}</strong>.</div>
        </div>
      `;
      this.showToast(res.message, 'warning');
    } else {
      resultBox.className = 'p-4 rounded-xl bg-rose-500/20 border border-rose-400 text-xs text-white backdrop-blur-sm flex items-start gap-3';
      resultBox.innerHTML = `
        <i class="fa-solid fa-circle-xmark text-2xl text-rose-400 mt-0.5"></i>
        <div>
          <div class="font-extrabold text-sm text-rose-200">TIKET TIDAK DITEMUKAN</div>
          <div class="mt-1 text-slate-100">Kode tiket <code>${code}</code> tidak terdaftar di sistem. Periksa kembali nomor tiket.</div>
        </div>
      `;
      this.showToast(res.message, 'error');
    }

    this.updateAdminTicketStats();
    this.renderAdminTicketsTable();
  }

  previewSpecificTicket(ticketId) {
    const t = this.store.getEventTicketById(ticketId);
    if (!t) return;

    // Populate form fields
    const selectEvent = [REDACTED]'ticket-form-event');
    const selectType = [REDACTED]'ticket-form-type');
    const inputName = [REDACTED]'ticket-form-name');
    const inputComp = [REDACTED]'ticket-form-company');
    const inputPhone = [REDACTED]'ticket-form-phone');
    const inputEmail = [REDACTED]'ticket-form-email');
    const inputGate = [REDACTED]'ticket-form-gate');
    const inputCode = [REDACTED]'ticket-form-code');
    const inputNotes = [REDACTED]'ticket-form-notes');

    if (selectEvent && t.eventId) selectEvent.value = t.eventId;
    if (selectType) selectType.value = t.ticketType || 'entry';
    if (inputName) inputName.value = t.holderName;
    if (inputComp) inputComp.value = t.companyName || '';
    if (inputPhone) inputPhone.value = t.phone || '';
    if (inputEmail) inputEmail.value = t.email || '';
    if (inputGate) inputGate.value = t.gateOrSeat || '';
    if (inputCode) inputCode.value = t.ticketCode;
    if (inputNotes) inputNotes.value = t.notes || '';

    this.updateLiveTicketPreview();

    const elStatus = [REDACTED]'ticket-preview-status');
    if (elStatus) {
      if (t.status === 'checked_in') {
        elStatus.textContent = `SUDAH CHECK-IN (${t.checkedInAt || 'HADIR'})`;
        elStatus.className = 'inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow';
      } else {
        elStatus.textContent = 'VALID / SIAP PAKAI';
        elStatus.className = 'inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      }
    }

    // Scroll to printable ticket preview
    [REDACTED]'printable-ticket-wrapper')?.scrollIntoView({ behavior: 'smooth' });
    this.showToast(`Tiket ${t.ticketCode} dimuat ke pratinjau siap cetak.`, 'info');
  }

  deleteTicket(ticketId) {
    if (!confirm('Apakah Anda yakin ingin menghapus tiket ini?')) return;
    this.store.deleteEventTicket(ticketId);
    this.showToast('Tiket berhasil dihapus.', 'success');
    this.updateAdminTicketStats();
    this.renderAdminTicketsTable();
    this.updateAdminTicketsBadge();
  }

  openTicketGeneratorForEvent(eventId) {
    this.switchAdminTab('tickets');
    this.populateEventSelectForTickets(eventId);
    const select = [REDACTED]'ticket-form-event');
    if (select) select.value = eventId;
    this.generateNewTicketCode();
    this.updateLiveTicketPreview();

    setTimeout(() => {
      [REDACTED]'admin-ticket-generator-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }

  renderAdminTicketsTable() {
    const container = [REDACTED]'admin-tickets-table-container');
    if (!container) return;

    const eventFilter = [REDACTED]'ticket-table-filter-event')?.value || 'all';
    const statusFilter = [REDACTED]'ticket-table-filter-status')?.value || 'all';

    let tickets = this.store.getEventTickets ? this.store.getEventTickets(eventFilter) : [];
    if (statusFilter !== 'all') {
      tickets = tickets.filter(t => t.status === statusFilter);
    }

    if (tickets.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-ticket text-3xl mb-2"></i>
          <p>Belum ada tiket diterbitkan yang sesuai dengan filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode Tiket</th>
            <th class="p-3">Nama &amp; Perusahaan</th>
            <th class="p-3">Agenda Event</th>
            <th class="p-3">Kontak</th>
            <th class="p-3">Akses / Kursi</th>
            <th class="p-3">Status Presensi</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${tickets.map(t => {
            const isCheckedIn = t.status === 'checked_in';
            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-violet-700">
                  <div>${t.ticketCode}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(t.createdAt || '').substring(0, 16)}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${this._escHtml ? this._escHtml(t.holderName) : t.holderName}</div>
                  <div class="text-[11px] text-slate-500">${this._escHtml ? this._escHtml(t.companyName || '-') : (t.companyName || '-')}</div>
                </td>
                <td class="p-3">
                  <div class="font-semibold text-slate-800">${this._escHtml ? this._escHtml(t.eventTitle) : t.eventTitle}</div>
                  <div class="text-[10px] text-slate-400">${t.eventDate || ''} ${t.eventTime ? '(' + t.eventTime + ')' : ''}</div>
                </td>
                <td class="p-3 text-slate-600">
                  <div>${esc(t.phone || '-')}</div>
                  <div class="text-[10px] text-slate-400">${esc(t.email || '-')}</div>
                </td>
                <td class="p-3 font-medium text-slate-700">
                  <span class="px-2 py-0.5 rounded bg-slate-100 text-[11px]">${t.gateOrSeat || 'Gate Utama'}</span>
                </td>
                <td class="p-3">
                  ${isCheckedIn ? `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <i class="fa-solid fa-circle-check"></i> Hadir
                    </span>
                    <div class="text-[9px] text-slate-400 mt-0.5">${t.checkedInAt || ''}</div>
                  ` : `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <i class="fa-solid fa-clock"></i> Belum Hadir
                    </span>
                  `}
                </td>
                <td class="p-3 text-right space-x-1">
                  ${!isCheckedIn ? `
                    <button onclick="app.quickCheckInTicket('${t.ticketCode}')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition" title="Check-in Sekarang">
                      <i class="fa-solid fa-check"></i> Hadir
                    </button>
                  ` : ''}
                  <button onclick="app.previewSpecificTicket('${t.id}')" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] transition" title="Muat & Cetak Tiket">
                    <i class="fa-solid fa-print"></i> Cetak
                  </button>
                  <button onclick="app.deleteTicket('${t.id}')" class="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold text-[10px] transition" title="Hapus Tiket">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  showOfferModal(productId) {
    const product = this.store.getProductById(productId);
    const buyer = this.store.getCurrentUser();
    if (!buyer || buyer.role !== 'buyer') {
      this.showLoginPage('buyer');
      this.showToast('Masuk sebagai pembeli untuk mengirim penawaran.', 'warning');
      return;
    }
    if (!product) return;
    const modal = [REDACTED]'modal-checkout');
    const container = [REDACTED]'modal-checkout-content');
    container.innerHTML = `<div class="p-6 border-b border-slate-100 flex items-center justify-between"><div><h3 class="text-lg font-bold text-slate-900">Tawar Harga ke Penjual</h3><p class="text-xs text-slate-500">Penjual akan menerima notifikasi dan dapat menerima atau menolak tawaran Anda.</p></div><button onclick="app.closeModals()" class="text-slate-400 p-2"><i class="fa-solid fa-xmark text-lg"></i></button></div><form onsubmit="app.submitOffer(event, '${product.id}')" class="p-6 space-y-4"><div class="bg-slate-50 rounded-xl border border-slate-200 p-4"><div class="font-bold text-slate-900">${esc(product.title)}</div><div class="mt-1 text-xs text-slate-500">Harga penjual: <strong class="font-mono text-emerald-700">${this.formatRupiah(product.offerPrice)} / ${product.unit}</strong></div></div><label class="block text-xs font-bold text-slate-700">Harga penawaran per ${product.unit}<input id="offer-price" type="number" min="1" required value="${product.offerPrice}" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"></label><label class="block text-xs font-bold text-slate-700">Kuantitas (${product.unit})<input id="offer-quantity" type="number" min="${product.minimumOrder || 1}" required value="${product.minimumOrder || 1}" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"></label><label class="block text-xs font-bold text-slate-700">Catatan untuk penjual (opsional)<textarea id="offer-note" rows="3" class="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="Contoh: Armada kami siap mengambil pada minggu depan."></textarea></label><div class="flex justify-end gap-2 pt-2"><button type="button" onclick="app.closeModals()" class="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold">Batal</button><button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"><i class="fa-solid fa-paper-plane mr-1"></i>Kirim Penawaran</button></div></form>`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  submitOffer(event, productId) {
    event.preventDefault();
    const buyer = this.store.getCurrentUser();
    try {
      this.store.createOffer({ productId, buyerId: buyer.id, offerPrice: [REDACTED]'offer-price').value, quantity: [REDACTED]'offer-quantity').value, note: [REDACTED]'offer-note').value });
      this.closeModals();
      this.showToast('Penawaran dikirim ke penjual. Anda akan diberi notifikasi setelah diputuskan.', 'success');
    } catch (error) { this.showToast(error.message, 'error'); }
  }

  // ================= 9. TRANSAKSI CHECKOUT DP / REKENING BERSAMA =================
  initiateCheckout(productId) {
    const p = this.store.getProductById(productId);
    if (!p) return;

    const buyer = this.store.getCurrentUser();
    if (!buyer || !buyer.subscriptionActive) {
      this.showBuyerRegisterModal();
      this.showToast("Daftar dan aktifkan paket langganan terlebih dahulu untuk memesan limbah.", "warning");
      return;
    }

    const isDp = this.store.isDpEnabled();
    const settings = this.store.getSettings();
    const totalPrice = p.totalPrice;
    const dpPercent = settings.downPaymentPercent || 30;
    const dpAmount = isDp ? Math.round(totalPrice * (dpPercent / 100)) : totalPrice;
    const handlingFee = this.store.getHandlingFeeForUser(buyer);
    const totalPaidNow = dpAmount + handlingFee;
    const remaining = isDp ? totalPrice - dpAmount : 0;

    const modal = [REDACTED]'modal-checkout');
    const container = [REDACTED]'modal-checkout-content');
    const defaultPickup = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    container.innerHTML = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">${isDp ? `Pemesanan Pasokan Limbah (DP ${dpPercent}%)` : 'Pemesanan Pasokan Limbah'}</h3>
          <p class="text-xs text-slate-500">Rekening bersama BURSA LIMBAH mengunci pasokan hingga armada Anda tiba.</p>
        </div>
        <button onclick="app.closeModals()" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-brand-700 uppercase font-mono">${esc(p.code)}</span>
            <h4 class="font-bold text-slate-900 text-sm">${esc(p.title)}</h4>
            <p class="text-xs text-slate-500">${esc(p.sellerName)} • ${esc(p.containerType)}</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-500">Total Nilai Limbah:</div>
            <div class="font-mono font-bold text-slate-900">${this.formatRupiah(totalPrice)}</div>
          </div>
        </div>

        <div class="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 text-xs font-mono">
          ${isDp ? `
          <div class="flex justify-between items-center text-slate-600">
            <span>Uang Muka (DP ${dpPercent}%):</span>
            <span class="font-bold text-slate-900">${this.formatRupiah(dpAmount)}</span>
          </div>
          ` : `
          <div class="flex justify-between items-center text-slate-600">
            <span>Nilai Pasokan Limbah:</span>
            <span class="font-bold text-slate-900">${this.formatRupiah(totalPrice)}</span>
          </div>
          `}
          <div class="flex justify-between items-center text-slate-600">
            <span>Biaya Penanganan Sistem (Flat):</span>
            <span class="font-bold text-slate-900">${this.formatRupiah(handlingFee)}</span>
          </div>
          <div class="flex justify-between items-center text-emerald-700 pt-2 border-t border-slate-100 text-sm">
            <span class="font-sans font-bold">Total Pembayaran Sekarang:</span>
            <span class="font-extrabold text-base">${this.formatRupiah(totalPaidNow)}</span>
          </div>
          ${isDp ? `
          <div class="flex justify-between items-center text-slate-500 text-[11px] pt-1">
            <span>Sisa Pelunasan di Gudang (${100 - dpPercent}%):</span>
            <span>${this.formatRupiah(remaining)}</span>
          </div>
          ` : `
          <div class="flex justify-between items-center text-emerald-600 text-[11px] pt-1">
            <span>Status Transaksi:</span>
            <span class="font-bold">Pelunasan Penuh (Tanpa Sisa Tagihan)</span>
          </div>
          `}
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Rencana Tanggal Penjemputan Armada *</label>
          <input type="date" id="checkout-pickup-date" value="${defaultPickup}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-start space-x-2">
          <i class="fa-solid fa-shield-halved text-emerald-600 mt-0.5"></i>
          <span>Dana tersimpan di Rekening Bersama Escrow BURSA LIMBAH. Tiket timbang digital diterbitkan otomatis.${settings.paymentGatewayEnabled ? ` Pembayaran DP diproses melalui ${String(settings.paymentGatewayProvider || 'gateway').toUpperCase()} (${settings.paymentGatewayEnvironment || 'sandbox'}).` : ''}</span>
        </div>

        <div class="flex justify-end space-x-3 pt-2">
          <button type="button" onclick="app.closeModals()" class="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition">
            Batal
          </button>
          <button onclick="app.confirmBooking('${p.id}')" class="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5">
            <i class="fa-solid fa-lock"></i>
            <span>${isDp ? 'Bayar DP & Kunci Pasokan' : 'Bayar & Kunci Pasokan'}</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  confirmBooking(productId) {
    const pickupDate = [REDACTED]'checkout-pickup-date').value;
    const buyer = this.store.getCurrentUser();

    try {
      const order = this.store.createBooking({
        productId,
        buyerId: buyer.id,
        pickupDate,
        notes: "Pemesanan berhasil via Rekening Bersama Escrow."
      });

      this.closeModals();
      this.triggerConfetti();
      this.showToast(`Booking ${esc(order.bookingCode)} berhasil! Pasokan terkunci.`, 'success');
      this.renderBuyerMarketplace();
      this.renderBuyerOrders();
      this.updateOrderCountBadge();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  renderBuyerOrders() {
    const user = this.store.getCurrentUser();
    const orders = (user && user.role === 'buyer') ? this.store.getOrdersForBuyer(user.id) : this.store.getOrders();
    const container = [REDACTED]'buyer-orders-table-container');
    if (!container) return;

    this.updateOrderCountBadge();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-receipt text-3xl mb-2"></i>
          <p>Belum ada transaksi pemesanan limbah aktif.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode Booking</th>
            <th class="p-3">Komoditas &amp; Produk</th>
            <th class="p-3">Volume</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">DP Escrow</th>
            <th class="p-3">Status Pengiriman</th>
            <th class="p-3 text-right">Aksi &amp; Validasi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${orders.map(o => {
            const isCompleted = o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
            const isDispatched = o.shippingStatus === 'shipped_third_party' || o.shippingStatus === 'handed_over';
            
            let statusBadge = '';
            if (isCompleted) {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <i class="fa-solid fa-circle-check"></i> Selesai &amp; Diterima
                </span>
                <div class="text-[10px] text-slate-500 mt-0.5">${o.completedAt ? 'Diterima: ' + o.completedAt : 'Lunas 100%'}</div>
              `;
            } else if (o.shippingStatus === 'shipped_third_party') {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <i class="fa-solid fa-truck-fast"></i> Dikirim Pihak ke-3
                </span>
                <div class="text-[10px] text-blue-700 font-semibold mt-0.5">${o.deliveryDetails?.courierName || 'Ekspedisi'}</div>
                <div class="text-[9px] font-mono text-slate-500">Resi: ${o.deliveryDetails?.trackingNumber || '-'}</div>
              `;
            } else if (o.shippingStatus === 'handed_over') {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <i class="fa-solid fa-handshake"></i> Diserahkan di Depo
                </span>
                <div class="text-[10px] text-amber-800 font-medium mt-0.5">Menunggu konfirmasi penerimaan</div>
              `;
            } else {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <i class="fa-solid fa-clock"></i> Menunggu Pengiriman
                </span>
                <div class="text-[10px] text-slate-500 mt-0.5">Jadwal: ${o.pickupDate}</div>
              `;
            }

            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-brand-700">
                  <div>${esc(o.bookingCode)}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0, 10)}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${esc(o.productTitle)}</div>
                  <div class="text-[11px] text-slate-500">Penjual: <strong>${esc(o.sellerName)}</strong></div>
                </td>
                <td class="p-3 font-semibold text-slate-800">
                  <div>${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</div>
                  ${o.actualReceivedWeight ? `<div class="text-[10px] text-emerald-700 font-bold">Tera: ${Number(o.actualReceivedWeight).toLocaleString('id-ID')} ${o.unit}</div>` : ''}
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
                <td class="p-3 font-mono">
                  <div class="font-bold text-emerald-600">${this.formatRupiah(o.totalPaidNow)}</div>
                  ${o.remainingPayment > 0 ? `<div class="text-[10px] text-slate-400">Sisa: ${this.formatRupiah(o.remainingPayment)}</div>` : ''}
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right space-y-1">
                  ${!isCompleted ? `
                    <div class="flex items-center justify-end gap-1 flex-wrap">
                      <button onclick="app.openBuyerReceiveModal('${o.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition" title="Konfirmasi barang telah diterima dengan input berat aktual">
                        <i class="fa-solid fa-clipboard-check"></i>
                        <span>Validasi Diterima</span>
                      </button>
                      <button onclick="app.openBuyerQrScannerModal('${o.id}')" class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition" title="Scan QR Code penyerahan langsung dari penjual">
                        <i class="fa-solid fa-qrcode text-emerald-400"></i>
                        <span>Scan QR</span>
                      </button>
                      ${(o.remainingPayment > 0 && !['paid', 'completed', 'verified_by_admin'].includes(o.remainingPaymentStatus)) ? `
                        ${['submitted', 'proof_submitted'].includes(o.remainingPaymentStatus) ? `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
                            <i class="fa-solid fa-clock-rotate-left"></i> Bukti Dikirim
                          </span>
                        ` : `
                          <button onclick="app.openRemainingPaymentProofModal('${o.id}')" class="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition" title="Upload bukti pelunasan sisa pembayaran">
                            <i class="fa-solid fa-file-invoice-dollar"></i>
                            <span>Lunasi Sisa</span>
                          </button>
                        `}
                      ` : ''}
                    </div>
                  ` : ''}
                  <div class="flex items-center justify-end gap-1">
                    ${o.deliveryDetails ? `
                      <button onclick="app.showDeliveryDetailsModal('${o.id}')" class="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[10px] transition">
                        <i class="fa-solid fa-route mr-0.5"></i>Lacak Resi
                      </button>
                    ` : ''}
                    <button onclick="app.showBookingReceipt('${o.id}')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] transition">
                      <i class="fa-solid fa-file-invoice mr-0.5"></i>Surat Jalan
                    </button>
                  </div>
                </td>
              </tr>
            `;

          }).join('')}
        </tbody>
      </table>
    `;
  }

  showBookingReceipt(orderId) {
    const o = this.store.getOrderById(orderId);
    if (!o) return;

    const modal = [REDACTED]'modal-receipt');
    const container = [REDACTED]'receipt-modal-content');

    container.innerHTML = `
      <div class="text-center pb-4 border-b border-slate-200">
        <span class="text-2xl font-extrabold text-slate-900 font-mono tracking-wider">BURSA LIMBAH</span>
        <div class="text-xs text-slate-500">SURAT JALAN & RESI REKENING BERSAMA DIGITAL</div>
        <div class="text-xs font-mono font-bold text-brand-700 mt-1">${esc(o.bookingCode)}</div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span class="text-slate-400">Pembeli:</span>
          <div class="font-bold text-slate-900">${esc(o.buyerName)}</div>
        </div>
        <div>
          <span class="text-slate-400">Penjual:</span>
          <div class="font-bold text-slate-900">${esc(o.sellerName)}</div>
        </div>
        <div>
          <span class="text-slate-400">Komoditas:</span>
          <div class="font-bold text-slate-900">${esc(o.productTitle)}</div>
        </div>
        <div>
          <span class="text-slate-400">Tonase / Volume:</span>
          <div class="font-mono font-bold text-slate-900">${o.quantity} ${o.unit}</div>
        </div>
      </div>

      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs space-y-1.5">
        <div class="flex justify-between">
          <span>Nilai Total:</span>
          <span class="font-bold">${this.formatRupiah(o.totalPrice)}</span>
        </div>
        <div class="flex justify-between text-emerald-700">
          <span>DP 30% Masuk Rekening Bersama:</span>
          <span class="font-bold">${this.formatRupiah(o.downPaymentAmount)}</span>
        </div>
        <div class="flex justify-between">
          <span>Sisa 70% Pelunasan di Lokasi:</span>
          <span>${this.formatRupiah(o.remainingPayment)}</span>
        </div>
      </div>

      <div class="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-mono font-bold text-emerald-900">
        ${o.qrCodeTrace}
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wide text-slate-800"><i class="fa-solid fa-scale-balanced mr-1 text-emerald-600"></i>Konfirmasi Penerimaan Barang</h4>
          <p class="mt-1 text-[11px] text-slate-500">Masukkan berat aktual yang diterima. Anda dapat melampirkan foto atau dokumen bukti timbangan sebelum scan QR.</p>
        </div>
        ${o.qrCompletionReady ? `
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"><i class="fa-solid fa-circle-check mr-1"></i> Data penerimaan tersimpan: <strong>${Number(o.actualReceivedWeight).toLocaleString('id-ID')} ${o.unit}</strong>${o.weighingProof ? ' • Bukti timbang terlampir' : ''}.</div>
        ` : `
          <form onsubmit="app.submitReceivingEvidence(event, '${o.id}')" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="text-xs font-bold text-slate-700">Berat aktual diterima (${o.unit}) *<input id="receipt-actual-weight" type="number" min="0.01" step="0.01" required value="${o.quantity}" class="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"></label>
              <label class="text-xs font-bold text-slate-700">Foto / dokumen bukti timbang <span class="font-normal text-slate-400">(opsional)</span><input id="receipt-weighing-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" class="mt-1 block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-2 file:py-1.5 file:text-[11px] file:font-bold file:text-emerald-800"></label>
            </div>
            <button type="submit" class="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"><i class="fa-solid fa-cloud-arrow-up mr-1"></i>Simpan Data Penerimaan</button>
          </form>
        `}
        <button ${o.qrCompletionReady ? '' : 'disabled'} onclick="app.scanOrderQr('${o.id}')" class="w-full rounded-xl px-4 py-2.5 text-xs font-bold transition ${o.qrCompletionReady ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-200 text-slate-400'}"><i class="fa-solid fa-qrcode mr-1"></i>${o.qrCompletionReady ? 'Scan QR Code untuk Menyelesaikan Transaksi' : 'Scan QR Code terkunci — simpan data penerimaan terlebih dahulu'}</button>
      </div>

      <div class="flex justify-end space-x-2 pt-2">
        <button onclick="window.print()" class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Cetak Dokumen
        </button>
        <button onclick="app.closeModals()" class="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold">
          Tutup
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  updateOrderCountBadge() {
    const user = this.store.getCurrentUser();
    const orders = (user && user.role === 'buyer') ? this.store.getOrdersForBuyer(user.id) : this.store.getOrders();
    const badge = [REDACTED]'buyer-order-count-badge');
    if (badge) badge.textContent = orders.length;

    const offersBadge = [REDACTED]'buyer-offers-count-badge');
    if (offersBadge && user) {
      const acceptedOffers = this.store.getAcceptedOffersForBuyer(user.id);
      offersBadge.textContent = acceptedOffers.length;
    }
  }

  // ================= 4B. PENAWARAN DISETUJUI & VALIDASI BARANG (PEMBELI) =================
  renderBuyerAcceptedOffers() {
    const container = [REDACTED]'buyer-accepted-offers-list');
    if (!container) return;
    const user = this.store.getCurrentUser();
    if (!user) return;

    this.updateOrderCountBadge();
    const offers = this.store.getAcceptedOffersForBuyer(user.id);

    if (offers.length === 0) {
      container.innerHTML = `
        <div class="sm:col-span-2 lg:col-span-3 py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200 p-8">
          <i class="fa-solid fa-handshake-slash text-3xl mb-2 text-slate-300"></i>
          <p class="font-bold text-slate-700">Belum ada penawaran harga yang disetujui penjual.</p>
          <p class="text-[11px] text-slate-400 mt-1">Gunakan tombol "Tawar Harga" pada katalog pasokan untuk mengajukan negosiasi.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = offers.map(o => {
      const product = this.store.getProductById(o.productId);
      const isAlreadyOrdered = o.isConvertedToOrder;
      const discount = o.originalPrice ? Math.max(0, o.originalPrice - o.offerPrice) : 0;
      const totalDeal = o.offerPrice * (Number(o.quantity) || 1);

      return `
        <div class="bg-white rounded-2xl border ${isAlreadyOrdered ? 'border-slate-200 opacity-80' : 'border-emerald-300 shadow-sm'} p-5 space-y-4 flex flex-col justify-between">
          <div class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isAlreadyOrdered ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}">
                ${isAlreadyOrdered ? 'Sudah Diproses Checkout' : '<i class="fa-solid fa-circle-check mr-1"></i>Disetujui Penjual'}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">${(o.respondedAt || o.createdAt || '').substring(0, 10)}</span>
            </div>
            <h4 class="text-sm font-bold text-slate-900 leading-snug">${this._escHtml(o.productTitle)}</h4>
            <div class="text-[11px] text-slate-500">Penjual: <strong>${this._escHtml(o.sellerName)}</strong></div>
            
            <div class="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
              <div class="flex justify-between items-center text-slate-500">
                <span>Harga Katalog Awal:</span>
                <span class="line-through">${o.originalPrice ? this.formatRupiah(o.originalPrice) : '-'} / ${o.unit}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-bold text-emerald-900">Harga Disepakati:</span>
                <span class="text-sm font-extrabold text-emerald-700 font-mono">${this.formatRupiah(o.offerPrice)} / ${o.unit}</span>
              </div>
              <div class="flex justify-between items-center text-slate-700 pt-1 border-t border-emerald-200">
                <span>Volume Deal:</span>
                <span class="font-bold font-mono">${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</span>
              </div>
              <div class="flex justify-between items-center font-bold text-slate-900 pt-1 border-t border-emerald-200">
                <span>Total Estimasi Transaksi:</span>
                <span class="font-mono text-emerald-800">${this.formatRupiah(totalDeal)}</span>
              </div>
            </div>

            ${o.note ? `<p class="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">"${this._escHtml(o.note)}"</p>` : ''}
          </div>

          <div class="pt-2">
            ${isAlreadyOrdered ? `
              <button disabled class="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed">
                Pesanan Telah Dibuat
              </button>
            ` : `
              <button onclick="app.proceedToCheckoutFromOffer('${o.id}')" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-lock"></i>
                <span>Checkout &amp; Bayar DP Sekarang</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  proceedToCheckoutFromOffer(offerId) {
    const offer = (this.store.state.offers || []).find(o => o.id === offerId);
    if (!offer) return;
    const product = this.store.getProductById(offer.productId);
    if (!product) {
      this.showToast('Produk pasokan tidak lagi tersedia.', 'error');
      return;
    }

    // Buat salinan sementara produk dengan offer price yang disepakati
    const offerNegotiatedProduct = {
      ...product,
      offerPrice: offer.offerPrice,
      negotiatedVolume: offer.quantity,
      fromOfferId: offer.id
    };

    // Buka modal booking dengan harga deal
    this.openBookingModalWithNegotiatedPrice(offerNegotiatedProduct);
  }

  openBookingModalWithNegotiatedPrice(product) {
    this.selectedBookingProduct = product;
    const modal = [REDACTED]'modal-booking');
    if (!modal) return;

    const el = id => [REDACTED]id);
    if (el('bk-product-title')) el('bk-product-title').textContent = product.title;
    if (el('bk-seller-name')) el('bk-seller-name').textContent = product.sellerName;
    if (el('bk-unit-price')) el('bk-unit-price').textContent = this.formatRupiah(product.offerPrice) + ' / ' + product.unit + ' (Harga Kesepakatan Penawaran)';
    if (el('bk-qty')) {
      el('bk-qty').value = product.negotiatedVolume || product.minimumOrder || 1;
      el('bk-qty').max = product.volume > 0 ? product.volume : product.weight;
    }

    this.updateBookingSummary();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    this.showToast(`Harga deal penawaran Rp${product.offerPrice.toLocaleString('id-ID')} berhasil diterapkan.`, 'success');
  }

  openBuyerReceiveModal(orderId) {
    const order = this.store.getOrderById(orderId);
    if (!order) return;

    [REDACTED]'receive-order-id').value = order.id;
    [REDACTED]'receive-weight-unit').textContent = order.unit;
    [REDACTED]'receive-actual-weight').value = order.actualReceivedWeight || order.quantity;
    [REDACTED]'receive-buyer-notes').value = order.buyerReceiveNotes || '';
    [REDACTED]'receive-buyer-proof').value = order.weighingProof || '';

    const summaryEl = [REDACTED]'receive-order-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex justify-between"><span class="text-slate-500">No. Booking:</span><span class="font-mono font-bold text-slate-900">${esc(order.bookingCode)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Komoditas:</span><span class="font-bold text-slate-900">${esc(order.productTitle)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Penjual:</span><span>${esc(order.sellerName)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Volume Pesanan:</span><span class="font-mono font-bold text-emerald-700">${Number(order.quantity).toLocaleString('id-ID')} ${order.unit}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Metode Pengiriman:</span><span>${order.shippingStatus === 'shipped_third_party' ? 'Ekspedisi: ' + (order.deliveryDetails?.courierName || 'Pihak ke-3') : 'Serah Terima di Depo'}</span></div>
      `;
    }

    const modal = [REDACTED]'modal-buyer-receive-confirm');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  submitBuyerReceiveValidation(event) {
    event.preventDefault();
    const orderId = [REDACTED]'receive-order-id').value;
    const actualWeight = Number([REDACTED]'receive-actual-weight').value) || 0;
    const notes = [REDACTED]'receive-buyer-notes').value.trim();
    const proof = [REDACTED]'receive-buyer-proof').value.trim();
    const user = this.store.getCurrentUser();

    try {
      this.store.validateOrderDelivery({
        orderId,
        buyerId: user ? user.id : 'user_buyer_1',
        actualWeight,
        notes,
        proofImage: proof
      });

      this.closeModals();
      this.renderBuyerOrders();
      if (this.currentBuyerTab === 'reports') this.renderBuyerPurchaseReport();
      this.triggerConfetti();
      this.showToast('Barang berhasil divalidasi! Transaksi tuntas dan dana escrow telah diteruskan ke penjual.', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  openBuyerQrScannerModal(orderId) {
    const order = this.store.getOrderById(orderId);
    if (!order) return;

    [REDACTED]'scanner-target-order-id').value = order.id;
    const input = [REDACTED]'manual-handover-qr-input');
    if (input) input.value = '';

    const quickBtnsContainer = [REDACTED]'quick-demo-qr-buttons');
    if (quickBtnsContainer) {
      const qrTarget = order.sellerHandoverQr || `QR-HANDOVER-${order.id}`;
      quickBtnsContainer.innerHTML = `
        <span class="text-slate-400">Kode QR Transaksi Ini:</span>
        <button type="button" onclick="[REDACTED]'manual-handover-qr-input').value='${qrTarget}'" class="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold">
          Tempel ${qrTarget}
        </button>
      `;
    }

    const modal = [REDACTED]'modal-buyer-qr-scanner');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  showQuickScanQrModal() {
    [REDACTED]'scanner-target-order-id').value = '';
    const input = [REDACTED]'manual-handover-qr-input');
    if (input) input.value = '';

    const quickBtnsContainer = [REDACTED]'quick-demo-qr-buttons');
    if (quickBtnsContainer) {
      const user = this.store.getCurrentUser();
      const orders = (user && user.role === 'buyer') ? this.store.getOrdersForBuyer(user.id) : this.store.getOrders();
      const pendingOrders = orders.filter(o => o.shippingStatus !== 'delivered' && o.escrowStatus !== 'completed');
      if (pendingOrders.length > 0) {
        quickBtnsContainer.innerHTML = `
          <span class="text-slate-400 w-full mb-1">Pilih Cepat Kode QR Pesanan:</span>
          ${pendingOrders.map(o => {
            const qr = o.sellerHandoverQr || `QR-HANDOVER-${o.id}`;
            return `<button type="button" onclick="[REDACTED]'manual-handover-qr-input').value='${qr}'; [REDACTED]'scanner-target-order-id').value='${o.id}'" class="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[10px] font-bold">${esc(o.bookingCode)} (${qr})</button>`;
          }).join('')}
        `;
      } else {
        quickBtnsContainer.innerHTML = '<span class="text-slate-400">Tidak ada pesanan aktif yang menunggu serah terima.</span>';
      }
    }

    const modal = [REDACTED]'modal-buyer-qr-scanner');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  submitScannedHandoverQr(event) {
    event.preventDefault();
    const qrInput = [REDACTED]'manual-handover-qr-input').value.trim();
    let targetOrderId = [REDACTED]'scanner-target-order-id').value;
    const user = this.store.getCurrentUser();

    if (!targetOrderId) {
      // Cari order yang cocok dari string QR
      const allOrders = this.store.getOrders();
      const match = allOrders.find(o => (o.sellerHandoverQr === qrInput) || (o.qrCodeTrace === qrInput) || qrInput.includes(o.id) || qrInput.includes(o.bookingCode));
      if (match) targetOrderId = match.id;
    }

    if (!targetOrderId) {
      this.showToast('Kode QR tidak dapat dikaitkan dengan pesanan aktif.', 'error');
      return;
    }

    try {
      this.store.validateOrderDelivery({
        orderId: targetOrderId,
        buyerId: user ? user.id : 'user_buyer_1',
        handoverQrCode: qrInput
      });

      this.closeModals();
      this.renderBuyerOrders();
      if (this.currentBuyerTab === 'reports') this.renderBuyerPurchaseReport();
      this.triggerConfetti();
      this.showToast('QR Code Valid! Serah terima berhasil diverifikasi dan dana escrow dirilis kepada penjual.', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  // ================= 4C. LAPORAN PEMBELIAN (PEMBELI) =================
  renderBuyerPurchaseReport() {
    const user = this.store.getCurrentUser();
    if (!user) return;

    const filters = {
      status: [REDACTED]'buyer-report-filter-status')?.value || 'all',
      startDate: [REDACTED]'buyer-report-filter-start')?.value || '',
      endDate: [REDACTED]'buyer-report-filter-end')?.value || ''
    };

    const report = this.store.getBuyerPurchaseReport(user.id, filters);

    // Render KPI Cards
    const kpiContainer = [REDACTED]'buyer-report-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Belanja Pasokan</span>
            <i class="fa-solid fa-wallet text-violet-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">${this.formatRupiah(report.totalSpend)}</div>
          <div class="text-[11px] text-slate-500 mt-1">${report.totalOrders} Transaksi Pengadaan</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Volume Limbah Didapat</span>
            <i class="fa-solid fa-scale-balanced text-emerald-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">${Number(report.totalVolume).toLocaleString('id-ID')} Kg/L</div>
          <div class="text-[11px] text-slate-500 mt-1">Material terverifikasi tera</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Transaksi Selesai</span>
            <i class="fa-solid fa-circle-check text-blue-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">${report.completedOrdersCount} Pesanan</div>
          <div class="text-[11px] text-slate-500 mt-1">Barang diterima &amp; lunas</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Escrow DP Aktif</span>
            <i class="fa-solid fa-shield-halved text-amber-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">${report.pendingOrdersCount} Pesanan</div>
          <div class="text-[11px] text-slate-500 mt-1">Dana aman tertahan di rekening bersama</div>
        </div>
      `;
    }

    const countLabel = [REDACTED]'buyer-report-count-label');
    if (countLabel) countLabel.textContent = `${report.orders.length} Transaksi Ditemukan`;

    // Render Table
    const tableContainer = [REDACTED]'buyer-report-table-container');
    if (!tableContainer) return;

    if (report.orders.length === 0) {
      tableContainer.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Tidak ada transaksi yang cocok dengan filter yang dipilih.</div>';
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Tanggal &amp; Booking</th>
            <th class="p-3">Penjual &amp; Komoditas</th>
            <th class="p-3">Volume Dipesan / Tera</th>
            <th class="p-3">Nilai Bruto</th>
            <th class="p-3">DP Terbayar</th>
            <th class="p-3">Status Logistik</th>
            <th class="p-3">Status Escrow</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${report.orders.map(o => {
            const isCompleted = o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-brand-700">
                  <div>${esc(o.bookingCode)}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0, 10)}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${this._escHtml(o.productTitle)}</div>
                  <div class="text-[11px] text-slate-500">Penjual: ${this._escHtml(o.sellerName)}</div>
                </td>
                <td class="p-3 font-semibold text-slate-800">
                  <div>${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</div>
                  ${o.actualReceivedWeight ? `<div class="text-[10px] text-emerald-700 font-bold">Aktual: ${Number(o.actualReceivedWeight).toLocaleString('id-ID')} ${o.unit}</div>` : ''}
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
                <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.totalPaidNow)}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCompleted ? 'bg-emerald-100 text-emerald-800' :
                    o.shippingStatus === 'shipped_third_party' ? 'bg-blue-100 text-blue-800' :
                    o.shippingStatus === 'handed_over' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }">
                    ${o.bookingStatus || 'Menunggu'}
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                    ${isCompleted ? 'Dicairkan ke Penjual' : 'Tertahan di Rekber'}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  resetBuyerReportFilter() {
    if ([REDACTED]'buyer-report-filter-status')) [REDACTED]'buyer-report-filter-status').value = 'all';
    if ([REDACTED]'buyer-report-filter-start')) [REDACTED]'buyer-report-filter-start').value = '';
    if ([REDACTED]'buyer-report-filter-end')) [REDACTED]'buyer-report-filter-end').value = '';
    this.renderBuyerPurchaseReport();
  }

  printBuyerPurchaseReport() {
    const user = this.store.getCurrentUser();
    if (!user) return;
    const report = this.store.getBuyerPurchaseReport(user.id);

    const kpis = [
      { label: 'Total Belanja Pasokan', value: this.formatRupiah(report.totalSpend) },
      { label: 'Total Volume Pasokan', value: `${Number(report.totalVolume).toLocaleString('id-ID')} Kg/Liter` },
      { label: 'Transaksi Selesai', value: `${report.completedOrdersCount} Pesanan` },
      { label: 'Transaksi Berjalan', value: `${report.pendingOrdersCount} Pesanan` }
    ];

    const headers = ['Kode Booking', 'Tanggal', 'Penjual', 'Komoditas Limbah', 'Volume', 'Total Nilai (Rp)', 'DP Terbayar', 'Status Transaksi'];
    const rows = report.orders.map(o => [
      o.bookingCode,
      (o.createdAt || '').substring(0, 10),
      o.sellerName,
      o.productTitle,
      `${o.actualReceivedWeight || o.quantity} ${o.unit}`,
      this.formatRupiah(o.totalPrice),
      this.formatRupiah(o.totalPaidNow),
      o.bookingStatus || 'Selesai'
    ]);

    this.generateAndTriggerPrint(
      'LAPORAN PENGADAAN & PEMBELIAN PASOKAN LIMBAH',
      `Nama Pembeli: ${esc(user.name)} (${esc(user.company || 'Perusahaan Mitra')})`,
      `Periode: s/d ${new Date().toLocaleDateString('id-ID')}`,
      kpis,
      headers,
      rows
    );
  }

  // ================= 10. MODUL PENJUAL (TABS & LAPORAN PENJUALAN) =================
  switchSellerTab(tab) {
    this.currentSellerTab = tab;
    const tabs = ['products', 'sales', 'offers'];
    tabs.forEach(t => {
      const btn = [REDACTED]`seller-tab-btn-${t}`);
      const content = [REDACTED]`seller-content-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-4 py-2.5 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-xs transition flex items-center gap-1.5 shrink-0';
        } else {
          btn.className = 'px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5 shrink-0';
        }
      }
      if (content) {
        if (t === tab) content.classList.remove('hidden');
        else content.classList.add('hidden');
      }
    });

    if (tab === 'products') this.renderSellerProductsTable();
    if (tab === 'sales') this.renderSellerSalesReport();
    if (tab === 'offers') this.renderSellerOffersReport();
  }

  renderSellerDashboard() {
    const stats = this.store.getSellerStats();
    [REDACTED]'seller-stat-active').textContent = stats.activeListings;
    [REDACTED]'seller-stat-pending').textContent = stats.pendingListings;
    [REDACTED]'seller-stat-booked').textContent = stats.bookedListings;
    [REDACTED]'seller-stat-balance').textContent = this.formatRupiah(stats.balance);

    const seller = this.store.getCurrentUser();
    if (seller) {
      const sellerOrders = this.store.getOrdersForSeller(seller.id);
      const pendingDispatchCount = sellerOrders.filter(o => !o.shippingStatus || o.shippingStatus === 'pending_dispatch').length;
      const salesBadge = [REDACTED]'seller-sales-pending-badge');
      if (salesBadge) salesBadge.textContent = pendingDispatchCount;

      const acceptedOffers = this.store.getAcceptedOffersForSeller(seller.id);
      const offersBadge = [REDACTED]'seller-offers-badge');
      if (offersBadge) offersBadge.textContent = acceptedOffers.length;
    }

    const currentTab = this.currentSellerTab || 'products';
    this.switchSellerTab(currentTab);
  }

  // ================= 10B. LAPORAN PENJUALAN & PENGIRIMAN LOGISTIK (PENJUAL) =================
  renderSellerSalesReport() {
    const seller = this.store.getCurrentUser();
    if (!seller) return;

    const filters = {
      status: [REDACTED]'seller-sales-filter-status')?.value || 'all',
      startDate: [REDACTED]'seller-sales-filter-start')?.value || '',
      endDate: [REDACTED]'seller-sales-filter-end')?.value || ''
    };

    const report = this.store.getSellerSalesReport(seller.id, filters);

    // KPI Cards
    const kpiContainer = [REDACTED]'seller-sales-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Omset Penjualan</span>
            <i class="fa-solid fa-coins text-emerald-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">${this.formatRupiah(report.totalGrossRevenue)}</div>
          <div class="text-[11px] text-slate-500 mt-1">${report.totalOrders} Transaksi Terjadwal</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Volume Terjual</span>
            <i class="fa-solid fa-boxes-stacked text-blue-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">${Number(report.totalVolume).toLocaleString('id-ID')} Kg/L</div>
          <div class="text-[11px] text-slate-500 mt-1">Material terdistribusi</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Transaksi Selesai &amp; Cair</span>
            <i class="fa-solid fa-circle-check text-emerald-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">${report.completedOrdersCount} Pesanan</div>
          <div class="text-[11px] text-slate-500 mt-1">Saldo masuk dompet</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Perlu Pengiriman / Penyerahan</span>
            <i class="fa-solid fa-truck-ramp-box text-amber-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">${report.pendingOrdersCount} Pesanan</div>
          <div class="text-[11px] text-slate-500 mt-1">Menunggu aksi logistik</div>
        </div>
      `;
    }

    const countLabel = [REDACTED]'seller-sales-count-label');
    if (countLabel) countLabel.textContent = `${report.orders.length} Transaksi Ditemukan`;

    // Table
    const tableContainer = [REDACTED]'seller-sales-table-container');
    if (!tableContainer) return;

    if (report.orders.length === 0) {
      tableContainer.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Tidak ada riwayat penjualan sesuai kriteria filter.</div>';
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode Booking</th>
            <th class="p-3">Pembeli</th>
            <th class="p-3">Komoditas &amp; Volume</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">DP Escrow</th>
            <th class="p-3">Sisa &amp; Pelunasan</th>
            <th class="p-3">Status Pengiriman</th>
            <th class="p-3 text-right">Aksi Logistik</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${report.orders.map(o => {
            const isCompleted = o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
            const isDispatched = o.shippingStatus === 'shipped_third_party' || o.shippingStatus === 'handed_over';
            const hasProof = ['proof_submitted', 'submitted'].includes(o.remainingPaymentStatus);
            const isPaid = ['paid', 'completed', 'verified_by_admin', 'verified_by_seller'].includes(o.remainingPaymentStatus);

            let statusBadge = '';
            if (isCompleted) {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <i class="fa-solid fa-circle-check"></i> Selesai &amp; Dana Cair
                </span>
              `;
            } else if (o.shippingStatus === 'shipped_third_party') {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <i class="fa-solid fa-truck-fast"></i> Dikirim Pihak ke-3
                </span>
                <div class="text-[9px] font-mono text-slate-500 mt-0.5">${o.deliveryDetails?.trackingNumber || ''}</div>
              `;
            } else if (o.shippingStatus === 'handed_over') {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <i class="fa-solid fa-handshake"></i> Diserahkan di Depo
                </span>
              `;
            } else {
              statusBadge = `
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  <i class="fa-solid fa-hourglass-half"></i> Perlu Dikirim / Serah
                </span>
              `;
            }

            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-brand-700">
                  <div>${esc(o.bookingCode)}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0, 10)}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${this._escHtml(o.buyerName)}</div>
                  <div class="text-[10px] text-slate-500">Jadwal: ${o.pickupDate}</div>
                </td>
                <td class="p-3 font-semibold text-slate-800">
                  <div>${this._escHtml(o.productTitle)}</div>
                  <div class="text-[11px] font-mono text-emerald-700">${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</div>
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
                <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.downPaymentAmount)}</td>
                <td class="p-3">
                  ${o.remainingPayment > 0 ? `
                    <div class="font-mono text-xs font-bold text-red-600">${this.formatRupiah(o.remainingPayment)}</div>
                    ${hasProof ? `
                      <div class="mt-1 space-y-1">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <i class="fa-solid fa-clock-rotate-left"></i> Bukti Diunggah
                        </span>
                        <button onclick="app.openViewRemainingProofModal('${o.id}')" class="block w-full px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold transition">
                          <i class="fa-solid fa-eye mr-0.5"></i> Cek Bukti Sisa
                        </button>
                      </div>
                    ` : isPaid ? `
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <i class="fa-solid fa-circle-check"></i> ${o.remainingPaymentStatus === 'verified_by_seller' ? 'Disetujui Penjual' : 'Lunas 100%'}
                      </span>
                    ` : `
                      <span class="text-[10px] text-slate-400">Menunggu Pembeli</span>
                    `}
                  ` : `<span class="text-[10px] text-slate-400">Lunas DP/Full</span>`}
                </td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right space-y-1">
                  ${!isCompleted ? `
                    <button onclick="app.openSellerDispatchModal('${o.id}')" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 ml-auto transition">
                      <i class="fa-solid fa-truck-ramp-box"></i>
                      <span>${isDispatched ? 'Update Pengiriman' : 'Kirim / Serahkan'}</span>
                    </button>
                  ` : ''}
                  <div class="flex items-center justify-end gap-1">
                    ${o.deliveryDetails ? `
                      <button onclick="app.showDeliveryDetailsModal('${o.id}')" class="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[10px] transition">
                        <i class="fa-solid fa-route mr-0.5"></i>Detail Bukti
                      </button>
                    ` : ''}
                    <button onclick="app.showBookingReceipt('${o.id}')" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] transition">
                      <i class="fa-solid fa-receipt mr-0.5"></i>Surat Jalan
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  resetSellerSalesFilter() {
    if ([REDACTED]'seller-sales-filter-status')) [REDACTED]'seller-sales-filter-status').value = 'all';
    if ([REDACTED]'seller-sales-filter-start')) [REDACTED]'seller-sales-filter-start').value = '';
    if ([REDACTED]'seller-sales-filter-end')) [REDACTED]'seller-sales-filter-end').value = '';
    this.renderSellerSalesReport();
  }

  openSellerDispatchModal(orderId) {
    const order = this.store.getOrderById(orderId);
    if (!order) return;

    [REDACTED]'dispatch-order-id').value = order.id;

    const summaryEl = [REDACTED]'dispatch-order-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="flex justify-between"><span class="text-slate-500">No. Booking:</span><span class="font-mono font-bold text-slate-900">${esc(order.bookingCode)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Pembeli:</span><span class="font-bold text-slate-900">${this._escHtml(order.buyerName)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Komoditas:</span><span>${this._escHtml(order.productTitle)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Volume:</span><span class="font-mono font-bold text-emerald-700">${Number(order.quantity).toLocaleString('id-ID')} ${order.unit}</span></div>
      `;
    }

    const qrPayload = order.sellerHandoverQr || `QR-HANDOVER-${order.id}`;
    [REDACTED]'dispatch-direct-qr-code-text').textContent = qrPayload;
    this.renderQrCodeInto('dispatch-direct-qr-container', qrPayload);

    // Pre-fill existing delivery details if any
    const d = order.deliveryDetails || {};
    if (d.dispatchType === 'third_party') {
      this.onDispatchTypeChange('third_party');
      const radioThird = document.querySelector('input[name="dispatch-type"][value="third_party"]');
      if (radioThird) radioThird.checked = true;
      [REDACTED]'dispatch-third-courier').value = d.courierName || '';
      [REDACTED]'dispatch-third-tracking').value = d.trackingNumber || '';
      [REDACTED]'dispatch-third-notes').value = d.notes || '';
      [REDACTED]'dispatch-third-proof').value = d.proofImage || '';
    } else {
      this.onDispatchTypeChange('direct');
      const radioDirect = document.querySelector('input[name="dispatch-type"][value="direct"]');
      if (radioDirect) radioDirect.checked = true;
      [REDACTED]'dispatch-direct-recipient').value = d.handoverRecipient || '';
      [REDACTED]'dispatch-direct-notes').value = d.notes || '';
    }

    const modal = [REDACTED]'modal-seller-dispatch');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  onDispatchTypeChange(type) {
    const directPanel = [REDACTED]'panel-dispatch-direct');
    const thirdPartyPanel = [REDACTED]'panel-dispatch-third-party');
    const directLabel = [REDACTED]'label-dispatch-direct');
    const thirdLabel = [REDACTED]'label-dispatch-third-party');

    if (type === 'third_party') {
      directPanel?.classList.add('hidden');
      thirdPartyPanel?.classList.remove('hidden');
      directLabel?.classList.remove('border-emerald-600', 'bg-emerald-50/50');
      thirdLabel?.classList.add('border-blue-600', 'bg-blue-50/50');
    } else {
      directPanel?.classList.remove('hidden');
      thirdPartyPanel?.classList.add('hidden');
      directLabel?.classList.add('border-emerald-600', 'bg-emerald-50/50');
      thirdLabel?.classList.remove('border-blue-600', 'bg-blue-50/50');
    }
  }

  submitSellerDispatch(event) {
    event.preventDefault();
    const orderId = [REDACTED]'dispatch-order-id').value;
    const seller = this.store.getCurrentUser();
    const dispatchType = document.querySelector('input[name="dispatch-type"]:checked')?.value || 'direct';

    let courierName = '';
    let trackingNumber = '';
    let notes = '';
    let proofImage = '';
    let handoverRecipient = '';

    if (dispatchType === 'third_party') {
      courierName = [REDACTED]'dispatch-third-courier').value.trim();
      trackingNumber = [REDACTED]'dispatch-third-tracking').value.trim();
      notes = [REDACTED]'dispatch-third-notes').value.trim();
      proofImage = [REDACTED]'dispatch-third-proof').value.trim();
      if (!courierName || !trackingNumber) {
        this.showToast('Nama ekspedisi dan nomor resi wajib diisi untuk pengiriman pihak ke-3.', 'warning');
        return;
      }
    } else {
      handoverRecipient = [REDACTED]'dispatch-direct-recipient').value.trim();
      notes = [REDACTED]'dispatch-direct-notes').value.trim();
    }

    try {
      this.store.dispatchOrder({
        orderId,
        sellerId: seller ? seller.id : 'user_seller_1',
        dispatchType,
        courierName,
        trackingNumber,
        notes,
        proofImage,
        handoverRecipient
      });

      this.closeModals();
      this.renderSellerSalesReport();
      this.renderSellerDashboard();
      this.showToast(dispatchType === 'third_party' ? 'Status diperbarui: Barang telah dikirim oleh pihak ke-3.' : 'Status diperbarui: Barang telah diserahkan langsung ke pembeli.', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  printSellerSalesReport() {
    const seller = this.store.getCurrentUser();
    if (!seller) return;
    const report = this.store.getSellerSalesReport(seller.id);

    const kpis = [
      { label: 'Total Omset Penjualan', value: this.formatRupiah(report.totalGrossRevenue) },
      { label: 'Total Volume Pasokan', value: `${Number(report.totalVolume).toLocaleString('id-ID')} Kg/Liter` },
      { label: 'Transaksi Selesai & Cair', value: `${report.completedOrdersCount} Pesanan` },
      { label: 'Menunggu Pengiriman', value: `${report.pendingOrdersCount} Pesanan` }
    ];

    const headers = ['Kode Booking', 'Tanggal', 'Pembeli', 'Komoditas Limbah', 'Volume', 'Total Nilai (Rp)', 'DP Escrow', 'Status Logistik'];
    const rows = report.orders.map(o => [
      o.bookingCode,
      (o.createdAt || '').substring(0, 10),
      o.buyerName,
      o.productTitle,
      `${o.quantity} ${o.unit}`,
      this.formatRupiah(o.totalPrice),
      this.formatRupiah(o.downPaymentAmount),
      o.bookingStatus || 'Selesai'
    ]);

    this.generateAndTriggerPrint(
      'LAPORAN PENJUALAN & LOGISTIK PASOKAN LIMBAH',
      `Penjual: ${esc(seller.name)} (${esc(seller.company || 'Sentra Limbah Sirkular')})`,
      `Periode: s/d ${new Date().toLocaleDateString('id-ID')}`,
      kpis,
      headers,
      rows
    );
  }

  // ================= 10C. LAPORAN PENAWARAN DISETUJUI & MASUK (PENJUAL) =================
  renderSellerOffersReport() {
    const seller = this.store.getCurrentUser();
    if (!seller) return;

    const acceptedOffers = this.store.getAcceptedOffersForSeller(seller.id);
    const allOffers = this.store.getOffersForSeller(seller.id);
    const pendingOffers = allOffers.filter(o => o.status === 'pending');

    const totalDealPotential = acceptedOffers.reduce((sum, o) => sum + (o.offerPrice * (Number(o.quantity) || 1)), 0);

    // KPI
    const kpiContainer = [REDACTED]'seller-offers-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Penawaran Disetujui</span>
            <i class="fa-solid fa-circle-check text-emerald-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">${acceptedOffers.length} Deal</div>
          <div class="text-[11px] text-slate-500 mt-1">Kesepakatan harga disetujui</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Potensi Nilai Deal</span>
            <i class="fa-solid fa-coins text-blue-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">${this.formatRupiah(totalDealPotential)}</div>
          <div class="text-[11px] text-slate-500 mt-1">Estimasi nilai penjualan</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Menunggu Keputusan</span>
            <i class="fa-solid fa-clock text-amber-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">${pendingOffers.length} Tawaran</div>
          <div class="text-[11px] text-slate-500 mt-1">Perlu Anda tinjau</div>
        </div>
      `;
    }

    // Tabel Penawaran Disetujui
    const acceptedContainer = [REDACTED]'seller-accepted-offers-container');
    if (acceptedContainer) {
      if (acceptedOffers.length === 0) {
        acceptedContainer.innerHTML = '<div class="py-8 text-center text-xs text-slate-400">Belum ada penawaran yang telah Anda setujui.</div>';
      } else {
        acceptedContainer.innerHTML = `
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th class="p-3">Tanggal ACC</th>
                <th class="p-3">Pembeli</th>
                <th class="p-3">Komoditas Limbah</th>
                <th class="p-3">Harga Awal vs Deal</th>
                <th class="p-3">Volume Deal</th>
                <th class="p-3">Total Nilai Deal</th>
                <th class="p-3">Status Konversi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${acceptedOffers.map(o => `
                <tr class="hover:bg-slate-50/70 transition">
                  <td class="p-3 font-mono text-slate-500">${(o.respondedAt || o.createdAt || '').substring(0, 10)}</td>
                  <td class="p-3 font-bold text-slate-900">${this._escHtml(o.buyerName)}</td>
                  <td class="p-3">
                    <div class="font-bold text-slate-900">${this._escHtml(o.productTitle)}</div>
                    <div class="text-[10px] font-mono text-slate-400">${o.productCode || ''}</div>
                  </td>
                  <td class="p-3">
                    <div class="font-bold font-mono text-emerald-700">${this.formatRupiah(o.offerPrice)} / ${o.unit}</div>
                    ${o.originalPrice ? `<div class="line-through text-[10px] text-slate-400">${this.formatRupiah(o.originalPrice)}</div>` : ''}
                  </td>
                  <td class="p-3 font-mono font-semibold">${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</td>
                  <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.offerPrice * (Number(o.quantity) || 1))}</td>
                  <td class="p-3">
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${o.isConvertedToOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                      ${o.isConvertedToOrder ? 'Telah Dipesan Pembeli' : 'Menunggu Checkout Pembeli'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // Tabel Penawaran Masuk (Pending)
    this.renderSellerOffers();
  }

  printSellerOffersReport() {
    const seller = this.store.getCurrentUser();
    if (!seller) return;
    const acceptedOffers = this.store.getAcceptedOffersForSeller(seller.id);

    const totalPotential = acceptedOffers.reduce((sum, o) => sum + (o.offerPrice * (Number(o.quantity) || 1)), 0);
    const kpis = [
      { label: 'Penawaran Disetujui', value: `${acceptedOffers.length} Kesepakatan` },
      { label: 'Total Nilai Deal', value: this.formatRupiah(totalPotential) }
    ];

    const headers = ['Tanggal Disetujui', 'Pembeli', 'Komoditas Limbah', 'Harga Deal', 'Volume', 'Total Potensi', 'Status'];
    const rows = acceptedOffers.map(o => [
      (o.respondedAt || o.createdAt || '').substring(0, 10),
      o.buyerName,
      o.productTitle,
      `${this.formatRupiah(o.offerPrice)} / ${o.unit}`,
      `${o.quantity} ${o.unit}`,
      this.formatRupiah(o.offerPrice * (Number(o.quantity) || 1)),
      o.isConvertedToOrder ? 'Telah Dipesan' : 'Menunggu Checkout'
    ]);

    this.generateAndTriggerPrint(
      'LAPORAN KESEPAKATAN PENAWARAN HARGA DISETUJUI',
      `Penjual: ${esc(seller.name)}`,
      `Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`,
      kpis,
      headers,
      rows
    );
  }

  // ================= 11. LAPORAN ADMIN: KEUANGAN & JUAL-BELI =================
  renderAdminFinancialReport() {
    const filters = {
      startDate: [REDACTED]'admin-fin-filter-start')?.value || '',
      endDate: [REDACTED]'admin-fin-filter-end')?.value || ''
    };

    const report = this.store.getAdminFinancialReport(filters);

    // KPI Cards
    const kpiContainer = [REDACTED]'admin-fin-kpi-container');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total GMV Perdagangan</span>
            <i class="fa-solid fa-coins text-emerald-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">${this.formatRupiah(report.totalGrossGMV)}</div>
          <div class="text-[11px] text-slate-500 mt-1">${report.totalOrders} Transaksi Terdata</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Pendapatan Fee Platform</span>
            <i class="fa-solid fa-landmark text-violet-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-violet-600 font-mono">${this.formatRupiah(report.totalPlatformFees)}</div>
          <div class="text-[11px] text-slate-500 mt-1">Handling + Aplikasi + Rekber</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Dana Dicairkan ke Penjual</span>
            <i class="fa-solid fa-hand-holding-dollar text-emerald-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">${this.formatRupiah(report.totalDisbursedToSellers)}</div>
          <div class="text-[11px] text-slate-500 mt-1">Pelunasan barang terselesaikan</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Saldo Escrow Mengendap</span>
            <i class="fa-solid fa-shield-halved text-amber-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">${this.formatRupiah(report.totalEscrowHeld)}</div>
          <div class="text-[11px] text-slate-500 mt-1">Uang jaminan DP aktif</div>
        </div>
      `;
    }

    const countLabel = [REDACTED]'admin-fin-count-label');
    if (countLabel) countLabel.textContent = `${report.orders.length} Transaksi Tercatat`;

    // Table
    const tableContainer = [REDACTED]'admin-financial-table-container');
    if (!tableContainer) return;

    if (report.orders.length === 0) {
      tableContainer.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Belum ada transaksi pada periode yang dipilih.</div>';
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Booking &amp; Tanggal</th>
            <th class="p-3">Pembeli &amp; Penjual</th>
            <th class="p-3">Nilai Bruto</th>
            <th class="p-3">DP Escrow (30%)</th>
            <th class="p-3">Platform Fee</th>
            <th class="p-3">Ongkir Mitra</th>
            <th class="p-3">Status Dana Penjual</th>
            <th class="p-3 text-right">Detail</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${report.orders.map(o => {
            const isCompleted = o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
            const feeTotal = (Number(o.handlingFee) || 0) + (Number(o.appFee) || 0);

            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-brand-700">
                  <div>${esc(o.bookingCode)}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0, 10)}</div>
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${this._escHtml(o.buyerName)}</div>
                  <div class="text-[11px] text-slate-500">Ke: ${this._escHtml(o.sellerName)}</div>
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
                <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.downPaymentAmount)}</td>
                <td class="p-3 font-mono text-violet-700 font-bold">${this.formatRupiah(feeTotal)}</td>
                <td class="p-3 font-mono text-slate-600">${o.shippingFee ? this.formatRupiah(o.shippingFee) : 'Rp 0'}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                    ${isCompleted ? 'Dicairkan 100%' : 'Tertahan di Escrow'}
                  </span>
                </td>
                <td class="p-3 text-right">
                  <button onclick="app.showBookingReceipt('${o.id}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition">
                    Audit
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  resetAdminFinFilter() {
    if ([REDACTED]'admin-fin-filter-start')) [REDACTED]'admin-fin-filter-start').value = '';
    if ([REDACTED]'admin-fin-filter-end')) [REDACTED]'admin-fin-filter-end').value = '';
    this.renderAdminFinancialReport();
  }

  printAdminFinancialReport() {
    const report = this.store.getAdminFinancialReport();

    const kpis = [
      { label: 'Total GMV Transaksi', value: this.formatRupiah(report.totalGrossGMV) },
      { label: 'Pendapatan Fee Platform', value: this.formatRupiah(report.totalPlatformFees) },
      { label: 'Dana Dicairkan ke Penjual', value: this.formatRupiah(report.totalDisbursedToSellers) },
      { label: 'Escrow Aktif Mengendap', value: this.formatRupiah(report.totalEscrowHeld) }
    ];

    const headers = ['Kode Booking', 'Tanggal', 'Pembeli', 'Penjual', 'Nilai Bruto', 'DP Escrow', 'Platform Fee', 'Status Dana'];
    const rows = report.orders.map(o => [
      o.bookingCode,
      (o.createdAt || '').substring(0, 10),
      o.buyerName,
      o.sellerName,
      this.formatRupiah(o.totalPrice),
      this.formatRupiah(o.downPaymentAmount),
      this.formatRupiah((o.handlingFee || 0) + (o.appFee || 0)),
      o.escrowStatus === 'completed' ? 'Cair ke Penjual' : 'Tertahan di Rekber'
    ]);

    this.generateAndTriggerPrint(
      'LAPORAN TRANSAKSI KEUANGAN & ARUS KAS ESCROW PLATFORM',
      'Pengelola: PT BURSA LIMBAH Sirkular Indonesia (Rekening Bersama Escrow)',
      `Periode: s/d ${new Date().toLocaleDateString('id-ID')}`,
      kpis,
      headers,
      rows
    );
  }

  renderAdminSalesPurchaseReport() {
    const catSelect = [REDACTED]'admin-report-filter-cat');
    if (catSelect && catSelect.options.length <= 1) {
      const cats = this.store.getCategories();
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
      });
    }

    const filters = {
      category: [REDACTED]'admin-report-filter-cat')?.value || 'all',
      startDate: [REDACTED]'admin-report-filter-start')?.value || '',
      endDate: [REDACTED]'admin-report-filter-end')?.value || ''
    };

    const report = this.store.getAdminSalesAndPurchaseReport(filters);

    // KPI
    const kpiContainer = [REDACTED]'admin-reports-kpi-container');
    if (kpiContainer) {
      const successRate = report.totalOrders > 0 ? Math.round((report.completedCount / report.totalOrders) * 100) : 100;
      kpiContainer.innerHTML = `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Tonase Diperdagangkan</span>
            <i class="fa-solid fa-weight-hanging text-blue-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-blue-600 font-mono">${Number(report.totalVolume).toLocaleString('id-ID')} Kg/L</div>
          <div class="text-[11px] text-slate-500 mt-1">Seluruh sirkulasi limbah industri</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Perputaran Bruto</span>
            <i class="fa-solid fa-chart-line text-emerald-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">${this.formatRupiah(report.totalGMV)}</div>
          <div class="text-[11px] text-slate-500 mt-1">Perdagangan terfasilitasi</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Total Transaksi Jual-Beli</span>
            <i class="fa-solid fa-handshake text-indigo-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-indigo-600 font-mono">${report.totalOrders} Order</div>
          <div class="text-[11px] text-slate-500 mt-1">${report.completedCount} Sukses • ${report.activeCount} Berjalan</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="text-slate-400 text-xs font-semibold mb-1 flex items-center justify-between">
            <span>Tingkat Sukses Transaksi</span>
            <i class="fa-solid fa-award text-amber-500"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">${successRate}%</div>
          <div class="text-[11px] text-slate-500 mt-1">Rasio penyelesaian escrow</div>
        </div>
      `;
    }

    // Commodity Distribution Cards
    const commodityContainer = [REDACTED]'admin-reports-commodity-container');
    if (commodityContainer) {
      if (report.commodities.length === 0) {
        commodityContainer.innerHTML = '<div class="sm:col-span-4 text-xs text-slate-400 text-center py-4">Belum ada data komoditas.</div>';
      } else {
        commodityContainer.innerHTML = report.commodities.map(c => `
          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 truncate" title="${this._escHtml(c.category)}">${this._escHtml(c.category)}</span>
              <span class="text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full">${c.orderCount} Order</span>
            </div>
            <div class="text-[11px] font-mono font-bold text-emerald-700">${Number(c.volume).toLocaleString('id-ID')} ${c.unit}</div>
            <div class="text-[10px] text-slate-500">${this.formatRupiah(c.gmv)}</div>
          </div>
        `).join('');
      }
    }

    const countLabel = [REDACTED]'admin-reports-count-label');
    if (countLabel) countLabel.textContent = `${report.orders.length} Transaksi Tercatat`;

    // Table
    const tableContainer = [REDACTED]'admin-reports-table-container');
    if (!tableContainer) return;

    if (report.orders.length === 0) {
      tableContainer.innerHTML = '<div class="py-12 text-center text-slate-400 text-xs">Tidak ada riwayat transaksi pada kriteria filter ini.</div>';
      return;
    }

    tableContainer.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">No. Booking</th>
            <th class="p-3">Penjual (Penyedia)</th>
            <th class="p-3">Pembeli (Pengolah)</th>
            <th class="p-3">Komoditas &amp; Volume</th>
            <th class="p-3">Total Transaksi</th>
            <th class="p-3">Metode Logistik</th>
            <th class="p-3">Status Transaksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${report.orders.map(o => {
            const isCompleted = o.escrowStatus === 'completed' || o.shippingStatus === 'delivered';
            return `
              <tr class="hover:bg-slate-50/70 transition">
                <td class="p-3 font-mono font-bold text-brand-700">
                  <div>${esc(o.bookingCode)}</div>
                  <div class="text-[10px] text-slate-400 font-normal">${(o.createdAt || '').substring(0, 10)}</div>
                </td>
                <td class="p-3 font-semibold text-slate-900">${this._escHtml(o.sellerName)}</td>
                <td class="p-3 font-semibold text-slate-900">${this._escHtml(o.buyerName)}</td>
                <td class="p-3">
                  <div class="font-bold text-slate-900">${this._escHtml(o.productTitle)}</div>
                  <div class="text-[11px] font-mono text-emerald-700">${Number(o.quantity).toLocaleString('id-ID')} ${o.unit}</div>
                </td>
                <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
                <td class="p-3">
                  <span class="text-[11px] font-medium text-slate-700">${o.shippingStatus === 'shipped_third_party' ? 'Ekspedisi Pihak ke-3' : 'Serah Terima Depo'}</span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                    ${isCompleted ? 'Selesai & Diterima' : (o.bookingStatus || 'Berjalan')}
                  </span>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  resetAdminReportFilter() {
    if ([REDACTED]'admin-report-filter-cat')) [REDACTED]'admin-report-filter-cat').value = 'all';
    if ([REDACTED]'admin-report-filter-start')) [REDACTED]'admin-report-filter-start').value = '';
    if ([REDACTED]'admin-report-filter-end')) [REDACTED]'admin-report-filter-end').value = '';
    this.renderAdminSalesPurchaseReport();
  }

  printAdminSalesPurchaseReport() {
    const report = this.store.getAdminSalesAndPurchaseReport();

    const kpis = [
      { label: 'Total Volume Pasokan', value: `${Number(report.totalVolume).toLocaleString('id-ID')} Kg/Liter` },
      { label: 'Total Perputaran Bruto (GMV)', value: this.formatRupiah(report.totalGMV) },
      { label: 'Total Transaksi', value: `${report.totalOrders} Order` },
      { label: 'Transaksi Sukses', value: `${report.completedCount} Selesai` }
    ];

    const headers = ['No. Booking', 'Tanggal', 'Penjual', 'Pembeli', 'Komoditas', 'Volume', 'Total Nilai (Rp)', 'Status'];
    const rows = report.orders.map(o => [
      o.bookingCode,
      (o.createdAt || '').substring(0, 10),
      o.sellerName,
      o.buyerName,
      o.productTitle,
      `${o.quantity} ${o.unit}`,
      this.formatRupiah(o.totalPrice),
      o.bookingStatus || 'Selesai'
    ]);

    this.generateAndTriggerPrint(
      'LAPORAN PENJUALAN DAN PEMBELIAN PLATFORM SIRKULAR',
      'Pusat Kontrol Pengelola (Admin Dashboard) BURSA LIMBAH',
      `Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`,
      kpis,
      headers,
      rows
    );
  }

  // ================= 12. UNIVERSAL DELIVERY DETAILS & PRINT ENGINE =================
  showDeliveryDetailsModal(orderId) {
    const order = this.store.getOrderById(orderId);
    if (!order) return;

    const d = order.deliveryDetails || {};
    const isThirdParty = d.dispatchType === 'third_party';
    const body = [REDACTED]'delivery-details-body');
    if (!body) return;

    body.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
        <div class="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
          <span>${this._escHtml(order.productTitle)}</span>
          <span class="font-mono text-brand-700">${esc(order.bookingCode)}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 pt-1 text-[11px]">
          <div><span class="text-slate-400">Pembeli:</span> <div class="font-semibold">${this._escHtml(order.buyerName)}</div></div>
          <div><span class="text-slate-400">Penjual:</span> <div class="font-semibold">${this._escHtml(order.sellerName)}</div></div>
          <div><span class="text-slate-400">Volume:</span> <div class="font-mono font-bold">${Number(order.quantity).toLocaleString('id-ID')} ${order.unit}</div></div>
          <div><span class="text-slate-400">Total Transaksi:</span> <div class="font-mono font-bold text-emerald-700">${this.formatRupiah(order.totalPrice)}</div></div>
        </div>
      </div>

      <div class="p-4 ${isThirdParty ? 'bg-blue-50/70 border-blue-200' : 'bg-emerald-50/70 border-emerald-200'} rounded-2xl border space-y-2.5 text-xs">
        <div class="flex items-center gap-2 font-bold ${isThirdParty ? 'text-blue-900' : 'text-emerald-900'}">
          <i class="fa-solid ${isThirdParty ? 'fa-truck-fast' : 'fa-handshake'}"></i>
          <span>${isThirdParty ? 'Pengiriman via Pihak ke-3 / Ekspedisi' : 'Serah Terima Langsung di Depo'}</span>
        </div>
        <div class="space-y-1.5 text-[11px] text-slate-700">
          <div class="flex justify-between">
            <span class="text-slate-500">Nama Ekspedisi / Metode:</span>
            <span class="font-bold">${this._escHtml(d.courierName || 'Mitra Logistik')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">No. Resi / Surat Jalan:</span>
            <span class="font-mono font-bold text-slate-900">${this._escHtml(d.trackingNumber || '-')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Waktu Kirim / Serah:</span>
            <span class="font-mono">${d.dispatchedAt || '-'}</span>
          </div>
          ${d.handoverRecipient ? `
            <div class="flex justify-between">
              <span class="text-slate-500">Penerima di Lokasi:</span>
              <span class="font-bold">${this._escHtml(d.handoverRecipient)}</span>
            </div>
          ` : ''}
          ${d.notes ? `
            <div class="pt-1.5 border-t border-slate-200 text-slate-600">
              <span class="font-semibold text-slate-700">Catatan:</span> ${this._escHtml(d.notes)}
            </div>
          ` : ''}
        </div>
      </div>

      ${order.sellerHandoverQr ? `
        <div class="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1.5">
          <div class="text-[11px] font-bold text-slate-700"><i class="fa-solid fa-qrcode mr-1 text-emerald-600"></i>Kode QR Serah Terima Penjual</div>
          <div class="font-mono text-xs font-bold text-slate-900 bg-slate-50 py-1 px-3 rounded-lg inline-block border border-slate-200">${esc(order.sellerHandoverQr)}</div>
        </div>
      ` : ''}

      ${d.proofImage ? `
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Bukti Foto Pengiriman / Dokumen Muatan</label>
          <img src="${d.proofImage}" alt="Bukti Pengiriman" class="w-full max-h-48 object-cover rounded-xl border border-slate-200 shadow-2xs">
        </div>
      ` : ''}
    `;

    const modal = [REDACTED]'modal-delivery-details');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  generateAndTriggerPrint(title, subtitle, meta, kpis, headers, rows) {
    const wrapper = [REDACTED]'printable-report-wrapper');
    const container = [REDACTED]'printable-report-content');
    if (!wrapper || !container) {
      window.print();
      return;
    }

    container.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 24px; max-width: 900px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; color: #059669;">BURSA LIMBAH</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">PLATFORM PERDAGANGAN SIRKULAR &amp; REKENING BERSAMA ESCROW</div>
            <div style="font-size: 14px; font-weight: 800; margin-top: 8px;">${this._escHtml(title)}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${this._escHtml(subtitle)}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>${this._escHtml(meta)}</div>
            <div style="margin-top: 4px; font-weight: bold; color: #0f172a;">Dokumen Resmi Terverifikasi</div>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(${kpis.length}, 1fr); gap: 12px; margin-bottom: 24px;">
          ${kpis.map(k => `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
              <div style="font-size: 10px; color: #64748b; font-weight: bold;">${this._escHtml(k.label)}</div>
              <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 4px;">${this._escHtml(k.value)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Table Data -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              ${headers.map(h => `<th style="padding: 8px 6px; font-weight: bold; color: #334155; text-transform: uppercase;">${this._escHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#fcfcfc'};">
                ${row.map(cell => `<td style="padding: 7px 6px; color: #1e293b;">${this._escHtml(String(cell))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
          <div>Sistem Terintegrasi Bursa Limbah Indonesia • www.bursalimbah.id</div>
          <div>Dicetak secara otomatis melalui Pusat Kontrol Bursa Limbah</div>
        </div>
      </div>
    `;

    wrapper.classList.remove('hidden');
    window.print();
    setTimeout(() => {
      wrapper.classList.add('hidden');
    }, 1000);
  }

  renderSellerProductsTable() {
    const container = [REDACTED]'seller-products-table-container');
    if (!container) return;

    const user = this.store.getCurrentUser();
    const products = this.store.getProducts({ sellerId: user ? user.id : 'user_seller_1' });

    if (products.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-solid fa-boxes-packing text-3xl mb-2"></i>
          <p>Belum ada pasokan limbah yang diunggah.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
          <tr>
            <th class="p-3">Kode</th>
            <th class="p-3">Judul & Kategori</th>
            <th class="p-3">Volume</th>
            <th class="p-3">Harga Satuan</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${products.map(p => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-mono font-bold">${esc(p.code)}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${esc(p.title)}</div>
                <div class="text-[11px] text-slate-500">${esc(p.categoryName)}</div>
                ${p.sourceType ? `
                  <span class="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    p.sourceType === 'source_household' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    p.sourceType === 'source_medium_industry' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-amber-50 text-amber-800 border border-amber-200'
                  }">
                    ${p.sourceType === 'source_household' ? '🏠 Rumah Tangga' : p.sourceType === 'source_medium_industry' ? '🏢 Industri Menengah' : '🏭 Industri Besar'}
                  </span>
                ` : ''}
              </td>
              <td class="p-3">${p.volume > 0 ? p.volume + ' L' : p.weight + ' Kg'}</td>
              <td class="p-3 font-mono">${this.formatRupiah(p.offerPrice)}</td>
              <td class="p-3 font-mono font-bold text-emerald-700">${this.formatRupiah(p.totalPrice)}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                  ${p.status === 'approved' ? 'Tayang di Bursa' : 'Menunggu Kurasi'}
                </span>
              </td>
              <td class="p-3 text-right">
                <button onclick="app.showProductDetail('${p.id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                  Lihat
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  selectSourceTier(tierId) {
    const tier = (typeof WASTE_SOURCE_TIERS !== 'undefined' ? WASTE_SOURCE_TIERS : []).find(t => t.id === tierId);
    if (!tier) return;

    const sourceInput = [REDACTED]'up-source-type');
    if (sourceInput) sourceInput.value = tierId;

    // Highlight kartu yang dipilih
    const cards = [
      { id: 'source-card-household', tierId: 'source_household', ring: 'ring-emerald-500/30', border: 'border-emerald-500', bg: 'bg-emerald-50/40' },
      { id: 'source-card-medium', tierId: 'source_medium_industry', ring: 'ring-blue-500/30', border: 'border-blue-500', bg: 'bg-blue-50/40' },
      { id: 'source-card-large', tierId: 'source_large_industry', ring: 'ring-amber-500/30', border: 'border-amber-500', bg: 'bg-amber-50/40' }
    ];

    cards.forEach(c => {
      const el = [REDACTED]c.id);
      if (!el) return;
      el.classList.remove('ring-4', 'ring-emerald-500/30', 'ring-blue-500/30', 'ring-amber-500/30', 'border-emerald-500', 'border-blue-500', 'border-amber-500', 'bg-emerald-50/40', 'bg-blue-50/40', 'bg-amber-50/40');
      if (c.tierId === tierId) {
        el.classList.add('ring-4', c.ring, c.border, c.bg);
        el.classList.remove('border-slate-200', 'bg-white');
      } else {
        el.classList.add('border-slate-200', 'bg-white');
      }
    });

    // Tampilkan pesan panduan / hint
    const hint = [REDACTED]'up-source-hint');
    const hintText = [REDACTED]'up-source-hint-text');
    if (hint && hintText) {
      hint.classList.remove('hidden');
      if (tierId === 'source_household') {
        hint.className = 'mt-2 text-center text-[11px] text-emerald-700 font-semibold bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-200';
        hintText.innerHTML = `Mode <strong>${esc(tier.name)}</strong> aktif: Pengisian disederhanakan untuk perorangan/bank sampah (wadah kecil, MOQ 5 Kg, tanpa izin industri).`;
      } else if (tierId === 'source_medium_industry') {
        hint.className = 'mt-2 text-center text-[11px] text-blue-700 font-semibold bg-blue-50 py-1.5 px-3 rounded-xl border border-blue-200';
        hintText.innerHTML = `Mode <strong>${esc(tier.name)}</strong> aktif: Opsi wadah drum/jerigen, field NIB UMKM, dan MOQ standar 50 Kg.`;
      } else {
        hint.className = 'mt-2 text-center text-[11px] text-amber-800 font-semibold bg-amber-50 py-1.5 px-3 rounded-xl border border-amber-200';
        hintText.innerHTML = `Mode <strong>${esc(tier.name)}</strong> aktif: Skala pabrik/korporat dengan wadah kontainer/IBC, verifikasi NIB & No. Izin TPS/KLHK, dan tonnase MOQ 500 Kg.`;
      }
    }

    // Tampilkan field formulir
    const formFields = [REDACTED]'up-form-fields');
    if (formFields) formFields.classList.remove('hidden');

    // Populate Wadah Kemasan Dinamis
    const containerSelect = [REDACTED]'up-container-type');
    if (containerSelect && tier.containers) {
      containerSelect.innerHTML = tier.containers.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Kebutuhan eviden mengikuti skala sumber limbah: rumah tangga 1, menengah 2, besar 3.
    const household = tierId === 'source_household';
    const mediumIndustry = tierId === 'source_medium_industry';
    const evidenceHeading = [REDACTED]'up-evidence-heading');
    const evidenceGrid = [REDACTED]'up-evidence-grid');
    ['2', '3'].forEach(slot => {
      const card = [REDACTED]`up-evidence-slot-${slot}`);
      const input = [REDACTED]`up-foto-${slot}`);
      const hideSlot = household || (mediumIndustry && slot === '3');
      if (card) card.classList.toggle('hidden', hideSlot);
      if (hideSlot && input) input.value = '';
    });
    if (evidenceHeading) evidenceHeading.textContent = household
      ? '1 Foto Eviden Wadah (Wajib untuk Rumah Tangga)'
      : mediumIndustry
        ? '2 Foto Eviden: Fisik Keseluruhan & Sampel (Wajib)'
        : '3 Foto Eviden Fisik & Tera Digital (Wajib)';
    if (evidenceGrid) {
      evidenceGrid.classList.toggle('grid-cols-1', household);
      evidenceGrid.classList.toggle('grid-cols-2', mediumIndustry);
      evidenceGrid.classList.toggle('grid-cols-3', !household && !mediumIndustry);
    }

    // Populate Satuan Dinamis
    const unitSelect = [REDACTED]'up-unit');
    if (unitSelect && tier.units) {
      unitSelect.innerHTML = tier.units.map(u => `<option value="${u}">${u}</option>`).join('');
      unitSelect.value = tier.defaultUnit;
    }

    // Populate Kondisi Fisik Dinamis
    const condSelect = [REDACTED]'up-condition');
    if (condSelect && tier.conditions) {
      condSelect.innerHTML = tier.conditions.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
    }

    // Populate Jadwal Pengambilan Dinamis
    const schedSelect = [REDACTED]'up-pickup-schedule');
    if (schedSelect && tier.schedules) {
      schedSelect.innerHTML = tier.schedules.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
    }

    // Placeholder & Nilai Bawaan
    const titleInput = [REDACTED]'up-title');
    if (titleInput && tier.placeholders.title) titleInput.placeholder = tier.placeholders.title;

    const originInput = [REDACTED]'up-origin');
    if (originInput && tier.placeholders.origin) originInput.placeholder = tier.placeholders.origin;

    const cityInput = [REDACTED]'up-city');
    if (cityInput && tier.placeholders.city) cityInput.placeholder = tier.placeholders.city;

    const qtyInput = [REDACTED]'up-qty');
    if (qtyInput) qtyInput.value = tier.defaultQty;

    const priceInput = [REDACTED]'up-price');
    if (priceInput) priceInput.value = tier.defaultPrice;

    const minOrderInput = [REDACTED]'up-min-order');
    if (minOrderInput) minOrderInput.value = tier.defaultMOQ;

    const minOrderUnit = [REDACTED]'up-min-order-unit');
    if (minOrderUnit) minOrderUnit.textContent = tier.defaultUnit;

    this.calculateUploadTotal();

    // Toggle Kondisional: Grade
    const gradeBox = [REDACTED]'up-grade-box');
    const gradeInput = [REDACTED]'up-grade');
    if (gradeBox && gradeInput) {
      if (tier.showFields.grade) {
        gradeBox.classList.remove('hidden');
        gradeInput.placeholder = tier.placeholders.grade || 'Grade Standar Industri';
        if (gradeInput.value.includes('Rumah Tangga') || !gradeInput.value) {
          gradeInput.value = '';
        }
      } else {
        gradeBox.classList.add('hidden');
        gradeInput.value = 'Limbah Rumah Tangga (Non-Spesifikasi)';
      }
    }

    // Toggle Kondisional: Limbah B3
    const b3Section = [REDACTED]'up-b3-section');
    const b3Check = [REDACTED]'up-is-b3');
    const b3PermitBox = [REDACTED]'up-b3-permit-box');
    if (b3Section) {
      if (tier.showFields.b3) {
        b3Section.classList.remove('hidden');
      } else {
        b3Section.classList.add('hidden');
        if (b3Check) b3Check.checked = false;
        if (b3PermitBox) b3PermitBox.classList.add('hidden');
      }
    }

    // Toggle Kondisional: NIB & TPS (Industri)
    const indFields = [REDACTED]'up-industry-fields');
    const nibBox = [REDACTED]'up-nib-box');
    const tpsBox = [REDACTED]'up-tps-box');
    if (indFields) {
      const showAnyInd = tier.showFields.nib || tier.showFields.tpsPermit;
      indFields.classList.toggle('hidden', !showAnyInd);
      if (nibBox) nibBox.classList.toggle('hidden', !tier.showFields.nib);
      if (tpsBox) tpsBox.classList.toggle('hidden', !tier.showFields.tpsPermit);
    }

    // Toggle Kondisional: GPS
    const coordsBox = [REDACTED]'up-coords-box');
    const locGrid = [REDACTED]'up-location-grid');
    if (coordsBox) {
      if (tier.showFields.gps) {
        coordsBox.classList.remove('hidden');
        if (locGrid) {
          locGrid.classList.remove('grid-cols-2');
          locGrid.classList.add('grid-cols-3');
        }
      } else {
        coordsBox.classList.add('hidden');
        if (locGrid) {
          locGrid.classList.remove('grid-cols-3');
          locGrid.classList.add('grid-cols-2');
        }
      }
    }
  }

  resetUploadForm() {
    const sourceInput = [REDACTED]'up-source-type');
    if (sourceInput) sourceInput.value = '';

    ['source-card-household', 'source-card-medium', 'source-card-large'].forEach(id => {
      const el = [REDACTED]id);
      if (el) {
        el.classList.remove('ring-4', 'ring-emerald-500/30', 'ring-blue-500/30', 'ring-amber-500/30', 'border-emerald-500', 'border-blue-500', 'border-amber-500', 'bg-emerald-50/40', 'bg-blue-50/40', 'bg-amber-50/40');
        el.classList.add('border-slate-200', 'bg-white');
      }
    });

    const hint = [REDACTED]'up-source-hint');
    if (hint) hint.classList.add('hidden');

    const formFields = [REDACTED]'up-form-fields');
    if (formFields) formFields.classList.add('hidden');
  }

  showUploadModal() {
    this.switchAppTab('sell');
  }

  requestGpsLocation() {
    const modal = [REDACTED]'modal-gps-location');
    const status = [REDACTED]'gps-location-status');
    const confirm = [REDACTED]'gps-location-confirm');
    if (!modal) return;
    if (!navigator.geolocation) {
      this.showToast('Perangkat atau browser ini tidak mendukung pengambilan lokasi GPS.', 'error');
      return;
    }
    if (status) {
      status.classList.add('hidden');
      status.textContent = '';
    }
    if (confirm) {
      confirm.disabled = false;
      confirm.classList.remove('opacity-60', 'cursor-not-allowed');
      confirm.innerHTML = '<i class="fa-solid fa-location-dot mr-1"></i>Izinkan & Ambil Lokasi';
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  async submitReceivingEvidence(event, orderId) {
    event.preventDefault();
    const weightInput = [REDACTED]'receipt-actual-weight');
    const proofInput = [REDACTED]'receipt-weighing-proof');
    const submitButton = event.submitter;
    try {
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Menyimpan…'; }
      let proof = null;
      if (proofInput?.files?.[0]) proof = await this.store.uploadWeighingProof(proofInput.files[0]);
      this.store.recordReceivingEvidence(orderId, weightInput.value, proof);
      this.showBookingReceipt(orderId);
      this.showToast('Data penerimaan tersimpan. Scan QR Code kini dapat dilakukan.', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
      if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = '<i class="fa-solid fa-cloud-arrow-up mr-1"></i>Simpan Data Penerimaan'; }
    }
  }

  scanOrderQr(orderId) {
    const order = this.store.getOrderById(orderId);
    if (!order?.qrCompletionReady) {
      this.showToast('Simpan data penerimaan sebelum melakukan scan QR.', 'warning');
      return;
    }
    const scannedCode = window.prompt('Scan QR menggunakan pemindai Anda, lalu masukkan kode hasil scan untuk verifikasi:', '');
    if (scannedCode === null) return;
    if (scannedCode.trim() !== order.qrCodeTrace) {
      this.showToast('Kode QR tidak sesuai dengan transaksi ini.', 'error');
      return;
    }
    this.store.completeOrder(orderId);
    this.closeModals();
    this.renderBuyerOrders();
    this.showToast('QR valid. Transaksi selesai dan dana diproses kepada penjual.', 'success');
  }

  closeGpsLocationModal() {
    const modal = [REDACTED]'modal-gps-location');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  captureGpsLocation() {
    const status = [REDACTED]'gps-location-status');
    const confirm = [REDACTED]'gps-location-confirm');
    if (!navigator.geolocation) return;
    if (status) {
      status.textContent = 'Meminta izin dan mengambil titik GPS…';
      status.classList.remove('hidden');
    }
    if (confirm) {
      confirm.disabled = true;
      confirm.classList.add('opacity-60', 'cursor-not-allowed');
      confirm.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>Mengambil lokasi…';
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords = [REDACTED]'up-coords');
        if (coords) coords.value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        this.closeGpsLocationModal();
        this.showToast(`Titik GPS berhasil diisi (akurasi ±${Math.round(position.coords.accuracy)} m).`, 'success');
      },
      error => {
        const messages = {
          1: 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser untuk mengambil titik GPS.',
          2: 'Lokasi tidak tersedia. Pastikan GPS/perangkat Anda aktif dan coba lagi.',
          3: 'Pengambilan lokasi melebihi batas waktu. Coba lagi di area dengan sinyal lebih baik.'
        };
        if (status) {
          status.textContent = messages[error.code] || 'Titik GPS gagal diambil. Silakan coba lagi.';
          status.classList.remove('hidden');
        }
        if (confirm) {
          confirm.disabled = false;
          confirm.classList.remove('opacity-60', 'cursor-not-allowed');
          confirm.innerHTML = '<i class="fa-solid fa-rotate-right mr-1"></i>Coba Lagi';
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  handleEvidenceFileSelect(input, slot) {
    const file = input.files && input.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      input.value = '';
      this.showToast('Gunakan gambar JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.', 'error');
      return;
    }

    const label = [REDACTED]`up-foto-${slot}-label`);
    if (label) label.innerHTML = '<i class="fa-solid fa-circle-check"></i> ' + file.name;
  }

  async handleUploadProduct(event) {
    event.preventDefault();
    const sourceType = [REDACTED]'up-source-type') ? [REDACTED]'up-source-type').value : null;
    if (!sourceType) {
      this.showToast("Pilih salah satu Sumber Limbah terlebih dahulu (Rumah Tangga, Industri Menengah, atau Industri Besar).", "warning");
      return;
    }

    const title = [REDACTED]'up-title').value;
    const catId = [REDACTED]'up-category').value;
    const containerType = [REDACTED]'up-container-type').value;
    const containerQty = [REDACTED]'up-container-qty').value;
    const qty = Number([REDACTED]'up-qty').value);
    const unit = [REDACTED]'up-unit').value;
    const price = Number([REDACTED]'up-price').value);
    const origin = [REDACTED]'up-origin').value;
    const city = [REDACTED]'up-city') ? [REDACTED]'up-city').value.trim() : '';
    const address = [REDACTED]'up-address').value;
    const coords = [REDACTED]'up-coords') ? [REDACTED]'up-coords').value.split(',') : ['-6.2088', '106.8456'];

    // Atribut Sumber Limbah & Legalitas:
    const nib = [REDACTED]'up-nib') ? [REDACTED]'up-nib').value.trim() : null;
    const tpsPermit = [REDACTED]'up-tps-permit') ? [REDACTED]'up-tps-permit').value.trim() : null;

    // 10 Atribut Wajib Tambahan:
    const condition = [REDACTED]'up-condition') ? [REDACTED]'up-condition').value : 'Bersih';
    const grade = [REDACTED]'up-grade') ? [REDACTED]'up-grade').value.trim() : 'Limbah Rumah Tangga';
    const minOrder = [REDACTED]'up-min-order') ? Number([REDACTED]'up-min-order').value) : 10;
    const minOrderUnit = [REDACTED]'up-min-order-unit') ? [REDACTED]'up-min-order-unit').textContent.trim() : unit;
    const pickupSchedule = [REDACTED]'up-pickup-schedule') ? [REDACTED]'up-pickup-schedule').value : 'Siap Angkut Segera (H+0 s/d H+1)';
    const listingStatus = [REDACTED]'up-listing-status') ? [REDACTED]'up-listing-status').value : 'Tersedia';
    const isB3Check = [REDACTED]'up-is-b3');
    const isB3 = isB3Check ? isB3Check.checked : false;
    const b3Permit = [REDACTED]'up-b3-permit') ? [REDACTED]'up-b3-permit').value.trim() : null;

    const requiredEvidenceSlots = sourceType === 'source_household'
      ? [1]
      : sourceType === 'source_medium_industry' ? [1, 2] : [1, 2, 3];
    const evidenceFiles = requiredEvidenceSlots
      .map(slot => ([REDACTED]`up-foto-${slot}`) || {}).files?.[0])
      .filter(Boolean);
    if (evidenceFiles.length !== requiredEvidenceSlots.length) {
      this.showToast(sourceType === 'source_household'
        ? 'Unggah satu foto eviden wadah untuk limbah rumah tangga.'
        : sourceType === 'source_medium_industry'
          ? 'Lengkapi dua foto eviden: fisik keseluruhan dan sampel material.'
          : 'Lengkapi tiga foto eviden: wadah, sampel material, dan struk timbangan.', 'warning');
      return;
    }

    let uploadedEvidences;
    try {
      uploadedEvidences = await this.store.uploadProductEvidences(evidenceFiles);
    } catch (error) {
      this.showToast(error.message, 'error');
      return;
    }

    const cat = this.store.getCategoryById(catId);
    const user = this.store.getCurrentUser();

    this.store.addProduct({
      title,
      categoryId: catId,
      categoryName: cat ? cat.name : "Limbah Industri",
      sellerId: user ? user.id : 'user_seller_1',
      sellerName: user ? user.name : "Sentra Jelantah Sejahtera",
      sellerType: "Pemasok Terverifikasi",
      sellerPhone: user ? user.phone : "+62 813-8822-1100",
      sellerWhatsapp: "6281388221100",
      containerType,
      containerQty,
      weight: unit === 'Liter' ? 0 : qty,
      volume: unit === 'Liter' ? qty : 0,
      unit,
      // Sumber Limbah & Atribut:
      sourceType,
      nib,
      tpsPermit,
      condition,
      grade,
      minimumOrder: minOrder,
      minimumOrderUnit: minOrderUnit,
      pickupSchedule,
      listingStatus,
      isB3: Boolean(isB3 || (cat && cat.isB3)),
      b3PermitNumber: b3Permit,
      origin,
      city: city || this.store.extractCity(address || origin),
      address,
      lat: (coords && coords[0]) ? parseFloat(coords[0].trim()) : -6.2088,
      lng: (coords && coords[1]) ? parseFloat(coords[1].trim()) : 106.8456,
      offerPrice: price,
      totalPrice: qty * price,
      evidences: sourceType === 'source_household'
        ? [{ type: "Wadah Keseluruhan", url: uploadedEvidences[0].url, notes: "Eviden wadah limbah rumah tangga" }]
        : sourceType === 'source_medium_industry'
          ? [
              { type: "Fisik Keseluruhan", url: uploadedEvidences[0].url, notes: "Kondisi fisik keseluruhan material dan wadah" },
              { type: "Kualitas Sampel", url: uploadedEvidences[1].url, notes: "Sampel fisik material" }
            ]
          : [
            { type: "Wadah Keseluruhan", url: uploadedEvidences[0].url, notes: "Wadah penyimpanan tersegel baik" },
            { type: "Kualitas Sampel", url: uploadedEvidences[1].url, notes: "Sampel fisik bersih bebas pengotor" },
            { type: "Tera Timbangan", url: uploadedEvidences[2].url, notes: "Slip kalibrasi timbangan tera digital sah" }
          ]
    });

    this.closeModals();
    this.resetUploadForm();
    this.showToast("Pasokan limbah berhasil didaftarkan! Menunggu verifikasi tim pengelola.", "success");
    if (this.store.isSellerAuthenticated()) {
      this.renderSellerDashboard();
      this.setRole('seller', false);
    } else {
      this.switchAppTab('home');
    }
    this.updateAdminPendingBadge();
  }

  calculateUploadTotal() {
    const qty = Number([REDACTED]'up-qty').value) || 0;
    const price = Number([REDACTED]'up-price').value) || 0;
    const display = [REDACTED]'up-total-display');
    if (display) display.textContent = this.formatRupiah(qty * price);
  }

  // ================= 11. MODAL & UTILITAS =================
  showHelpModal() {
    const modal = [REDACTED]'modal-help');
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  toggleHelpAccordion(answerId, button) {
    const answer = [REDACTED]answerId);
    if (!answer || !button) return;

    const willOpen = answer.classList.contains('hidden');
    answer.classList.toggle('hidden', !willOpen);
    button.setAttribute('aria-expanded', String(willOpen));
    const icon = button.querySelector('.fa-chevron-down');
    if (icon) icon.classList.toggle('rotate-180', willOpen);
  }

  closeModals() {
    const modals = [
      'modal-product-detail',
      'modal-buyer-register',
      'modal-seller-register',
      'modal-register-choice',
      'modal-upload',
      'modal-checkout',
      'modal-receipt',
      'modal-google-auth',
      'modal-user-profile',
      'modal-mobile-quick-actions',
      'modal-mobile-dp-calculator',
      'modal-admin-event',
      'modal-event-registration',
      'modal-help',
      'modal-gps-location'
    ];
    modals.forEach(id => {
      const el = [REDACTED]id);
      if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
      }
    });

    if (this.activeModalMap) {
      this.activeModalMap.remove();
      this.activeModalMap = null;
    }
  }

  // ================= LOGIN DENGAN GOOGLE =================
  showGoogleLoginModal() {
    const modal = [REDACTED]'modal-google-auth');
    const role = this.currentLoginTab || 'buyer';
    const roleLabel = role === 'seller' ? 'Mitra Penjual' : (role === 'admin' ? 'Pengelola' : 'Pembeli');
    const subEl = [REDACTED]'google-modal-role-subtitle');
    if (subEl) {
      subEl.innerHTML = `Pilih akun Google Anda untuk masuk atau daftar sebagai <strong>${roleLabel}</strong>:`;
    }
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  closeGoogleLoginModal() {
    const modal = [REDACTED]'modal-google-auth');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  async proceedGoogleLogin(email, name, avatar) {
    this.closeGoogleLoginModal();
    const role = this.currentLoginTab || 'buyer';
    const res = await this.store.loginWithGoogleAsync({ email, name, avatar, role });

    if (res.success) {
      this.triggerConfetti();
      this.updateNavUI();
      if (res.role === 'buyer') {
        this.setRole('buyer');
      } else if (res.role === 'seller') {
        this.setRole('seller');
      }
      if (res.isNewAccount) {
        this.showToast(`🎉 Pendaftaran berhasil! Masuk dengan Google sebagai ${res.role === 'seller' ? 'Mitra Penjual' : 'Pembeli'} (${email}).`, 'success');
      } else {
        this.showToast(`🎉 Berhasil masuk dengan Google (${email})!`, 'success');
      }
    } else {
      this.showToast('Gagal masuk dengan Google. Silakan coba lagi.', 'error');
    }
  }

  async proceedCustomGoogleLogin() {
    const input = [REDACTED]'custom-google-email');
    const email = input ? input.value.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) {
      this.showToast('Masukkan alamat email Google yang valid.', 'error');
      return;
    }
    const namePart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
    const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    await this.proceedGoogleLogin(email, displayName, null);
  }

  // ================= MODAL PROFIL & VERIFIKASI IDENTITAS (KTP / NPWP OPSIONAL) =================
  showUserProfileModal() {
    const user = this.store.getCurrentUser();
    if (!user) {
      this.showLoginPage();
      return;
    }

    const modal = [REDACTED]'modal-user-profile');
    if (!modal) return;

    // Set Avatar & Info
    const avatarWrap = [REDACTED]'prof-avatar-wrap');
    const avatarInitial = [REDACTED]'prof-avatar-initial');
    const displayName = [REDACTED]'prof-display-name');
    const roleBadge = [REDACTED]'prof-role-badge');
    const googleBadge = [REDACTED]'prof-google-badge');
    const emailText = [REDACTED]'prof-email-text');
    const verifiedIcon = [REDACTED]'prof-verified-badge-icon');
    const verifyStatusPill = [REDACTED]'prof-verification-status-pill');
    const verifyStatusText = [REDACTED]'prof-verification-status-text');

    if (displayName) displayName.textContent = user.name || 'Pengguna Bursa Limbah';
    if (emailText) emailText.textContent = user.email || '-';

    // Inisial atau Foto
    if (avatarWrap) {
      if (user.avatar) {
        avatarWrap.innerHTML = `<img src="${user.avatar}" alt="${esc(user.name)}" class="w-full h-full object-cover">`;
      } else {
        const initial = (user.name || 'U').charAt(0).toUpperCase();
        avatarWrap.innerHTML = `<span id="prof-avatar-initial">${initial}</span>`;
      }
    }

    // Role badge
    if (roleBadge) {
      const roleNames = { buyer: 'PEMBELI RESMI', seller: 'MITRA PENJUAL', admin: 'PENGELOLA UTAMA' };
      roleBadge.textContent = roleNames[user.role] || user.role.toUpperCase();
    }

    // Google badge
    if (googleBadge) {
      if (user.authProvider === 'google') {
        googleBadge.classList.remove('hidden');
        googleBadge.classList.add('inline-flex');
      } else {
        googleBadge.classList.add('hidden');
        googleBadge.classList.remove('inline-flex');
      }
    }

    // Verification status badge
    const isVerified = user.identityVerified === true || user.verificationStatus === 'verified';
    if (verifiedIcon) {
      verifiedIcon.style.display = isVerified ? 'flex' : 'none';
    }
    if (verifyStatusPill && verifyStatusText) {
      if (isVerified) {
        verifyStatusPill.className = 'mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        verifyStatusText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> ${esc(user.verifiedBadge || 'Mitra Terverifikasi Resmi')}`;
      } else {
        verifyStatusPill.className = 'mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
        verifyStatusText.innerHTML = `<i class="fa-solid fa-shield"></i> Belum Diverifikasi (Opsional)`;
      }
    }

    // Isi Nilai Formulir Profil
    const inputName = [REDACTED]'prof-input-name');
    const inputCompany = [REDACTED]'prof-input-company');
    const inputEmail = [REDACTED]'prof-input-email');
    const inputPhone = [REDACTED]'prof-input-phone');
    const inputLocation = [REDACTED]'prof-input-location');
    const inputBank = [REDACTED]'prof-input-bank');

    if (inputName) inputName.value = user.name || '';
    if (inputCompany) inputCompany.value = user.company || '';
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputPhone) inputPhone.value = user.phone || '';
    if (inputLocation) inputLocation.value = user.location || '';
    if (inputBank) inputBank.value = user.bankAccount || '';

    // Isi Nilai Verifikasi Jika Ada
    const inputKtp = [REDACTED]'verify-ktp-number');
    const inputNpwp = [REDACTED]'verify-npwp-number');
    if (inputKtp) inputKtp.value = user.ktpNumber || '';
    if (inputNpwp) inputNpwp.value = user.npwpNumber || '';

    // Rincian Tab Langganan jika Pembeli
    const tierPill = [REDACTED]'prof-tier-pill');
    const tierTitle = [REDACTED]'prof-tier-title');
    const tierDesc = [REDACTED]'prof-tier-desc');
    const tierBtnTab = [REDACTED]'prof-tab-btn-tier');

    if (user.role === 'buyer') {
      if (tierBtnTab) tierBtnTab.style.display = '';
      const tier = this.store.getSubscriptionTierById(user.subscriptionTier || 'tier_starter');
      if (tier) {
        if (tierPill) tierPill.textContent = tier.name;
        if (tierTitle) tierTitle.textContent = tier.name;
        if (tierDesc) tierDesc.textContent = tier.description || `Melihat harga: ${tier.minPriceLimit ? 'Rp ' + Number(tier.minPriceLimit).toLocaleString('id-ID') : 'Rp 1'} s/d ${tier.maxPriceLimit ? 'Rp ' + Number(tier.maxPriceLimit).toLocaleString('id-ID') : 'Tanpa Batas'}.`;
      }
    } else {
      if (tierBtnTab) tierBtnTab.style.display = 'none';
    }

    // Show/hide seller payment tab and populate payment fields
    const paymentTabBtn = [REDACTED]'prof-tab-btn-payment');
    const buyerBankGroup = [REDACTED]'prof-group-buyer-bank');
    if (buyerBankGroup) {
      buyerBankGroup.style.display = user.role === 'seller' ? 'none' : '';
    }

    if (user.role === 'seller') {
      if (paymentTabBtn) { paymentTabBtn.style.display = ''; paymentTabBtn.classList.remove('hidden'); }
      const pm = user.paymentMethods || {};
      const cash = pm.cash || {};
      const bt = pm.bankTransfer || {};
      const qris = pm.qris || {};

      const setEl = (id, val) => { const e = [REDACTED]id); if (e) e.value = val || ''; };
      const setChk = (id, val) => { const e = [REDACTED]id); if (e) e.checked = !!val; };

      setChk('seller-pay-cash-enabled', cash.enabled);
      setEl('seller-pay-cash-notes', cash.notes);
      setChk('seller-pay-bank-enabled', bt.enabled);
      setEl('seller-pay-bank-name', bt.bankName);
      setEl('seller-pay-bank-account', bt.accountNumber);
      setEl('seller-pay-bank-holder', bt.accountHolder);
      setChk('seller-pay-qris-enabled', qris.enabled);
      setEl('seller-pay-qris-merchant', qris.merchantName);

      // QRIS image preview
      const qrisImageUrl = [REDACTED]'seller-pay-qris-image-url');
      const qrisPreviewImg = [REDACTED]'seller-qris-preview-img');
      const qrisPlaceholder = [REDACTED]'seller-qris-placeholder');
      const qrisRemoveBtn = [REDACTED]'btn-remove-seller-qris');
      if (qrisImageUrl) qrisImageUrl.value = qris.imageUrl || '';
      if (qris.imageUrl) {
        if (qrisPreviewImg) { qrisPreviewImg.src = qris.imageUrl; qrisPreviewImg.classList.remove('hidden'); }
        if (qrisPlaceholder) qrisPlaceholder.classList.add('hidden');
        if (qrisRemoveBtn) qrisRemoveBtn.classList.remove('hidden');
      } else {
        if (qrisPreviewImg) { qrisPreviewImg.src = ''; qrisPreviewImg.classList.add('hidden'); }
        if (qrisPlaceholder) qrisPlaceholder.classList.remove('hidden');
        if (qrisRemoveBtn) qrisRemoveBtn.classList.add('hidden');
      }
    } else {
      if (paymentTabBtn) { paymentTabBtn.style.display = 'none'; paymentTabBtn.classList.add('hidden'); }
    }

    this.switchProfileTab('info');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeUserProfileModal() {
    const modal = [REDACTED]'modal-user-profile');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  switchProfileTab(tabName) {
    const tabs = ['info', 'payment', 'verify', 'tier'];
    tabs.forEach(t => {
      const btn = [REDACTED]`prof-tab-btn-${t}`);
      const content = [REDACTED]`prof-tab-content-${t}`);
      if (btn && content) {
        if (t === tabName) {
          btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-sm transition shrink-0 flex items-center space-x-1.5';
          content.classList.remove('hidden');
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition shrink-0 flex items-center space-x-1.5';
          content.classList.add('hidden');
        }
      }
    });
  }

  handleSaveProfile(event) {
    event.preventDefault();
    const user = this.store.getCurrentUser();
    if (!user) return;

    const name = [REDACTED]'prof-input-name').value.trim();
    const company = [REDACTED]'prof-input-company').value.trim();
    const phone = [REDACTED]'prof-input-phone').value.trim();
    const location = [REDACTED]'prof-input-location').value.trim();
    const bankAccount = [REDACTED]'prof-input-bank').value.trim();

    try {
      this.store.updateUserProfile(user.id, { name, company, phone, location, bankAccount });
      this.showToast('Data profil berhasil diperbarui!', 'success');
      this.updateNavUI();
      if (user.role === 'buyer') this.renderBuyerMarketplace();
      if (user.role === 'seller') this.renderSellerDashboard();
      this.closeUserProfileModal();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  handleSaveSellerPaymentSettings(event) {
    event.preventDefault();
    const user = this.store.getCurrentUser();
    if (!user || user.role !== 'seller') return;

    const getVal = id => { const e = [REDACTED]id); return e ? e.value.trim() : ''; };
    const getChk = id => { const e = [REDACTED]id); return e ? e.checked : false; };

    const paymentMethods = {
      cash: {
        enabled: getChk('seller-pay-cash-enabled'),
        notes: getVal('seller-pay-cash-notes')
      },
      bankTransfer: {
        enabled: getChk('seller-pay-bank-enabled'),
        bankName: getVal('seller-pay-bank-name'),
        accountNumber: getVal('seller-pay-bank-account'),
        accountHolder: getVal('seller-pay-bank-holder')
      },
      qris: {
        enabled: getChk('seller-pay-qris-enabled'),
        merchantName: getVal('seller-pay-qris-merchant'),
        imageUrl: getVal('seller-pay-qris-image-url')
      }
    };

    try {
      this.store.updateUserProfile(user.id, { paymentMethods });
      this.showToast('Pengaturan pembayaran berhasil disimpan!', 'success');
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  handleSellerQrisFileSelect(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.showToast('Hanya file gambar yang diperbolehkan untuk QR Code.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const imgUrlInput = [REDACTED]'seller-pay-qris-image-url');
      const previewImg = [REDACTED]'seller-qris-preview-img');
      const placeholder = [REDACTED]'seller-qris-placeholder');
      const removeBtn = [REDACTED]'btn-remove-seller-qris');
      if (imgUrlInput) imgUrlInput.value = dataUrl;
      if (previewImg) { previewImg.src = dataUrl; previewImg.classList.remove('hidden'); }
      if (placeholder) placeholder.classList.add('hidden');
      if (removeBtn) removeBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  removeSellerQrisImage() {
    const imgUrlInput = [REDACTED]'seller-pay-qris-image-url');
    const previewImg = [REDACTED]'seller-qris-preview-img');
    const placeholder = [REDACTED]'seller-qris-placeholder');
    const removeBtn = [REDACTED]'btn-remove-seller-qris');
    const fileInput = [REDACTED]'seller-pay-qris-file');
    if (imgUrlInput) imgUrlInput.value = '';
    if (previewImg) { previewImg.src = ''; previewImg.classList.add('hidden'); }
    if (placeholder) placeholder.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }


  handleVerifyTypeChange(type) {
    const ktpGroup = [REDACTED]'verify-ktp-group');
    const npwpGroup = [REDACTED]'verify-npwp-group');

    if (type === 'ktp') {
      if (ktpGroup) ktpGroup.classList.remove('hidden');
      if (npwpGroup) npwpGroup.classList.add('hidden');
    } else if (type === 'npwp') {
      if (ktpGroup) ktpGroup.classList.add('hidden');
      if (npwpGroup) npwpGroup.classList.remove('hidden');
    } else if (type === 'both') {
      if (ktpGroup) ktpGroup.classList.remove('hidden');
      if (npwpGroup) npwpGroup.classList.remove('hidden');
    }
  }


  handleVerifyFileSelect(input) {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const dropzone = [REDACTED]'verify-dropzone-content');
      const preview = [REDACTED]'verify-file-preview');
      const nameEl = [REDACTED]'verify-file-name');
      if (dropzone) dropzone.classList.add('hidden');
      if (preview) {
        preview.classList.remove('hidden');
        preview.classList.add('flex');
      }
      if (nameEl) nameEl.textContent = file.name;
    }
  }

  async handleSubmitVerification(event) {
    event.preventDefault();
    const user = this.store.getCurrentUser();
    if (!user) return;

    const radios = document.getElementsByName('verify-doc-type');
    let selectedType = 'ktp';
    radios.forEach(r => { if (r.checked) selectedType = r.value; });

    const ktpNumber = ([REDACTED]'verify-ktp-number') || {}).value || '';
    const npwpNumber = ([REDACTED]'verify-npwp-number') || {}).value || '';

    let docUrl = null;
    const documentFile = ([REDACTED]'verify-file-input') || {}).files?.[0];
    if (documentFile) {
      try {
        docUrl = (await this.store.uploadIdentityDocument(documentFile)).storageKey;
      } catch (error) {
        this.showToast(error.message, 'error');
        return;
      }
    }

    try {
      this.store.submitUserVerification(user.id, {
        type: selectedType,
        ktpNumber: ktpNumber.trim(),
        npwpNumber: npwpNumber.trim(),
        docUrl
      });

      this.triggerConfetti();
      this.showToast('Selamat! Akun Anda kini resmi Terverifikasi (KTP/NPWP). Badge hijau telah aktif!', 'success');
      this.updateNavUI();
      if (user.role === 'buyer') this.renderBuyerMarketplace();
      if (user.role === 'seller') this.renderSellerDashboard();
      this.closeUserProfileModal();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  setupCalculator() {
    const catSelect = [REDACTED]'calc-category');
    const qtyInput = [REDACTED]'calc-quantity');
    const slider = [REDACTED]'calc-volume-slider');
    const priceInput = [REDACTED]'calc-price');
    const volumeDisplay = [REDACTED]'calc-volume-display');

    if (!catSelect || !qtyInput || !priceInput) return;

    const categories = this.store.getCategories();
    catSelect.innerHTML = categories.map(c => `
      <option value="${c.id}" data-price="${c.avgPrice}" data-unit="${c.unit}">${esc(c.name)} (${this.formatRupiah(c.avgPrice)}/${c.unit})</option>
    `).join('');

    const updateCalc = () => {
      const selected = catSelect.selectedOptions[0];
      const unit = selected ? selected.getAttribute('data-unit') : 'Unit';
      const qty = Number(qtyInput.value) || 0;
      const price = Number(priceInput.value) || 0;

      const unitLabel = [REDACTED]'calc-unit-label');
      if (unitLabel) unitLabel.textContent = unit;
      if (volumeDisplay) volumeDisplay.textContent = qty.toLocaleString('id-ID');
      if (slider && Number(slider.value) !== qty && qty <= Number(slider.max)) {
        slider.value = qty;
      }

      const gross = qty * price;
      const isDp = this.store.isDpEnabled();
      const settings = this.store.getSettings();
      const dpPercent = settings.downPaymentPercent || 30;
      const dp = isDp ? Math.round(gross * (dpPercent / 100)) : 0;
      const remaining = isDp ? gross - dp : 0;

      // Hitung biaya penanganan sistem berjenjang
      let fee = 0;
      if (gross < 100000) {
        fee = 2500;
      } else if (gross < 1000000) {
        fee = 5000;
      } else if (gross < 10000000) {
        fee = 10000;
      } else {
        fee = Math.round(gross * 0.01);
      }

      [REDACTED]'calc-result-gross').textContent = this.formatRupiah(gross);

      const dpRow = [REDACTED]'calc-dp-row');
      const remRow = [REDACTED]'calc-remaining-row');
      const fullRow = [REDACTED]'calc-fullpay-row');
      const dpLabel = [REDACTED]'calc-dp-label');
      const remLabel = [REDACTED]'calc-remaining-label');

      if (isDp) {
        if (dpRow) dpRow.style.display = 'flex';
        if (remRow) remRow.style.display = 'flex';
        if (fullRow) fullRow.style.display = 'none';
        if (dpLabel) dpLabel.textContent = `Alokasi DP ${dpPercent}% Rekening Bersama:`;
        if (remLabel) remLabel.textContent = `Sisa ${100 - dpPercent}% Pelunasan di Lokasi:`;
        const resDp = [REDACTED]'calc-result-dp');
        if (resDp) resDp.textContent = this.formatRupiah(dp);
        const resRem = [REDACTED]'calc-result-remaining');
        if (resRem) resRem.textContent = this.formatRupiah(remaining);
      } else {
        if (dpRow) dpRow.style.display = 'none';
        if (remRow) remRow.style.display = 'none';
        if (fullRow) fullRow.style.display = 'flex';
      }

      const feeEl = [REDACTED]'calc-result-fee');
      if (feeEl) {
        feeEl.textContent = this.formatRupiah(fee);
        // Tambahkan keterangan tier di tooltip title
        let tierLabel = '';
        if (gross < 100000) tierLabel = '(< Rp100rb)';
        else if (gross < 1000000) tierLabel = '(Rp100rb–1jt)';
        else if (gross < 10000000) tierLabel = '(Rp1jt–10jt)';
        else tierLabel = '(1% dari nilai)';
        feeEl.title = `Tier biaya: ${tierLabel}`;
      }

      const esg = [REDACTED]'calc-result-esg');
      if (esg) esg.textContent = `Mengurangi proyeksi ${(qty * 0.85).toLocaleString('id-ID')} Kg jejak karbon (CO2e).`;
    };

    catSelect.addEventListener('change', () => {
      const selected = catSelect.selectedOptions[0];
      if (selected) priceInput.value = selected.getAttribute('data-price');
      updateCalc();
    });

    qtyInput.addEventListener('input', updateCalc);
    priceInput.addEventListener('input', updateCalc);

    if (slider) {
      slider.addEventListener('input', (e) => {
        qtyInput.value = e.target.value;
        updateCalc();
      });
    }

    updateCalc();
  }

  renderHotCategoryPills() {
    const publicHotBar = [REDACTED]'public-hot-categories-bar');
    const hotCats = this.store.getHotCategories();
    if (publicHotBar && hotCats.length > 0) {
      publicHotBar.innerHTML = hotCats.map(h => `
        <button onclick="app.filterByHotKeyword('${h.keyword}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 transition flex items-center space-x-1.5 shadow-2xs cursor-pointer active:scale-95">
          <span>${h.icon}</span>
          <span>${esc(h.name)}</span>
        </button>
      `).join('');
    }
  }

  generatePrintableReportHtml(title = 'Laporan Transaksi', contentHtml = '') {
    return `
      <div class="p-8 max-w-4xl mx-auto bg-white font-sans text-slate-900">
        <div class="border-b-2 border-brand-600 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-black text-slate-900 tracking-wider font-mono">BURSA LIMBAH</h1>
            <p class="text-xs text-slate-500">Platform Sirkular Ekonomi &amp; Rekening Bersama Limbah Terintegrasi</p>
          </div>
          <div class="text-right text-xs text-slate-500">
            <div class="font-bold text-slate-800">${title}</div>
            <div>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
          </div>
        </div>
        <div class="report-body">${contentHtml}</div>
      </div>
    `;
  }

  setCalcVolume(val) {
    const qtyInput = [REDACTED]'calc-quantity');
    const slider = [REDACTED]'calc-volume-slider');
    if (qtyInput) {
      qtyInput.value = val;
      if (slider) slider.value = val;
      qtyInput.dispatchEvent(new Event('input'));
    }
  }

  populateSelectCategories() {
    const upCat = [REDACTED]'up-category');
    const filterCat = [REDACTED]'buyer-cat-filter');
    const pills = [REDACTED]'buyer-cat-pills');
    const publicHotBar = [REDACTED]'public-hot-categories-bar');

    const categories = this.store.getCategories();
    const utama = categories.filter(c => c.group === 'utama');
    const industri = categories.filter(c => c.group === 'industri');
    const b3 = categories.filter(c => c.group === 'b3');

    const optgroupHtml = `
      <optgroup label="📦 Kategori Utama (12)">
        ${utama.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="🏭 Khusus Industri B2B (3)">
        ${industri.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="⚠️ Limbah B3 (Izin Khusus KLHK) (1)">
        ${b3.map(c => `<option value="${c.id}">${esc(c.name)} [Wajib Izin KLHK]</option>`).join('')}
      </optgroup>
    `;

    if (upCat) {
      upCat.innerHTML = optgroupHtml;
      upCat.addEventListener('change', () => {
        const sel = categories.find(c => c.id === upCat.value);
        const b3Box = [REDACTED]'up-b3-permit-box');
        const b3Check = [REDACTED]'up-is-b3');
        if (sel && sel.isB3) {
          if (b3Check) b3Check.checked = true;
          if (b3Box) b3Box.classList.remove('hidden');
        }
      });
    }

    const upUnit = [REDACTED]'up-unit');
    if (upUnit) {
      upUnit.addEventListener('change', () => {
        const moqUnit = [REDACTED]'up-min-order-unit');
        if (moqUnit) moqUnit.textContent = upUnit.value;
      });
    }

    if (filterCat) {
      filterCat.innerHTML = `<option value="all">Semua Kategori (16 Komoditas)</option>` + optgroupHtml;
    }

    // Render MVP Hot Categories (10 komoditas terlaris)
    const hotCats = this.store.getHotCategories();
    if (publicHotBar && hotCats.length > 0) {
      publicHotBar.innerHTML = hotCats.map(h => `
        <button onclick="app.filterByHotKeyword('${h.keyword}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 transition flex items-center space-x-1.5 shadow-2xs cursor-pointer active:scale-95">
          <span>${h.icon}</span>
          <span>${esc(h.name)}</span>
        </button>
      `).join('');
    }

    if (pills) {
      pills.innerHTML = `<button onclick="app.filterByPill('all')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-600 text-white">Semua (16)</button>` + categories.map(c => `
        <button onclick="app.filterByPill('${c.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 ${c.isB3 ? 'border border-rose-300 text-rose-700' : ''}">
          ${c.isB3 ? '⚠️ ' : ''}${esc(c.name)}
        </button>
      `).join('');
    }
  }

  filterByHotKeyword(keyword) {
    const searchInput = [REDACTED]'buyer-search-input');
    if (searchInput) {
      searchInput.value = keyword;
    }
    // Filter kartu pada postingan publik
    const cards = document.querySelectorAll('.public-posting-card');
    if (cards.length > 0) {
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(keyword.toLowerCase()) ? '' : 'none';
      });
    }
    this.filterBuyerProducts();
  }

  filterBuyerProducts() {
    const search = [REDACTED]'buyer-search-input').value;
    const cat = [REDACTED]'buyer-cat-filter').value;
    const sort = [REDACTED]'buyer-sort-filter').value;

    let products = this.store.getProducts({
      status: 'approved',
      category: cat,
      search
    });

    if (sort === 'price_low') products.sort((a, b) => a.totalPrice - b.totalPrice);
    if (sort === 'price_high') products.sort((a, b) => b.totalPrice - a.totalPrice);
    if (sort === 'qty_high') products.sort((a, b) => (b.volume || b.weight) - (a.volume || a.weight));

    const grid = [REDACTED]'buyer-products-grid');
    const user = this.store.getCurrentUser();
    const tier = this.store.getUserSubscriptionTier(user) || this.store.getSubscriptionTiers()[1];

    grid.innerHTML = products.map(p => {
      const qtyDisplay = p.volume > 0 ? `${p.volume.toLocaleString('id-ID')} Liter` : `${p.weight.toLocaleString('id-ID')} Kg`;
      const isBooked = p.status === 'booked';
      const mainPhoto = (p.evidences && p.evidences[0]) ? p.evidences[0].url : 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=600&q=80';
      const access = this.store.checkProductAccess(p, user, 'buyer');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between ${isBooked ? 'opacity-75' : ''}">
          <div>
            <div class="relative h-44 bg-slate-100 overflow-hidden">
              <img src="${mainPhoto}" alt="${esc(p.title)}" class="w-full h-full object-cover">
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">${esc(p.code)}</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-600/90 backdrop-blur-sm text-white">${esc(p.categoryName)}</span>
              </div>
              <div class="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span class="truncate"><i class="fa-solid fa-location-dot text-emerald-400 mr-1"></i>Kota: ${this.getCity(p)}</span>
                <span class="shrink-0 text-emerald-300 font-mono text-[10px]">3 Eviden OK</span>
              </div>
            </div>

            <div class="p-4 space-y-3">
              <div>
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${esc(p.title)}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-truck-ramp-box mr-1"></i>${esc(p.containerType)}</span>
                  <span>•</span>
                  <span class="font-semibold text-slate-700">${qtyDisplay}</span>
                  <span>•</span>
                  <span class="text-emerald-700 font-semibold flex items-center"><i class="fa-solid fa-city mr-1 text-[10px]"></i>${this.getCity(p)}</span>
                </div>

                <!-- 10 Atribut Wajib Listing Badges -->
                <div class="flex flex-wrap gap-1 mt-2">
                  ${p.isB3 ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center">
                      <i class="fa-solid fa-triangle-exclamation mr-1 text-rose-600"></i>Limbah B3 KLHK
                    </span>
                  ` : ''}
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                    Kondisi: ${esc(p.condition || 'Bersih')}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                    Grade: ${esc(p.grade || 'Standar')}
                  </span>
                  ${p.minimumOrder ? `
                    <span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      MOQ: ${p.minimumOrder} ${p.minimumOrderUnit || p.unit || 'Kg'}
                    </span>
                  ` : ''}
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.listingStatus === 'Tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">
                    ${esc(p.listingStatus || 'Tersedia')}
                  </span>
                </div>
              </div>

              <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                ${access.canViewPrice ? `
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-slate-500">Harga Satuan:</span>
                    <span class="font-bold text-slate-900 font-mono text-sm">${this.formatRupiah(p.offerPrice)} / ${p.unit}</span>
                  </div>
                  <div class="flex justify-between items-center text-xs border-t border-slate-200/60 pt-1">
                    <span class="text-slate-500">Total Nilai:</span>
                    <span class="font-bold text-emerald-700 font-mono">${this.formatRupiah(p.totalPrice)}</span>
                  </div>
                ` : `
                  <div class="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                    <i class="fa-solid fa-lock text-amber-600 mr-1"></i>
                    Nilai di atas kuota paket Anda (${this.formatRupiah(tier.maxPriceLimit)}).
                    <button onclick="app.showBuyerRegisterModal()" class="text-brand-700 underline font-bold ml-1">Upgrade</button>
                  </div>
                `}
              </div>

              <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span class="truncate"><i class="fa-solid fa-store mr-1 text-slate-400"></i>${esc(p.sellerName)} (${this.getCity(p)})</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">${esc(p.sellerType)}</span>
              </div>
            </div>
          </div>

          <div class="p-4 pt-0 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <button onclick="app.openChatWithSeller('${p.id}', '${p.sellerId}')" class="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-sm">
                <i class="fa-solid fa-comments text-emerald-400"></i>
                <span>Chat Penjual</span>
              </button>
              <button onclick="app.showProductDetail('${p.id}')" class="py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-camera"></i>
                <span>Foto & GPS</span>
              </button>
            </div>
            ${access.canViewPrice ? `
              <button onclick="app.initiateCheckout('${p.id}')" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-cart-check"></i>
                <span>Pesan DP 30%</span>
              </button>
            ` : `
              <button onclick="app.showBuyerRegisterModal()" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-crown"></i>
                <span>Upgrade Paket Tier</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  filterByPill(catId) {
    const filterCat = [REDACTED]'buyer-cat-filter');
    if (filterCat) filterCat.value = catId;
    this.filterBuyerProducts();
  }

  resetDemoData() {
    if (confirm("Apakah Anda yakin ingin mereset seluruh data demo kembali ke bawaan sistem?")) {
      this.store.resetData();
      location.reload();
    }
  }

  // ================= BUKTI PELUNASAN SISA (DP SYSTEM) =================
  openRemainingPaymentProofModal(orderId) {
    const o = this.store.getOrderById(orderId);
    if (!o) return;

    const modal = [REDACTED]'modal-remaining-payment-proof');
    if (!modal) {
      // Build modal dynamically if not in HTML
      this._createRemainingPaymentModal();
    }

    // Populate modal fields
    const el = (id, val) => { const e = [REDACTED]id); if (e) e.textContent = val; };
    el('rem-pay-order-code', o.bookingCode);
    el('rem-pay-product', o.productTitle);
    el('rem-pay-seller', o.sellerName);
    el('rem-pay-total', this.formatRupiah(o.totalPrice));
    el('rem-pay-dp-paid', this.formatRupiah(o.totalPaidNow || o.downPaymentAmount || 0));
    el('rem-pay-remaining', this.formatRupiah(o.remainingPayment || 0));

    // Store orderId on form
    const form = [REDACTED]'form-remaining-payment-proof');
    if (form) form.dataset.orderId = orderId;

    // Reset form state
    const notesInput = [REDACTED]'rem-pay-notes');
    if (notesInput) notesInput.value = '';
    const fileInput = [REDACTED]'rem-pay-file');
    if (fileInput) fileInput.value = '';
    const preview = [REDACTED]'rem-pay-preview');
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    const placeholder = [REDACTED]'rem-pay-placeholder');
    if (placeholder) placeholder.classList.remove('hidden');

    const modalEl = [REDACTED]'modal-remaining-payment-proof');
    if (modalEl) { modalEl.classList.remove('hidden'); modalEl.classList.add('flex'); }
  }

  closeRemainingPaymentProofModal() {
    const modal = [REDACTED]'modal-remaining-payment-proof');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
  }

  handleRemainingProofFileSelect(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = [REDACTED]'rem-pay-preview');
      const placeholder = [REDACTED]'rem-pay-placeholder');
      if (preview) { preview.src = e.target.result; preview.classList.remove('hidden'); }
      if (placeholder) placeholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  }

  async submitRemainingPaymentProofForm(event) {
    event.preventDefault();
    const form = [REDACTED]'form-remaining-payment-proof');
    if (!form) return;
    const orderId = form.dataset.orderId;
    if (!orderId) return;

    const notes = ([REDACTED]'rem-pay-notes')?.value || '').trim();
    const fileInput = [REDACTED]'rem-pay-file');
    const preview = [REDACTED]'rem-pay-preview');
    const imageUrl = (preview && !preview.classList.contains('hidden')) ? preview.src : null;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Mengirim...'; }

    try {
      await this.store.submitRemainingPaymentProof(orderId, {
        notes,
        imageUrl,
        submittedAt: new Date().toISOString()
      });
      this.showToast('Bukti pelunasan berhasil dikirim! Menunggu verifikasi penjual/admin.', 'success');
      this.closeRemainingPaymentProofModal();
      this.renderBuyerOrders();
    } catch (e) {
      this.showToast(e.message || 'Gagal mengirim bukti pembayaran.', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Kirim Bukti Pelunasan'; }
    }
  }

  // Admin/seller: verify remaining payment proof
  async verifyRemainingPayment(orderId) {
    const user = this.store.getCurrentUser();
    if (!user) return;
    if (!confirm('Konfirmasi pelunasan sisa pembayaran ini sudah diterima dan diverifikasi?')) return;
    try {
      await this.store.verifyRemainingPayment(orderId, user.role, user.name || user.email);
      this.showToast('Pelunasan sisa berhasil diverifikasi! Pesanan selesai.', 'success');
      if (user.role === 'admin') this.renderAdminOrders();
      if (user.role === 'seller') this.renderSellerOrders();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  _createRemainingPaymentModal() {
    const existing = [REDACTED]'modal-remaining-payment-proof');
    if (existing) return;
    const modal = document.createElement('div');
    modal.id = 'modal-remaining-payment-proof';
    modal.className = 'hidden fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div class="bg-violet-600 rounded-t-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h3 class="text-white font-bold text-base">Upload Bukti Pelunasan Sisa</h3>
            <p class="text-violet-200 text-xs mt-0.5">Sistem DP — Bukti transfer sisa pembayaran</p>
          </div>
          <button onclick="app.closeRemainingPaymentProofModal()" class="text-white/70 hover:text-white text-xl">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-violet-50 rounded-xl p-4 text-xs space-y-1 border border-violet-100">
            <div class="flex justify-between"><span class="text-slate-500">Kode Booking:</span><span class="font-mono font-bold text-violet-700" id="rem-pay-order-code">-</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Produk:</span><span class="font-semibold text-slate-800" id="rem-pay-product">-</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Penjual:</span><span class="font-semibold text-slate-800" id="rem-pay-seller">-</span></div>
            <div class="flex justify-between border-t border-violet-200 pt-2 mt-2"><span class="text-slate-500">Total Nilai:</span><span class="font-mono font-bold text-slate-900" id="rem-pay-total">-</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Sudah Dibayar (DP):</span><span class="font-mono font-bold text-emerald-600" id="rem-pay-dp-paid">-</span></div>
            <div class="flex justify-between text-sm"><span class="font-bold text-slate-700">Sisa Pelunasan:</span><span class="font-mono font-extrabold text-red-600" id="rem-pay-remaining">-</span></div>
          </div>
          <form id="form-remaining-payment-proof" onsubmit="app.submitRemainingPaymentProofForm(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Bukti Transfer / Pembayaran <span class="text-red-500">*</span></label>
              <div class="border-2 border-dashed border-violet-200 rounded-xl p-4 text-center cursor-pointer hover:border-violet-400 transition relative" onclick="[REDACTED]'rem-pay-file').click()">
                <input type="file" id="rem-pay-file" accept="image/*" class="hidden" onchange="app.handleRemainingProofFileSelect(this)">
                <div id="rem-pay-placeholder" class="space-y-1">
                  <i class="fa-solid fa-cloud-arrow-up text-2xl text-violet-300"></i>
                  <p class="text-xs text-slate-400">Klik untuk pilih foto bukti transfer</p>
                  <p class="text-[10px] text-slate-300">JPG, PNG, WEBP (maks. 5MB)</p>
                </div>
                <img id="rem-pay-preview" src="" alt="Preview" class="hidden max-h-40 mx-auto rounded-lg object-contain">
              </div>
            </div>
            <div>
              <label for="rem-pay-notes" class="block text-xs font-semibold text-slate-700 mb-1">Catatan (opsional)</label>
              <textarea id="rem-pay-notes" rows="2" placeholder="Contoh: Transfer via BCA, nama pengirim Budi..." class="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" onclick="app.closeRemainingPaymentProofModal()" class="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">Batal</button>
              <button type="submit" class="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow transition">Kirim Bukti Pelunasan</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Modal untuk melihat rincian bukti sisa pembayaran (untuk Penjual dan Admin)
  openViewRemainingProofModal(orderId) {
    const o = this.store.getOrderById(orderId);
    if (!o) return;
    const proof = o.remainingPaymentProof || {};

    let modal = [REDACTED]'modal-view-remaining-proof');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-view-remaining-proof';
      modal.className = 'hidden fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm items-center justify-center p-4';
      document.body.appendChild(modal);
    }

    const user = this.store.getCurrentUser();
    const isSeller = user && user.role === 'seller';
    const isAdmin = user && user.role === 'admin';
    const isVerified = ['paid', 'completed', 'verified_by_admin'].includes(o.remainingPaymentStatus) || (isSeller && proof.verifiedBySeller);

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
        <div class="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm">
              <i class="fa-solid fa-file-invoice-dollar"></i>
            </span>
            <div>
              <h3 class="font-bold text-sm">Pemeriksaan Bukti Pelunasan Sisa</h3>
              <p class="text-[11px] text-slate-400">Kode Booking: <span class="font-mono text-emerald-400">${esc(o.bookingCode)}</span></p>
            </div>
          </div>
          <button onclick="app.closeViewRemainingProofModal()" class="text-slate-400 hover:text-white text-lg">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <!-- Ringkasan Transaksi -->
          <div class="bg-slate-50 rounded-xl p-4 text-xs space-y-2 border border-slate-200">
            <div class="flex justify-between"><span class="text-slate-500">Produk Komoditas:</span><span class="font-bold text-slate-800">${this._escHtml ? this._escHtml(o.productTitle) : o.productTitle}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Nama Pembeli:</span><span class="font-semibold text-slate-800">${this._escHtml ? this._escHtml(o.buyerName) : o.buyerName}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Nama Penjual:</span><span class="font-semibold text-slate-800">${this._escHtml ? this._escHtml(o.sellerName) : o.sellerName}</span></div>
            <div class="flex justify-between border-t border-slate-200 pt-2"><span class="text-slate-500">Total Nilai Pesanan:</span><span class="font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">DP Terbayar:</span><span class="font-mono font-bold text-emerald-600">${this.formatRupiah(o.totalPaidNow || o.downPaymentAmount || 0)}</span></div>
            <div class="flex justify-between border-t border-slate-200 pt-2 text-sm"><span class="font-bold text-slate-700">Sisa yang Dilunasi:</span><span class="font-mono font-extrabold text-red-600">${this.formatRupiah(o.remainingPayment || 0)}</span></div>
          </div>

          <!-- Rincian Bukti Bayar -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <i class="fa-solid fa-receipt text-brand-600"></i> Informasi Bukti Transfer / Pelunasan
            </h4>
            
            <div class="grid grid-cols-2 gap-3 text-xs bg-violet-50/50 p-3 rounded-xl border border-violet-100">
              <div>
                <span class="text-slate-400 block text-[10px]">Waktu Diunggah:</span>
                <span class="font-mono font-semibold text-slate-700">${proof.uploadedAt || '-'}</span>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px]">No. Referensi:</span>
                <span class="font-mono font-bold text-violet-700">${proof.referenceNumber || '-'}</span>
              </div>
              <div class="col-span-2">
                <span class="text-slate-400 block text-[10px]">Catatan Pembeli:</span>
                <span class="text-slate-700 italic">${esc(proof.notes || 'Tidak ada catatan tambahan.')}</span>
              </div>
            </div>

            <!-- Foto Bukti Transfer -->
            <div>
              <span class="block text-xs font-semibold text-slate-700 mb-1.5">Foto Bukti Transfer:</span>
              ${(proof.proofImageUrl || proof.imageUrl) ? `
                <div class="border rounded-xl p-2 bg-slate-100 text-center">
                  <a href="${proof.proofImageUrl || proof.imageUrl}" target="_blank" title="Klik untuk memperbesar gambar">
                    <img src="${proof.proofImageUrl || proof.imageUrl}" alt="Bukti Transfer" class="max-h-60 mx-auto rounded-lg object-contain shadow-xs hover:opacity-95 transition">
                  </a>
                  <p class="text-[10px] text-slate-400 mt-1">Klik gambar untuk membuka ukuran penuh di tab baru</p>
                </div>
              ` : `
                <div class="p-6 border border-dashed rounded-xl text-center text-slate-400 text-xs">
                  <i class="fa-solid fa-image text-2xl mb-1 text-slate-300"></i>
                  <p>Tidak ada lampiran foto bukti bayar.</p>
                </div>
              `}
            </div>
          </div>

          <!-- Status Verifikasi -->
          <div class="p-3 rounded-xl border text-xs ${isVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}">
            <div class="font-bold flex items-center gap-1.5">
              <i class="fa-solid ${isVerified ? 'fa-circle-check text-emerald-600' : 'fa-clock text-amber-600'}"></i>
              <span>Status: ${isVerified ? 'Sudah Diverifikasi' : 'Menunggu Konfirmasi & Verifikasi'}</span>
            </div>
            ${proof.verifiedBySellerAt ? `<div class="text-[10px] mt-1 text-emerald-700">Divalidasi Penjual: ${proof.verifiedBySellerName} (${proof.verifiedBySellerAt})</div>` : ''}
            ${proof.verifiedByAdminAt ? `<div class="text-[10px] mt-0.5 text-emerald-700">Divalidasi Admin: ${proof.verifiedByAdminName} (${proof.verifiedByAdminAt})</div>` : ''}
          </div>

          <!-- Tombol Aksi -->
          <div class="flex gap-2 pt-2">
            <button type="button" onclick="app.closeViewRemainingProofModal()" class="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition">Tutup</button>
            ${!isVerified ? `
              <button type="button" onclick="app.verifyRemainingPayment('${o.id}'); app.closeViewRemainingProofModal();" class="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i>
                <span>Verifikasi Lunas</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeViewRemainingProofModal() {
    const modal = [REDACTED]'modal-view-remaining-proof');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
}


// Inisialisasi Aplikasi BURSA LIMBAH Saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BursaLimbahApp();
  window.app.init();
});
