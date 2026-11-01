const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Fix the title
html = html.replace(/<title>BURSA LIMBAH.*?Limbah Terverifikasi\. Transaksi Terpercaya\.<\/title>/i, 
  '<title>BURSA LIMBAH &mdash; Limbah Terverifikasi. Transaksi Terpercaya.</title>');

// 2. Fix the 3 Source Cards (Rumah Tangga, Industri Menengah, Industri Besar)
const sourceCardsRegex = /<div id="up-source-cards" class="grid grid-cols-3 gap-2\.5">[\s\S]*?<\/div>(\s*<input type="hidden" id="up-source-type")/i;

const replacementSourceCards = `<div id="up-source-cards" class="grid grid-cols-3 gap-2.5">
            <button type="button" onclick="app.selectSourceTier('source_household')"
              id="source-card-household"
              class="source-card group p-3 rounded-2xl border-2 border-slate-200 bg-white text-center transition-all duration-200 hover:shadow-lg hover:border-emerald-400 cursor-pointer active:scale-[0.97]">
              <div class="text-3xl mb-1.5 text-emerald-600 flex items-center justify-center">
                <i class="fa-solid fa-house-chimney"></i>
              </div>
              <div class="font-bold text-xs text-slate-800 group-hover:text-emerald-700">Rumah Tangga</div>
              <div class="text-[10px] text-slate-400 leading-tight mt-0.5">Perorangan / Bank Sampah / RT</div>
            </button>
            <button type="button" onclick="app.selectSourceTier('source_medium_industry')"
              id="source-card-medium"
              class="source-card group p-3 rounded-2xl border-2 border-slate-200 bg-white text-center transition-all duration-200 hover:shadow-lg hover:border-blue-400 cursor-pointer active:scale-[0.97]">
              <div class="text-3xl mb-1.5 text-blue-600 flex items-center justify-center">
                <i class="fa-solid fa-building"></i>
              </div>
              <div class="font-bold text-xs text-slate-800 group-hover:text-blue-700">Industri Menengah</div>
              <div class="text-[10px] text-slate-400 leading-tight mt-0.5">UMKM / Bengkel / Percetakan</div>
            </button>
            <button type="button" onclick="app.selectSourceTier('source_large_industry')"
              id="source-card-large"
              class="source-card group p-3 rounded-2xl border-2 border-slate-200 bg-white text-center transition-all duration-200 hover:shadow-lg hover:border-amber-400 cursor-pointer active:scale-[0.97]">
              <div class="text-3xl mb-1.5 text-amber-600 flex items-center justify-center">
                <i class="fa-solid fa-industry"></i>
              </div>
              <div class="font-bold text-xs text-slate-800 group-hover:text-amber-700">Industri Besar</div>
              <div class="text-[10px] text-slate-400 leading-tight mt-0.5">Pabrik / Kawasan Industri</div>
            </button>
          </div>$1`;

if (sourceCardsRegex.test(html)) {
  html = html.replace(sourceCardsRegex, replacementSourceCards);
  console.log('[OK] Replaced 3 source cards with FontAwesome icons');
} else {
  console.log('[WARN] sourceCardsRegex did not match');
}

// 3. Fix Stories Icons (Strip Discovery Highlights)
// Story 1: Jelantah
html = html.replace(/(<!-- Story 1: Jelantah -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-droplet text-amber-500"></i>$2');

// Story 2: Besi Scrap
html = html.replace(/(<!-- Story 2: Besi Scrap -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-cubes-stacked text-blue-500"></i>$2');

// Story 3: Plastik PET
html = html.replace(/(<!-- Story 3: Plastik PET -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-recycle text-emerald-500"></i>$2');

// Story 4: Kardus OCC
html = html.replace(/(<!-- Story 4: Kardus OCC -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-box text-amber-700"></i>$2');

// Story 5: PreLoved
html = html.replace(/(<!-- Story 5: PreLoved Mesin -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-heart text-pink-500"></i>$2');

// Story 6: Event Lelang
html = html.replace(/(<!-- Story 6: Event Lelang -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-calendar-days text-indigo-500"></i>$2');

// Story 7: Kalkulator ESG
html = html.replace(/(<!-- Story 7: Kalkulator ESG -->[\s\S]*?<div class="w-full h-full rounded-full bg-white flex items-center justify-center text-lg overflow-hidden">)[\s\S]*?(<\/div>)/i,
  '$1<i class="fa-solid fa-calculator text-emerald-600"></i>$2');

// 4. Fix Category chips
html = html.replace(/<span>[^<]*?Jelantah<\/span>/gi, '<span><i class="fa-solid fa-droplet text-amber-500 mr-1"></i>Jelantah</span>');
html = html.replace(/<span>[^<]*?Besi Scrap<\/span>/gi, '<span><i class="fa-solid fa-cubes-stacked text-blue-500 mr-1"></i>Besi Scrap</span>');
html = html.replace(/<span>[^<]*?Plastik PET<\/span>/gi, '<span><i class="fa-solid fa-recycle text-emerald-500 mr-1"></i>Plastik PET</span>');
html = html.replace(/<span>[^<]*?Kardus OCC<\/span>/gi, '<span><i class="fa-solid fa-box text-amber-700 mr-1"></i>Kardus OCC</span>');
html = html.replace(/<span>[^<]*?Oli Bekas<\/span>/gi, '<span><i class="fa-solid fa-oil-can text-slate-600 mr-1"></i>Oli Bekas</span>');
html = html.replace(/<span>[^<]*?Tembaga<\/span>/gi, '<span><i class="fa-solid fa-bolt text-amber-500 mr-1"></i>Tembaga</span>');

// 5. Bump version to v=10 for cache-busting
html = html.replace(/js\/data\.js\?v=\d+/g, 'js/data.js?v=10');
html = html.replace(/js\/store\.js\?v=\d+/g, 'js/store.js?v=10');
html = html.replace(/js\/app\.js\?v=\d+/g, 'js/app.js?v=10');

fs.writeFileSync('index.html', html, 'utf8');
console.log('[SUCCESS] index.html updated and saved as clean UTF-8');
