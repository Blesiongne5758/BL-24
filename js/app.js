/**
 * BURSA LIMBAH Application Logic (100% Bahasa Indonesia)
 * Versi 3: 3-Tier Berlangganan Pembeli, Gated Access Publik, Kontrol Admin Rentang Harga & Fitur Layar Chat Interaktif
 */

class BursaLimbahApp {
  constructor() {
    this.store = window.bursaLimbahStore || window.circulinkStore;
    this.activeModalMap = null;
    this.currentBuyerTab = 'market';
    this.currentAdminTab = 'verification';
    this.currentLoginTab = 'buyer';
    this.publicPostingFilter = 'all'; // 'all', 'supply', 'demand'
    this.selectedRegisterTier = 'tier_pro'; // Default dipilih di modal registrasi
    this.currentChatProduct = null;
    this.currentChatSeller = null;
    this.chatOpen = false;
  }

  init() {
    this.renderPriceTicker();
    this.renderPublicCategories();
    this.setupCalculator();
    this.populateSelectCategories();
    this.renderPublicPostings();
    this.renderPublicSubscriptionTiers();

    // Set peran awal dari data store
    const currentRole = this.store.getCurrentRole();
    this.setRole(currentRole, false);

    // Render tampilan modul awal
    this.renderBuyerMarketplace();
    this.renderSellerDashboard();
    this.renderAdminDashboard();
    this.updateAdminPendingBadge();
    this.updateChatUnreadBadge();
    this.updateNavUI();
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
        if (roleTitle) roleTitle.textContent = `Akun Pembeli: ${user.name}`;
        if (roleDesc) roleDesc.textContent = `Paket: ${tier.name} (${limitText}) • Alamat: ${tier.allowAddress === 'full' ? 'Lengkap' : 'Kota'} • GPS: ${tier.allowGpsMap ? 'Aktif' : 'Terkunci'} • WA: ${tier.allowWhatsapp ? 'Aktif' : 'Chat Saja'}`;
        if (roleActions) {
          roleActions.innerHTML = `
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
        if (buyerHeading) buyerHeading.textContent = `Portal Akun Pembeli: ${user.company || user.name}`;
      } else if (role === 'seller' && user) {
        if (roleIcon) roleIcon.innerHTML = '<i class="fa-solid fa-store text-emerald-300"></i>';
        if (roleTitle) roleTitle.textContent = `Akun Penjual: ${user.name}`;
        if (roleDesc) roleDesc.textContent = `Status: ${user.verifiedBadge} • Saldo Penjualan: ${this.formatRupiah(user.balance)}`;
        if (roleActions) {
          roleActions.innerHTML = `
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
        if (sellerMeta) sellerMeta.textContent = `Email: ${user.email || '-'} • Lokasi: ${user.location || '-'} • Rekening: ${user.bankAccount || '-'}`;
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

    // Perbarui Navigasi
    this.updateNavUI();

    // Muat ulang data tampilan yang aktif
    if (role === 'public') this.renderPublicPostings();
    if (role === 'buyer') this.renderBuyerMarketplace();
    if (role === 'seller') this.renderSellerDashboard();
    if (role === 'admin') this.renderAdminDashboard();
    if (role === 'login') this.renderLoginPage();

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
    const navContainer = [REDACTED]'nav-action-container');
    if (!navContainer) return;

    const role = this.store.getCurrentRole();
    const user = this.store.getCurrentUser();

    if (role === 'buyer' && user) {
      navContainer.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <i class="fa-solid fa-crown text-amber-500"></i>
            <span class="truncate max-w-[140px]">${user.company || user.name}</span>
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
            <span class="truncate max-w-[140px]">${user.name}</span>
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

  showSellerRegisterModal() {
    const modal = [REDACTED]'modal-seller-register');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  async handleSellerRegister(event) {
    event.preventDefault();
    const company = [REDACTED]'reg-seller-company').value.trim();
    const name = [REDACTED]'reg-seller-name').value.trim();
    const phone = [REDACTED]'reg-seller-phone').value.trim();
    const email = [REDACTED]'reg-seller-email').value.trim();
    const location = [REDACTED]'reg-seller-location').value.trim();
    const bankAccount = [REDACTED]'reg-seller-bank').value.trim();
    const password = [REDACTED]'reg-seller-password').value;

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
      password
    });

    this.closeModals();
    this.triggerConfetti();
    this.showToast(`Selamat datang ${company}! Akun Penjual berhasil dibuat.`, 'success');
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

  navigateToSection(sectionId) {
    if (this.store.getCurrentRole() !== 'public') {
      this.setRole('public', false);
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
    const dp = Math.round(total * 0.3);
    const remaining = total - dp;

    if (totalDisplay) totalDisplay.textContent = this.formatRupiah(total);
    if (dpDisplay) dpDisplay.textContent = this.formatRupiah(dp);
    if (remDisplay) remDisplay.textContent = this.formatRupiah(remaining);
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

    const msg = `Halo Admin Bursa Limbah, saya ingin konsultasi simulasi DP 30% Rekening Bersama Escrow untuk ${commName} sebanyak ${qty} ${unit} (Estimasi DP: ${dpVal}). Mohon info panduan booking & verifikasinya.`;
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

  // ================= FILTER EVENT =================
  filterEvents(category) {
    // Update active state on filter pills
    const pills = document.querySelectorAll('#event-filter-pills .event-filter-btn');
    pills.forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === category;
      if (isActive) {
        btn.className = 'event-filter-btn px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white border border-indigo-600 transition';
      } else {
        btn.className = 'event-filter-btn px-4 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-600 border border-slate-300 hover:border-indigo-400 hover:text-indigo-700 transition';
      }
    });

    // Show/hide event cards
    const cards = document.querySelectorAll('#event-cards-grid .event-card');
    let visibleCount = 0;
    cards.forEach(card => {
      const cardCategory = card.getAttribute('data-category');
      const show = category === 'semua' || cardCategory === category;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    // Show empty state if no cards visible
    const grid = [REDACTED]'event-cards-grid');
    const existingEmpty = [REDACTED]'event-empty-state');
    if (existingEmpty) existingEmpty.remove();
    if (visibleCount === 0) {
      const empty = document.createElement('div');
      empty.id = 'event-empty-state';
      empty.className = 'col-span-3 text-center py-16 text-slate-400';
      empty.innerHTML = `<i class="fa-solid fa-calendar-xmark text-4xl mb-3 block text-indigo-200"></i><p class="text-sm font-semibold">Belum ada event untuk kategori ini.</p><p class="text-xs mt-1">Pantau terus untuk update event berikutnya!</p>`;
      grid.appendChild(empty);
    }
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
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates && data.rates.IDR) {
          const liveUsd = Math.round(data.rates.IDR);
          this.marketCurrencies.usd.rate = liveUsd;
          // Estimasi harga emas per gram (spot dunia ~US$ 2.650 / troy ounce; 1 troy oz = 31.1035 gr)
          const goldPerGram = Math.round((2650 * liveUsd) / 31.1035);
          if (goldPerGram > 1000000 && goldPerGram < 2500000) {
            this.marketCurrencies.gold.rate = goldPerGram;
          }
          this.renderPriceTicker();
        }
      }
    } catch (e) {
      console.log("Menggunakan rate kurs standar bawaan", e);
    }
  }

  renderPriceTicker() {
    const tickerContainer = [REDACTED]'price-ticker-strip');
    if (!tickerContainer) return;

    if (!this.marketCurrencies) {
      this.marketCurrencies = {
        usd: {
          name: 'USD / IDR',
          label: 'Kurs Dolar AS',
          rate: 16180,
          trend: 'up',
          changePercent: '+0.15%'
        },
        gold: {
          name: 'Harga Emas Antam',
          label: 'Emas Logam Mulia',
          rate: 1515000,
          unit: 'gr',
          trend: 'up',
          changePercent: '+0.42%'
        }
      };
      this.fetchLiveMarketRates();
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

    // 2. Harga Emas Murni / Antam
    const gold = this.marketCurrencies.gold;
    const goldIsUp = gold.trend === 'up';
    const goldIsDown = gold.trend === 'down';
    const goldTrendColor = goldIsUp ? 'text-amber-300 border-amber-800/60 bg-amber-950/70' : goldIsDown ? 'text-rose-400 border-rose-800/60 bg-rose-950/70' : 'text-slate-400 border-slate-700 bg-slate-800';
    const goldTrendIcon = goldIsUp ? 'fa-arrow-trend-up' : goldIsDown ? 'fa-arrow-trend-down' : 'fa-minus';

    html += `
      <div class="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-950/90 to-slate-900 px-3 py-1 rounded-lg border border-amber-500/50 hover:border-amber-400 transition shadow-sm">
        <span class="w-2 h-2 rounded-full ${goldIsUp ? 'bg-amber-400' : 'bg-rose-400'} animate-pulse"></span>
        <span class="text-amber-300 font-bold flex items-center space-x-1 text-xs">
          <i class="fa-solid fa-coins text-[11px] text-amber-400"></i>
          <span>Harga Emas:</span>
        </span>
        <span class="text-white font-bold font-mono text-xs">${this.formatRupiah(gold.rate)}<span class="text-[10px] text-slate-400 font-normal">/gr</span></span>
        <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${goldTrendColor} flex items-center">
          <i class="fa-solid ${goldTrendIcon} mr-1 text-[9px]"></i>${gold.changePercent}
        </span>
      </div>
    `;

    // 3. Kategori Komoditas Limbah
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
          <span class="text-slate-300 font-semibold">${cat.name}:</span>
          <span class="text-white font-bold font-mono">${this.formatRupiah(currentPrice)}<span class="text-[10px] text-slate-400 font-normal">/${cat.unit}</span></span>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${trendColor} flex items-center">
            <i class="fa-solid ${trendIcon} mr-1 text-[9px]"></i>${cat.changePercent || '0.0%'}
          </span>
        </div>
      `;
    });

    tickerContainer.innerHTML = html + html;

    if (!this.tickerPulseInterval) {
      this.tickerPulseInterval = setInterval(() => {
        this.simulateLiveMarketTick();
      }, 5000);
    }
  }

  simulateLiveMarketTick() {
    // Fluktuasi acak untuk Kurs USD atau Harga Emas
    if (this.marketCurrencies && Math.random() > 0.3) {
      if (Math.random() > 0.5) {
        const delta = Math.floor(Math.random() * 30) - 14;
        this.marketCurrencies.usd.rate = Math.max(15000, this.marketCurrencies.usd.rate + delta);
        this.marketCurrencies.usd.trend = delta >= 0 ? 'up' : 'down';
        this.marketCurrencies.usd.changePercent = `${delta >= 0 ? '+' : ''}${(Math.random() * 0.25).toFixed(2)}%`;
      } else {
        const delta = (Math.floor(Math.random() * 7) - 3) * 1000;
        this.marketCurrencies.gold.rate = Math.max(1000000, this.marketCurrencies.gold.rate + delta);
        this.marketCurrencies.gold.trend = delta >= 0 ? 'up' : 'down';
        this.marketCurrencies.gold.changePercent = `${delta >= 0 ? '+' : ''}${(Math.random() * 0.35).toFixed(2)}%`;
      }
    }

    const categories = this.store.getCategories();
    if (!categories || categories.length === 0) return;

    const randIdx = Math.floor(Math.random() * categories.length);
    const targetCat = categories[randIdx];
    const deltaPercent = (Math.random() * 0.6 - 0.25).toFixed(1);
    const numericDelta = parseFloat(deltaPercent);

    if (numericDelta > 0) {
      targetCat.trend = 'up';
      targetCat.changePercent = `+${Math.abs(numericDelta + 1.2).toFixed(1)}%`;
      targetCat.avgPrice = Math.round(targetCat.avgPrice + (Math.random() * 50 + 25));
    } else if (numericDelta < 0) {
      targetCat.trend = 'down';
      targetCat.changePercent = `-${Math.abs(numericDelta - 0.5).toFixed(1)}%`;
      targetCat.avgPrice = Math.max(500, Math.round(targetCat.avgPrice - (Math.random() * 50 + 20)));
    }

    this.renderPriceTicker();

    // Rotasi teks dinamis di banner aktivitas mobile
    const mobilePulse = [REDACTED]'mobile-live-pulse-text');
    if (mobilePulse) {
      const messages = [
        `14 Pemasok Online • ⚡ 3 Escrow Baru Diproses • 📈 Jelantah +4.5%`,
        `🏗️ Besi Scrap WF 8 Ton Masuk (Cikarang) • 🛡️ Garansi Rekening Bersama DP 30%`,
        `💵 Kurs USD Rp ${this.marketCurrencies ? this.formatRupiah(this.marketCurrencies.usd.rate) : '16.180'} • 🪙 Emas Antam Aktif`,
        `🍶 Pasokan Plastik PET Bal Press 5 Ton Siap Kirim • 🚚 Manifes Digital Siap`,
        `💖 PreLoved Alat Industri & Mesin Press Diskon s/d 30% • 📦 Siap Pakai`
      ];
      this.mobilePulseIndex = ((this.mobilePulseIndex || 0) + 1) % messages.length;
      mobilePulse.textContent = messages[this.mobilePulseIndex];
    }
  }

  renderPublicCategories() {
    const grid = [REDACTED]'category-grid-public');
    if (!grid) return;

    const categories = this.store.getCategories();
    grid.innerHTML = categories.map(cat => `
      <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-brand-500 hover:shadow-lg transition group cursor-pointer flex flex-col justify-between" onclick="app.setRole('buyer')">
        <div>
          <div class="relative h-32 overflow-hidden bg-slate-100">
            <img src="${cat.image}" alt="${cat.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
              ${cat.name}
            </span>
            <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] font-semibold bg-brand-600/90 text-white">
              ${cat.badge || 'Standar Daur Ulang'}
            </span>
          </div>

          <div class="p-4">
            <div class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md inline-block">
              ${cat.priceRange}
            </div>
            <p class="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">
              ${cat.description}
            </p>
          </div>
        </div>

        <div class="p-4 pt-0">
          <div class="text-[11px] font-bold text-brand-600 group-hover:text-brand-700 flex items-center justify-between border-t border-slate-100 pt-2.5">
            <span>Buka Bursa Pembeli</span>
            <i class="fa-solid fa-arrow-right text-[10px] transform group-hover:translate-x-1 transition"></i>
          </div>
        </div>
      </div>
    `).join('');
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
              <img src="${mainPhoto}" alt="${item.title}" class="w-full h-full object-cover">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                  ${item.code}
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
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${item.title}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-scale-balanced mr-1 text-slate-400"></i>Volume:</span>
                  <span class="font-bold text-slate-800">${qtyText}</span>
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

          <!-- Tombol Aksi: Simulasi DP 30% & Buka Akses -->
          <div class="p-4 pt-0 space-y-2">
            <div class="grid grid-cols-2 gap-1.5">
              <button onclick="app.openMobileDpSimulator({ category: '${item.category || item.categoryId || 'jelantah'}', qty: ${item.volume || item.weight || 2500}, title: '${(item.title || '').replace(/'/g, "\\'")}' })" class="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold transition flex items-center justify-center space-x-1 active:scale-95 shadow-2xs">
                <i class="fa-solid fa-calculator text-amber-600"></i>
                <span>Simulasi DP</span>
              </button>
              <button onclick="app.showProductDetail('${item.id}')" class="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold transition flex items-center justify-center space-x-1 active:scale-95">
                <i class="fa-solid fa-eye text-emerald-600"></i>
                <span>Detail</span>
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

            <h4 class="text-2xl font-extrabold mt-1 ${isPopular ? 'text-white' : 'text-slate-900'}">${tier.name}</h4>
            <p class="text-xs mt-2 leading-relaxed ${isPopular ? 'text-slate-300' : 'text-slate-500'}">${tier.description}</p>
            
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
              Pilih & Daftar ${tier.name}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================= 3. MODAL PENDAFTARAN PEMBELI & PILIHAN 3-TIER =================
  showBuyerRegisterModal(preferredTierId = null) {
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
            <div class="font-extrabold text-xs text-slate-900">${t.name}</div>
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
    const name = [REDACTED]'reg-buyer-name').value;
    const company = [REDACTED]'reg-buyer-company').value;
    const phone = [REDACTED]'reg-buyer-phone').value;
    const email = [REDACTED]'reg-buyer-email').value;
    const password = [REDACTED]'reg-buyer-password') ? [REDACTED]'reg-buyer-password').value : '[REDACTED]';

    const res = await this.store.registerBuyerAsync({
      name,
      company,
      phone,
      email,
      password,
      tierId: this.selectedRegisterTier
    });

    const tier = this.store.getSubscriptionTierById(this.selectedRegisterTier);

    this.closeModals();
    this.setRole('buyer', false);
    this.triggerConfetti();
    this.showToast(`Selamat datang ${name}! Akun Pembeli aktif dengan ${tier.name}.`, 'success');
  }

  // ================= 4. KATALOG PEMBELI: PENGECEKAN TIER RENTANG HARGA & FITUR =================
  switchBuyerTab(tab) {
    this.currentBuyerTab = tab;
    const tabMarket = [REDACTED]'buyer-tab-market');
    const tabOrders = [REDACTED]'buyer-tab-orders');
    const contentMarket = [REDACTED]'buyer-content-market');
    const contentOrders = [REDACTED]'buyer-content-orders');

    if (tab === 'market') {
      tabMarket.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm transition';
      tabOrders.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center';
      contentMarket.classList.remove('hidden');
      contentOrders.classList.add('hidden');
      this.renderBuyerMarketplace();
    } else {
      tabOrders.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm transition flex items-center';
      tabMarket.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition';
      contentMarket.classList.add('hidden');
      contentOrders.classList.remove('hidden');
      this.renderBuyerOrders();
    }
  }

  switchBuyerTierSim(tierId) {
    const user = this.store.getCurrentUser();
    if (user && user.role === 'buyer') {
      this.store.setBuyerTier(user.id, tierId);
      const tier = this.store.getSubscriptionTierById(tierId);
      this.renderBuyerMarketplace();
      this.showToast(`Simulasi: Beralih ke ${tier.name}`, 'success');
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
              <img src="${mainPhoto}" alt="${p.title}" class="w-full h-full object-cover">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">
                  ${p.code}
                </span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-600/90 backdrop-blur-sm text-white">
                  ${p.categoryName}
                </span>
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
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${p.title}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-truck-ramp-box mr-1"></i>${p.containerType}</span>
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

                  <div class="text-[10px] text-brand-700 font-semibold pt-0.5 flex justify-between">
                    <span>DP 30%: ${this.formatRupiah(Math.round(p.totalPrice * 0.3))}</span>
                    <span>Penanganan: Rp10rb</span>
                  </div>
                ` : `
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-500">Nilai Transaksi:</span>
                      <span class="font-mono text-slate-400 text-xs">Rp ***.***.***</span>
                    </div>
                    <div class="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                      <i class="fa-solid fa-lock text-amber-600 mr-1"></i>
                      <strong>Di luar Kuota ${tier.name}:</strong> Nilai limbah melebihi batas kuota Anda (${this.formatRupiah(tier.maxPriceLimit)}).
                      <button onclick="app.showBuyerRegisterModal()" class="text-brand-700 underline font-bold ml-1">Upgrade Tier</button>
                    </div>
                  </div>
                `}
              </div>

              <!-- Info Penjual & Kontak -->
              <div class="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span class="truncate"><i class="fa-solid fa-store mr-1 text-slate-400"></i>${p.sellerName} (${this.getCity(p)})</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">${p.sellerType}</span>
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
              <button onclick="app.initiateCheckout('${p.id}')" class="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1">
                <i class="fa-solid fa-cart-check"></i>
                <span>Pesan DP 30% Rekening Bersama</span>
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
        <div>
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold font-mono px-2 py-0.5 rounded bg-brand-100 text-brand-800">${p.code}</span>
            <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">${p.categoryName}</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mt-1">${p.title}</h3>
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
                <p class="text-[10px] text-slate-500 leading-tight">${e.notes || ''}</p>
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
                ? `<span class="text-slate-900 font-semibold">${p.address || this.getCity(p)}</span>` 
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

        <!-- Parameter Mutu & Finansial -->
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <h5 class="font-bold uppercase tracking-wider text-slate-700">Parameter Uji Mutu</h5>
            <div class="divide-y divide-slate-200">
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">Jenis Wadah:</span>
                <span class="font-semibold text-slate-800">${p.containerType}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">Volume:</span>
                <span class="font-semibold text-slate-800">${qtyDisplay}</span>
              </div>
              <div class="py-1.5 flex justify-between">
                <span class="text-slate-500">Penjual:</span>
                <span class="font-semibold text-slate-800">${p.sellerName}</span>
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
                  <div class="flex justify-between text-slate-300">
                    <span>DP 30% Escrow:</span>
                    <span class="font-bold text-brand-400">${this.formatRupiah(Math.round(p.totalPrice * 0.3))}</span>
                  </div>
                  <div class="flex justify-between text-slate-300">
                    <span>Biaya Penanganan:</span>
                    <span>Rp10.000</span>
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
                <button onclick="app.closeModals(); app.initiateCheckout('${p.id}')" class="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center justify-center space-x-1.5">
                  <i class="fa-solid fa-cart-check"></i>
                  <span>Pesan DP 30%</span>
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
          <div class="text-[10px] text-slate-400 px-1 font-medium">${msg.senderName} • ${msg.timestamp}</div>
          <div class="max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
            isBuyer 
              ? 'bg-brand-600 text-white rounded-br-none shadow-sm' 
              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
          }">
            ${msg.text}
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
      this.showToast(`Pesan baru dari ${p.sellerName}`, 'success');
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
    const tabs = ['verification', 'orders', 'tiers', 'settings'];
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
    if (tab === 'tiers') this.renderAdminTierForms();
    if (tab === 'settings') this.populateAdminSettings();
  }

  renderAdminTierForms() {
    const container = [REDACTED]'admin-tiers-input-cards');
    if (!container) return;

    const tiers = this.store.getSubscriptionTiers();

    container.innerHTML = tiers.map((t, idx) => {
      return `
        <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <div class="flex items-center justify-between border-b border-slate-200 pb-2">
            <span class="font-extrabold text-xs text-slate-900">${t.name}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 uppercase">${t.badge}</span>
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tarif Bulanan (Rp)</label>
            <input type="number" id="admin-tier-fee-${t.id}" value="${t.monthlyFee}" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Batas Maksimal Rentang Nilai Jual (Rp)
            </label>
            <input type="number" id="admin-tier-limit-${t.id}" value="${t.maxPriceLimit || 0}" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-brand-500 focus:outline-none">
            <span class="text-[10px] text-slate-400">Isi 0 untuk Unlimited (Semua Nilai Transaksi)</span>
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

      if (feeInput && limitInput) {
        this.store.updateSubscriptionTier(t.id, {
          monthlyFee: Number(feeInput.value) || 0,
          maxPriceLimit: Number(limitInput.value) || 0,
          allowGpsMap: gpsInput ? gpsInput.checked : false,
          allowWhatsapp: waInput ? waInput.checked : false
        });
      }
    });

    this.renderPublicSubscriptionTiers();
    this.renderBuyerMarketplace();
    this.showToast("Batas rentang nilai jual & hak akses 3-tier berhasil diperbarui oleh Admin!", "success");
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
    this.renderAdminTierForms();
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
              <td class="p-3 font-mono font-bold text-slate-700">${p.code}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${p.title}</div>
                <div class="text-[11px] text-slate-500">${p.categoryName} • ${p.origin}</div>
              </td>
              <td class="p-3 text-slate-800">${p.sellerName}</td>
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
            <th class="p-3">Status Rekening Bersama</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${orders.map(o => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-mono font-bold text-brand-700">${o.bookingCode}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${o.productTitle}</div>
                <div class="text-[11px] text-slate-500">Pembeli: ${o.buyerName}</div>
              </td>
              <td class="p-3 font-mono font-bold">${this.formatRupiah(o.totalPrice)}</td>
              <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.downPaymentAmount)}</td>
              <td class="p-3 font-mono text-slate-600">${this.formatRupiah(o.handlingFee)}</td>
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

  populateAdminSettings() {
    const s = this.store.getSettings();
    const handling = [REDACTED]'setting-handling');
    const dp = [REDACTED]'setting-dp');
    if (handling) handling.value = s.handlingFeePerTransaction || 10000;
    if (dp) dp.value = s.downPaymentPercent || 30;
  }

  saveAdminSettings(event) {
    event.preventDefault();
    const handling = Number([REDACTED]'setting-handling').value) || 10000;
    const dp = Number([REDACTED]'setting-dp').value) || 30;

    this.store.updateSettings({
      handlingFeePerTransaction: handling,
      downPaymentPercent: dp
    });

    this.showToast("Biaya penanganan dan DP Escrow berhasil diperbarui!", "success");
  }

  // ================= 9. TRANSAKSI CHECKOUT DP 30% REKENING BERSAMA =================
  initiateCheckout(productId) {
    const p = this.store.getProductById(productId);
    if (!p) return;

    const buyer = this.store.getCurrentUser();
    if (!buyer || !buyer.subscriptionActive) {
      this.showBuyerRegisterModal();
      this.showToast("Daftar dan aktifkan paket langganan terlebih dahulu untuk memesan limbah.", "warning");
      return;
    }

    const settings = this.store.getSettings();
    const totalPrice = p.totalPrice;
    const dpPercent = settings.downPaymentPercent || 30;
    const dpAmount = Math.round(totalPrice * (dpPercent / 100));
    const handlingFee = settings.handlingFeePerTransaction || 10000;
    const totalPaidNow = dpAmount + handlingFee;
    const remaining = totalPrice - dpAmount;

    const modal = [REDACTED]'modal-checkout');
    const container = [REDACTED]'modal-checkout-content');
    const defaultPickup = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    container.innerHTML = `
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-slate-900">Pemesanan Pasokan Limbah (DP 30%)</h3>
          <p class="text-xs text-slate-500">Rekening bersama BURSA LIMBAH mengunci pasokan hingga armada Anda tiba.</p>
        </div>
        <button onclick="app.closeModals()" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold text-brand-700 uppercase font-mono">${p.code}</span>
            <h4 class="font-bold text-slate-900 text-sm">${p.title}</h4>
            <p class="text-xs text-slate-500">${p.sellerName} • ${p.containerType}</p>
          </div>
          <div class="text-right">
            <div class="text-xs text-slate-500">Total Nilai Limbah:</div>
            <div class="font-mono font-bold text-slate-900">${this.formatRupiah(totalPrice)}</div>
          </div>
        </div>

        <div class="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 text-xs font-mono">
          <div class="flex justify-between items-center text-slate-600">
            <span>Uang Muka (DP 30%):</span>
            <span class="font-bold text-slate-900">${this.formatRupiah(dpAmount)}</span>
          </div>
          <div class="flex justify-between items-center text-slate-600">
            <span>Biaya Penanganan Sistem (Flat):</span>
            <span class="font-bold text-slate-900">Rp10.000</span>
          </div>
          <div class="flex justify-between items-center text-emerald-700 pt-2 border-t border-slate-100 text-sm">
            <span class="font-sans font-bold">Total Pembayaran Sekarang:</span>
            <span class="font-extrabold text-base">${this.formatRupiah(totalPaidNow)}</span>
          </div>
          <div class="flex justify-between items-center text-slate-500 text-[11px] pt-1">
            <span>Sisa Pelunasan di Gudang (70%):</span>
            <span>${this.formatRupiah(remaining)}</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase text-slate-700 mb-1">Rencana Tanggal Penjemputan Armada *</label>
          <input type="date" id="checkout-pickup-date" value="${defaultPickup}" class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500">
        </div>

        <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-start space-x-2">
          <i class="fa-solid fa-shield-halved text-emerald-600 mt-0.5"></i>
          <span>Dana tersimpan di Rekening Bersama Escrow BURSA LIMBAH. Tiket timbang digital diterbitkan otomatis.</span>
        </div>

        <div class="flex justify-end space-x-3 pt-2">
          <button type="button" onclick="app.closeModals()" class="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition">
            Batal
          </button>
          <button onclick="app.confirmBooking('${p.id}')" class="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5">
            <i class="fa-solid fa-lock"></i>
            <span>Bayar DP & Kunci Pasokan</span>
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
      this.showToast(`Booking ${order.bookingCode} berhasil! Pasokan terkunci.`, 'success');
      this.renderBuyerMarketplace();
      this.renderBuyerOrders();
      this.updateOrderCountBadge();
    } catch (e) {
      this.showToast(e.message, 'error');
    }
  }

  renderBuyerOrders() {
    const orders = this.store.getOrders();
    const container = [REDACTED]'buyer-orders-table-container');
    if (!container) return;

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
            <th class="p-3">Komoditas & Produk</th>
            <th class="p-3">Volume</th>
            <th class="p-3">Total Nilai</th>
            <th class="p-3">DP Terbayar</th>
            <th class="p-3">Sisa 70%</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${orders.map(o => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="p-3 font-mono font-bold text-brand-700">${o.bookingCode}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${o.productTitle}</div>
                <div class="text-[11px] text-slate-500">Penjual: ${o.sellerName}</div>
              </td>
              <td class="p-3 font-semibold text-slate-800">${o.quantity.toLocaleString('id-ID')} ${o.unit}</td>
              <td class="p-3 font-mono font-bold text-slate-900">${this.formatRupiah(o.totalPrice)}</td>
              <td class="p-3 font-mono font-bold text-emerald-600">${this.formatRupiah(o.totalPaidNow)}</td>
              <td class="p-3 font-mono text-slate-600">${this.formatRupiah(o.remainingPayment)}</td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${o.paymentStatus.includes('Lunas') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">
                  ${o.paymentStatus}
                </span>
                <div class="text-[10px] text-slate-500 mt-0.5">Jadwal: ${o.pickupDate}</div>
              </td>
              <td class="p-3 text-right space-x-1">
                <button onclick="app.showBookingReceipt('${o.id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">
                  Surat Jalan
                </button>
              </td>
            </tr>
          `).join('')}
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
        <div class="text-xs font-mono font-bold text-brand-700 mt-1">${o.bookingCode}</div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span class="text-slate-400">Pembeli:</span>
          <div class="font-bold text-slate-900">${o.buyerName}</div>
        </div>
        <div>
          <span class="text-slate-400">Penjual:</span>
          <div class="font-bold text-slate-900">${o.sellerName}</div>
        </div>
        <div>
          <span class="text-slate-400">Komoditas:</span>
          <div class="font-bold text-slate-900">${o.productTitle}</div>
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
    const orders = this.store.getOrders();
    const badge = [REDACTED]'buyer-order-count-badge');
    if (badge) badge.textContent = orders.length;
  }

  // ================= 10. MODUL PENJUAL =================
  renderSellerDashboard() {
    const stats = this.store.getSellerStats();
    [REDACTED]'seller-stat-active').textContent = stats.activeListings;
    [REDACTED]'seller-stat-pending').textContent = stats.pendingListings;
    [REDACTED]'seller-stat-booked').textContent = stats.bookedListings;
    [REDACTED]'seller-stat-balance').textContent = this.formatRupiah(stats.balance);

    this.renderSellerProductsTable();
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
              <td class="p-3 font-mono font-bold">${p.code}</td>
              <td class="p-3">
                <div class="font-bold text-slate-900">${p.title}</div>
                <div class="text-[11px] text-slate-500">${p.categoryName}</div>
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

  showUploadModal() {
    if (!this.store.isSellerAuthenticated()) {
      this.closeModals();
      this.showLoginPage('seller');
      this.showToast("Silakan masuk ke akun Penjual terlebih dahulu untuk mengunggah pasokan limbah.", "warning");
      return;
    }
    const modal = [REDACTED]'modal-upload');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  handleUploadProduct(event) {
    event.preventDefault();
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
    const coords = [REDACTED]'up-coords').value.split(',');

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
      origin,
      city: city || this.store.extractCity(address || origin),
      address,
      lat: coords[0] ? parseFloat(coords[0].trim()) : -6.2088,
      lng: coords[1] ? parseFloat(coords[1].trim()) : 106.8456,
      offerPrice: price,
      totalPrice: qty * price,
      evidences: [
        { type: "Wadah Keseluruhan", url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80", notes: "Wadah penyimpanan tersegel baik" },
        { type: "Kualitas Sampel", url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80", notes: "Sampel fisik bersih bebas pengotor" },
        { type: "Tera Timbangan", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80", notes: "Slip kalibrasi timbangan tera digital sah" }
      ]
    });

    this.closeModals();
    this.showToast("Pasokan limbah berhasil didaftarkan! Menunggu verifikasi tim pengelola.", "success");
    this.renderSellerDashboard();
    this.updateAdminPendingBadge();
  }

  calculateUploadTotal() {
    const qty = Number([REDACTED]'up-qty').value) || 0;
    const price = Number([REDACTED]'up-price').value) || 0;
    const display = [REDACTED]'up-total-display');
    if (display) display.textContent = this.formatRupiah(qty * price);
  }

  // ================= 11. MODAL & UTILITAS =================
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
      'modal-mobile-quick-actions'
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
        avatarWrap.innerHTML = `<img src="${user.avatar}" alt="${user.name}" class="w-full h-full object-cover">`;
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
        verifyStatusText.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> ${user.verifiedBadge || 'Mitra Terverifikasi Resmi'}`;
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
    const tabs = ['info', 'verify', 'tier'];
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

  handleSubmitVerification(event) {
    event.preventDefault();
    const user = this.store.getCurrentUser();
    if (!user) return;

    const radios = document.getElementsByName('verify-doc-type');
    let selectedType = 'ktp';
    radios.forEach(r => { if (r.checked) selectedType = r.value; });

    const ktpNumber = ([REDACTED]'verify-ktp-number') || {}).value || '';
    const npwpNumber = ([REDACTED]'verify-npwp-number') || {}).value || '';

    try {
      this.store.submitUserVerification(user.id, {
        type: selectedType,
        ktpNumber: ktpNumber.trim(),
        npwpNumber: npwpNumber.trim(),
        docUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80'
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
      <option value="${c.id}" data-price="${c.avgPrice}" data-unit="${c.unit}">${c.name} (${this.formatRupiah(c.avgPrice)}/${c.unit})</option>
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
      const dp = Math.round(gross * 0.3);
      const remaining = gross - dp;

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
      [REDACTED]'calc-result-dp').textContent = this.formatRupiah(dp);
      [REDACTED]'calc-result-remaining').textContent = this.formatRupiah(remaining);

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

    const categories = this.store.getCategories();

    if (upCat) {
      upCat.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (filterCat) {
      filterCat.innerHTML = `<option value="all">Semua 10 Kategori</option>` + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    if (pills) {
      pills.innerHTML = `<button onclick="app.filterByPill('all')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-600 text-white">Semua</button>` + categories.map(c => `
        <button onclick="app.filterByPill('${c.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700">
          ${c.name}
        </button>
      `).join('');
    }
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
              <img src="${mainPhoto}" alt="${p.title}" class="w-full h-full object-cover">
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 backdrop-blur-sm text-white">${p.code}</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-600/90 backdrop-blur-sm text-white">${p.categoryName}</span>
              </div>
              <div class="absolute bottom-2 left-2 right-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[11px] text-white flex items-center justify-between">
                <span class="truncate"><i class="fa-solid fa-location-dot text-emerald-400 mr-1"></i>Kota: ${this.getCity(p)}</span>
                <span class="shrink-0 text-emerald-300 font-mono text-[10px]">3 Eviden OK</span>
              </div>
            </div>

            <div class="p-4 space-y-3">
              <div>
                <h4 class="font-bold text-slate-900 text-sm leading-snug line-clamp-2">${p.title}</h4>
                <div class="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <span><i class="fa-solid fa-truck-ramp-box mr-1"></i>${p.containerType}</span>
                  <span>•</span>
                  <span class="font-semibold text-slate-700">${qtyDisplay}</span>
                  <span>•</span>
                  <span class="text-emerald-700 font-semibold flex items-center"><i class="fa-solid fa-city mr-1 text-[10px]"></i>${this.getCity(p)}</span>
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
                <span class="truncate"><i class="fa-solid fa-store mr-1 text-slate-400"></i>${p.sellerName} (${this.getCity(p)})</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0 font-medium">${p.sellerType}</span>
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
}

// Inisialisasi Aplikasi BURSA LIMBAH Saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BursaLimbahApp();
  window.app.init();
});
