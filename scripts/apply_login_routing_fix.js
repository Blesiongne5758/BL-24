const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const appJsPath = path.join(ROOT_DIR, 'js/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Update init() in js/app.js with try/catches and setupUrlRouting()
const initTarget = `    // Render tampilan modul awal
    this.renderBuyerMarketplace();
    this.renderSellerDashboard();
    this.renderAdminDashboard();
    this.updateAdminPendingBadge();
    this.updateAdminSubPendingBadge();
    this.updateAdminTicketsBadge();
    this.updateChatUnreadBadge();
    this.updateNavUI();
    this.applyFeatureFlags();
  }`;

const initRepl = `    // Render tampilan modul awal
    try { this.renderBuyerMarketplace(); } catch (e) { console.warn('Init buyer error:', e); }
    try { this.renderSellerDashboard(); } catch (e) { console.warn('Init seller error:', e); }
    try { this.renderAdminDashboard(); } catch (e) { console.warn('Init admin error:', e); }
    try { this.updateAdminPendingBadge(); } catch (e) {}
    try { this.updateAdminSubPendingBadge(); } catch (e) {}
    try { this.updateAdminTicketsBadge(); } catch (e) {}
    try { this.updateChatUnreadBadge(); } catch (e) {}
    try { this.updateNavUI(); } catch (e) { console.warn('Init nav error:', e); }
    try { this.applyFeatureFlags(); } catch (e) {}

    // Dukungan navigasi URL langsung (#login, #daftar, ?action=login)
    this.setupUrlRouting();
  }

  setupUrlRouting() {
    window.addEventListener('hashchange', () => this.handleRouteFromUrl());
    this.handleRouteFromUrl();
  }

  handleRouteFromUrl() {
    try {
      const hash = (window.location.hash || '').toLowerCase().replace('#', '').trim();
      const params = new URLSearchParams(window.location.search || '');
      const action = params.get('action') || params.get('page') || params.get('tab') || hash;
      if (!action) return;
      if (action === 'login' || action === 'masuk') {
        this.showLoginPage();
      } else if (action === 'register' || action === 'daftar') {
        this.showRegisterOptions();
      } else if (action === 'daftar-pembeli' || action === 'register-buyer') {
        this.showBuyerRegisterModal(null, true);
      } else if (action === 'daftar-penjual' || action === 'register-seller') {
        this.showSellerRegisterModal(true);
      } else if (action === 'jual' || action === 'sell') {
        this.switchAppTab('sell');
      } else if (action === 'langganan' || action === 'subscription' || action === 'sub') {
        this.switchAppTab('sub');
      } else if (action === 'simulasi' || action === 'sim') {
        this.switchAppTab('sim');
      } else if (action === 'solutions' || action === 'solusi') {
        this.switchAppTab('solutions');
      }
    } catch (e) {
      console.warn('Router parse error:', e);
    }
  }`;

// Handle both CRLF and LF
const initTargetCRLF = initTarget.replace(/\n/g, '\r\n');
const initReplCRLF = initRepl.replace(/\n/g, '\r\n');

if (appJs.includes(initTargetCRLF)) {
  appJs = appJs.replace(initTargetCRLF, initReplCRLF);
  console.log('[OK] Updated init() and added setupUrlRouting() (CRLF)');
} else if (appJs.includes(initTarget)) {
  appJs = appJs.replace(initTarget, initRepl);
  console.log('[OK] Updated init() and added setupUrlRouting() (LF)');
} else {
  console.warn('[WARN] initTarget not found in app.js');
}

// 2. Update renderTabSaya unauthenticated view
const sayaTarget = `        <div class="space-y-2">
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

const sayaRepl = `        <div class="space-y-2">
          <button onclick="app.showLoginPage()" class="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold transition active:scale-98 text-left shadow-md shadow-emerald-600/20 cursor-pointer">
            <i class="fa-solid fa-right-to-bracket text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold">Masuk ke Akun</p>
              <p class="text-[10px] text-emerald-100">Portal tunggal: Pembeli, Penjual & Admin</p>
            </div>
            <i class="fa-solid fa-chevron-right text-emerald-200 text-xs ml-auto"></i>
          </button>
          <button onclick="app.showRegisterOptions()" class="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 transition active:scale-98 text-left shadow-2xs cursor-pointer">
            <i class="fa-solid fa-user-plus text-emerald-600 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Daftar Akun Baru</p>
              <p class="text-[10px] text-slate-500">Pilih peran sebagai Pembeli atau Mitra Penjual</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
          <button onclick="app.switchAppTab('sub')" class="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-98 text-left cursor-pointer">
            <i class="fa-solid fa-crown text-amber-500 text-lg w-7 text-center"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Lihat Paket Berlangganan</p>
              <p class="text-[10px] text-slate-500">Akses data harga, GPS & kontak penjual</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-400 text-xs ml-auto"></i>
          </button>
        </div>`;

const sayaTargetCRLF = sayaTarget.replace(/\n/g, '\r\n');
const sayaReplCRLF = sayaRepl.replace(/\n/g, '\r\n');

if (appJs.includes(sayaTargetCRLF)) {
  appJs = appJs.replace(sayaTargetCRLF, sayaReplCRLF);
  console.log('[OK] Updated renderTabSaya unauthenticated view (CRLF)');
} else if (appJs.includes(sayaTarget)) {
  appJs = appJs.replace(sayaTarget, sayaRepl);
  console.log('[OK] Updated renderTabSaya unauthenticated view (LF)');
} else {
  console.warn('[WARN] sayaTarget not found in app.js');
}

fs.writeFileSync(appJsPath, appJs, 'utf8');

// 3. Update index.html static navbar action container
const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

const navOld = `<div id="nav-action-container" class="flex items-center gap-1.5">
            <button onclick="app.showLoginPage()" class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-user text-emerald-600"></i>
              <span class="mobile-header-login-label hidden sm:inline">Akun / Masuk</span>
            </button>
          </div>`;

const navNew = `<div id="nav-action-container" class="flex items-center gap-2">
            <button onclick="app.showLoginPage()" class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-right-to-bracket text-emerald-600"></i>
              <span>Masuk</span>
            </button>
            <button onclick="app.showRegisterOptions()" class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-user-plus text-amber-300"></i>
              <span>Daftar</span>
            </button>
          </div>`;

const navOldCRLF = navOld.replace(/\n/g, '\r\n');
const navNewCRLF = navNew.replace(/\n/g, '\r\n');

if (html.includes(navOldCRLF)) {
  html = html.replace(navOldCRLF, navNewCRLF);
  console.log('[OK] Updated static nav-action-container in index.html (CRLF)');
} else if (html.includes(navOld)) {
  html = html.replace(navOld, navNew);
  console.log('[OK] Updated static nav-action-container in index.html (LF)');
} else {
  console.warn('[WARN] navOld not found in index.html');
}

// 4. Update asset cache-buster in index.html to v=13
html = html.replace(/js\/app\.js\?v=\d+/g, 'js/app.js?v=13');
html = html.replace(/js\/store\.js\?v=\d+/g, 'js/store.js?v=13');
html = html.replace(/js\/data\.js\?v=\d+/g, 'js/data.js?v=13');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log('[OK] Asset versions bumped to v=13');

// 5. Update .htaccess for clean login/register URL rewrites
const htaccessPath = path.join(ROOT_DIR, '.htaccess');
let htaccess = fs.readFileSync(htaccessPath, 'utf8');

const rewriteOld = `# 7. Clean URL Rewrites & Preflight Options
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Handle OPTIONS method for CORS preflight
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</IfModule>`;

const rewriteNew = `# 7. Clean URL Rewrites & Preflight Options
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Handle OPTIONS method for CORS preflight
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]

    # Friendly URL redirects for login and registration
    RewriteRule ^login/?$ index.html#login [NE,L,R=302]
    RewriteRule ^masuk/?$ index.html#login [NE,L,R=302]
    RewriteRule ^daftar/?$ index.html#daftar [NE,L,R=302]
    RewriteRule ^register/?$ index.html#daftar [NE,L,R=302]
</IfModule>`;

const rewriteOldCRLF = rewriteOld.replace(/\n/g, '\r\n');
const rewriteNewCRLF = rewriteNew.replace(/\n/g, '\r\n');

if (htaccess.includes(rewriteOldCRLF)) {
  htaccess = htaccess.replace(rewriteOldCRLF, rewriteNewCRLF);
  console.log('[OK] Updated .htaccess rewrites (CRLF)');
} else if (htaccess.includes(rewriteOld)) {
  htaccess = htaccess.replace(rewriteOld, rewriteNew);
  console.log('[OK] Updated .htaccess rewrites (LF)');
} else {
  console.warn('[WARN] rewriteOld not found in .htaccess');
}

fs.writeFileSync(htaccessPath, htaccess, 'utf8');
console.log('All login and registration workflow updates applied successfully!');
