const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'js/app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

// Replace any leftover mojibake around Limbah B3
content = content.replace(
  /[^\n\r]*Limbah B3 \(\$\{esc\(p\.b3PermitNumber/g,
  '                    <i class="fa-solid fa-triangle-exclamation mr-1 text-rose-600"></i> Limbah B3 (${esc(p.b3PermitNumber'
);

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('[OK] Cleaned line 2509 in js/app.js');
