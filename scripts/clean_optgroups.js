const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'js/app.js');
let content = fs.readFileSync(appJsPath, 'utf8');

content = content.replace(/<optgroup label="[^"]*Khusus Industri B2B \(3\)">/g, '<optgroup label="Khusus Industri B2B (3)">');
content = content.replace(/<optgroup label="[^"]*Limbah B3 \(Izin Khusus KLHK\) \(1\)">/g, '<optgroup label="Limbah B3 (Wajib Izin Khusus KLHK) (1)">');

fs.writeFileSync(appJsPath, content, 'utf8');
console.log('[OK] Cleaned optgroups in js/app.js');
