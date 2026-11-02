const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// -------------------------------------------------------------
// 1. Fix Limbah B3 button in index.html
// -------------------------------------------------------------
const htmlPath = path.join(ROOT_DIR, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace corrupted Limbah B3 button text
const b3BtnBad = '<span>Ã¢Å¡Â Ã¯Â¸Â  Limbah B3 (Izin KLHK)</span>';
const b3BtnGood = '<span>Limbah B3 (Izin KLHK)</span>';

if (html.includes(b3BtnBad)) {
  html = html.replace(b3BtnBad, b3BtnGood);
  console.log('[OK] Fixed Limbah B3 button text in index.html');
} else {
  // Regex fallback in case of encoding variation
  html = html.replace(/<button id="cat-tab-b3"[^>]*>([\s\S]*?)<\/button>/, (match) => {
    return `<button id="cat-tab-b3" onclick="app.renderPublicCategories('b3')" class="px-4 py-2 rounded-xl text-xs font-bold transition bg-slate-100 text-rose-700 hover:bg-rose-100 flex items-center space-x-1.5 border border-rose-200">
              <i class="fa-solid fa-triangle-exclamation text-rose-600"></i>
              <span>Limbah B3 (Izin KLHK)</span>
            </button>`;
  });
  console.log('[OK] Replaced Limbah B3 button via regex in index.html');
}

// Ensure static header nav-action-container has clean mobile classes
const staticNavOld = `<div id="nav-action-container" class="flex items-center gap-2">
            <button onclick="app.showLoginPage()" class="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-right-to-bracket text-emerald-600"></i>
              <span>Masuk</span>
            </button>
            <button onclick="app.showRegisterOptions()" class="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer">
              <i class="fa-solid fa-user-plus text-amber-300"></i>
              <span>Daftar</span>
            </button>
          </div>`;

const staticNavNew = `<div id="nav-action-container" class="flex items-center gap-1.5 sm:gap-2">
            <button onclick="app.showLoginPage()" class="btn-nav-masuk flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
              <i class="fa-solid fa-right-to-bracket text-emerald-600 text-xs"></i>
              <span>Masuk</span>
            </button>
            <button onclick="app.showRegisterOptions()" class="btn-nav-daftar flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
              <i class="fa-solid fa-user-plus text-amber-300 text-xs"></i>
              <span>Daftar</span>
            </button>
          </div>`;

const staticNavOldCRLF = staticNavOld.replace(/\n/g, '\r\n');
const staticNavNewCRLF = staticNavNew.replace(/\n/g, '\r\n');

if (html.includes(staticNavOldCRLF)) {
  html = html.replace(staticNavOldCRLF, staticNavNewCRLF);
  console.log('[OK] Updated static nav buttons in index.html (CRLF)');
} else if (html.includes(staticNavOld)) {
  html = html.replace(staticNavOld, staticNavNew);
  console.log('[OK] Updated static nav buttons in index.html (LF)');
}

// Bump version in index.html
html = html.replace(/js\/app\.js\?v=\d+/g, 'js/app.js?v=14');
html = html.replace(/js\/store\.js\?v=\d+/g, 'js/store.js?v=14');
html = html.replace(/js\/data\.js\?v=\d+/g, 'js/data.js?v=14');
html = html.replace(/css\/style\.css\?v=\d+/g, 'css/style.css?v=5');

fs.writeFileSync(htmlPath, html, 'utf8');

// -------------------------------------------------------------
// 2. Fix js/app.js: Limbah B3 card link, B3 badge, optgroup, and updateNavUI
// -------------------------------------------------------------
const appJsPath = path.join(ROOT_DIR, 'js/app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// Fix card link: Buka Bursa B3
appJs = appJs.replace(
  /<span>\$\{isB3\s*\?[^:]*Buka Bursa B3[^:]*:\s*'Buka Bursa Pembeli'\}<\/span>/,
  '<span>${isB3 ? \'<i class="fa-solid fa-triangle-exclamation mr-1 text-rose-500"></i> Buka Bursa B3\' : \'Buka Bursa Pembeli\'}</span>'
);

// Fix B3 modal badge
appJs = appJs.replace(
  /âš ï¸ \s*Limbah B3 \(\$\{esc\(p\.b3PermitNumber/,
  '<i class="fa-solid fa-triangle-exclamation mr-1 text-rose-600"></i> Limbah B3 (${esc(p.b3PermitNumber'
);

// Fix optgroup labels
appJs = appJs.replace(
  '<optgroup label="ðŸ“¦ Kategori Utama (12)">',
  '<optgroup label="Kategori Utama (12)">'
);
appJs = appJs.replace(
  '<optgroup label="ðŸ ­ Khusus Industri B2B (3)">',
  '<optgroup label="Khusus Industri B2B (3)">'
);
appJs = appJs.replace(
  '<optgroup label="âš ï¸  Limbah B3 (Izin Khusus KLHK) (1)">',
  '<optgroup label="Limbah B3 (Wajib Izin Khusus KLHK)">'
);

// Fix updateNavUI unauthenticated state to match mobile responsive classes
const navUIOld = `      navContainer.innerHTML = \`
        <button onclick="app.showLoginPage()" class="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 bg-white text-slate-700 shadow-sm transition flex items-center space-x-1.5">
          <i class="fa-solid fa-right-to-bracket text-emerald-600"></i>
          <span>Masuk</span>
        </button>
        <button onclick="app.showRegisterOptions()" class="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center space-x-1.5">
          <i class="fa-solid fa-user-plus text-amber-300"></i>
          <span>Daftar</span>
        </button>
      \`;`;

const navUINew = `      navContainer.innerHTML = \`
        <button onclick="app.showLoginPage()" class="btn-nav-masuk flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-right-to-bracket text-emerald-600 text-xs"></i>
          <span>Masuk</span>
        </button>
        <button onclick="app.showRegisterOptions()" class="btn-nav-daftar flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-user-plus text-amber-300 text-xs"></i>
          <span>Daftar</span>
        </button>
      \`;`;

const navUIOldCRLF = navUIOld.replace(/\n/g, '\r\n');
const navUINewCRLF = navUINew.replace(/\n/g, '\r\n');

if (appJs.includes(navUIOldCRLF)) {
  appJs = appJs.replace(navUIOldCRLF, navUINewCRLF);
  console.log('[OK] Updated updateNavUI in app.js (CRLF)');
} else if (appJs.includes(navUIOld)) {
  appJs = appJs.replace(navUIOld, navUINew);
  console.log('[OK] Updated updateNavUI in app.js (LF)');
} else {
  console.log('[NOTE] navUIOld not matched directly, applying regex replace');
  appJs = appJs.replace(/navContainer\.innerHTML = `[\s\S]*?<i class="fa-solid fa-user-plus text-amber-300"><\/i>[\s\S]*?<span>Daftar<\/span>[\s\S]*?`;/, () => {
    return `navContainer.innerHTML = \`
        <button onclick="app.showLoginPage()" class="btn-nav-masuk flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border border-slate-300 hover:border-emerald-400 hover:text-emerald-700 bg-white text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-right-to-bracket text-emerald-600 text-xs"></i>
          <span>Masuk</span>
        </button>
        <button onclick="app.showRegisterOptions()" class="btn-nav-daftar flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap">
          <i class="fa-solid fa-user-plus text-amber-300 text-xs"></i>
          <span>Daftar</span>
        </button>
      \`;`;
  });
}

fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('[OK] Updated js/app.js');

// -------------------------------------------------------------
// 3. Fix css/style.css mobile navigation button overrides
// -------------------------------------------------------------
const cssPath = path.join(ROOT_DIR, 'css/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Target the restrictive mobile header rule:
const cssTarget = `  header .mobile-header-actions > button,
  header #nav-action-container > button {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 12px;
  }

  header #nav-action-container > button {
    justify-content: center;
    border-color: #dbe5df;
    background: #f0fdf4;
  }`;

const cssRepl = `  /* Hanya tombol icon tunggal (chat) yang berbentuk 34x34px */
  header .mobile-header-actions > button:not(#nav-action-container button) {
    width: 34px;
    height: 34px;
    padding: 0;
    border-radius: 12px;
  }

  /* Tombol Masuk & Daftar pada mobile view: rapi, proporsional & nyaman disentuh */
  header #nav-action-container {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
  }

  header #nav-action-container > button {
    width: auto !important;
    height: auto !important;
    min-height: 32px !important;
    padding: 5px 10px !important;
    border-radius: 10px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    white-space: nowrap !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  header #nav-action-container > button.btn-nav-masuk {
    background: #ffffff !important;
    color: #334155 !important;
    border: 1px solid #cbd5e1 !important;
  }

  header #nav-action-container > button.btn-nav-daftar {
    background: #059669 !important;
    color: #ffffff !important;
    border: 1px solid #059669 !important;
  }`;

const cssTargetCRLF = cssTarget.replace(/\n/g, '\r\n');
const cssReplCRLF = cssRepl.replace(/\n/g, '\r\n');

if (css.includes(cssTargetCRLF)) {
  css = css.replace(cssTargetCRLF, cssReplCRLF);
  console.log('[OK] Updated css/style.css mobile navigation rules (CRLF)');
} else if (css.includes(cssTarget)) {
  css = css.replace(cssTarget, cssRepl);
  console.log('[OK] Updated css/style.css mobile navigation rules (LF)');
} else {
  console.warn('[WARN] cssTarget not found directly in css/style.css, checking fallback');
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('All Limbah B3 and Mobile Navigation fixes completed successfully!');
