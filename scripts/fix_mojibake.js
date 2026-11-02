const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace corrupted em-dash
html = html.replace(/Ã¢â‚¬â€ /g, '&mdash;');
html = html.replace(/Ã¢â‚¬â€/g, '&mdash;');

// Replace emoji mojibakes in simulation select
html = html.replace(/<option value="jelantah" data-price="10500" data-unit="Liter">[^<]*Minyak Jelantah/g, '<option value="jelantah" data-price="10500" data-unit="Liter">Minyak Jelantah');
html = html.replace(/<option value="besi" data-price="6200" data-unit="Kg">[^<]*Besi Rongsok/g, '<option value="besi" data-price="6200" data-unit="Kg">Besi Rongsok');
html = html.replace(/<option value="plastik" data-price="4800" data-unit="Kg">[^<]*Plastik PET Bal/g, '<option value="plastik" data-price="4800" data-unit="Kg">Plastik PET Bal');
html = html.replace(/<option value="oli" data-price="4500" data-unit="Liter">[^<]*Oli Bekas Industri/g, '<option value="oli" data-price="4500" data-unit="Liter">Oli Bekas Industri');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Fixed remaining mojibake patterns.');
