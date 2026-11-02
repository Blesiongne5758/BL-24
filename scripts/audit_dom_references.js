const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

const idRegex = /document\.getElementById\(['"]([a-zA-Z0-9_\-]+)['"]\)/g;
let m;
const missing = new Set();
const found = new Set();
while ((m = idRegex.exec(appJs)) !== null) {
  const id = m[1];
  if (indexHtml.includes(`id="${id}"`) || indexHtml.includes(`id='${id}'`)) {
    found.add(id);
  } else {
    missing.add(id);
  }
}

console.log(`Found IDs statically in index.html: ${found.size}`);
console.log(`Missing/Dynamic IDs (${missing.size}):`);

// Check if these missing IDs have null-checks or if they might crash
const missingList = Array.from(missing);
missingList.forEach(id => {
  // Find lines in app.js where this id is used
  const lines = appJs.split(/\r?\n/);
  const occurrences = [];
  lines.forEach((line, idx) => {
    if (line.includes(`getElementById('${id}')`) || line.includes(`getElementById("${id}")`)) {
      occurrences.push({ lineNum: idx + 1, code: line.trim() });
    }
  });

  // Check if safe (optional chaining or if guard)
  let isGuarded = occurrences.every(occ => {
    return occ.code.includes('?.') || 
           occ.code.startsWith('const ') || 
           occ.code.startsWith('let ') || 
           occ.code.includes('if (') || 
           occ.code.includes('|| null') ||
           occ.code.includes('if (!');
  });

  console.log(`- ID: "${id}" (used on lines: ${occurrences.map(o => o.lineNum).join(', ')})${isGuarded ? ' [GUARDED/SAFE]' : ' [NEEDS REVIEW]'}`);
  if (!isGuarded) {
    occurrences.forEach(o => console.log(`   L${o.lineNum}: ${o.code}`));
  }
});
