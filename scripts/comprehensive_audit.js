/**
 * comprehensive_audit.js
 * Comprehensive automated test and audit suite for Bursa Limbah platform.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function pass(name, detail = '') {
  results.passed++;
  results.details.push({ status: 'PASS', name, detail });
  console.log(`[PASS] ${name}${detail ? ' - ' + detail : ''}`);
}

function fail(name, error) {
  results.failed++;
  results.details.push({ status: 'FAIL', name, error: String(error) });
  console.error(`[FAIL] ${name}: ${error}`);
}

function warn(name, note) {
  results.warnings++;
  results.details.push({ status: 'WARN', name, note });
  console.warn(`[WARN] ${name}: ${note}`);
}

// -------------------------------------------------------------
// 1. Check UTF-8 Encoding & Mojibake
// -------------------------------------------------------------
console.log('\n--- 1. AUDIT: ENCODING & MOJIBAKE ---');
const filesToCheck = [
  'index.html',
  'js/data.js',
  'js/store.js',
  'js/app.js',
  'css/style.css',
  'api/login.php',
  'api/register.php'
];

const mojibakePattern = /(?:Ãƒ|Ã‚|Ã¢â‚¬|Ã°Å¸|Ã¯Â¿Â½)/g;

filesToCheck.forEach(relPath => {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(mojibakePattern);
    if (matches && matches.length > 0) {
      fail(`Mojibake Check: ${relPath}`, `Found ${matches.length} corrupted UTF-8 mojibake sequence(s): ${matches.slice(0, 5).join(', ')}`);
    } else {
      pass(`Mojibake Check: ${relPath}`, 'Clean, valid UTF-8');
    }
  } else {
    warn(`File existence: ${relPath}`, 'File not found');
  }
});

// -------------------------------------------------------------
// 2. Audit Removed Crypto & Legacy Fast-Login References
// -------------------------------------------------------------
console.log('\n--- 2. AUDIT: REMOVED LEGACY FEATURES ---');
const indexHtmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

// Check no crypto tokens or wallet buttons in header/nav
if (indexHtmlContent.includes('0 CLNK') || indexHtmlContent.includes('modal-crypto-wallet')) {
  fail('Crypto Remnants in index.html', 'Found references to CLNK or modal-crypto-wallet');
} else {
  pass('Crypto Remnants in index.html', 'No CLNK or crypto wallet elements found');
}

// Check no 3-card login tab selection
if (indexHtmlContent.includes('portal-buyer-card') || indexHtmlContent.includes('portal-seller-card') || indexHtmlContent.includes('portal-admin-card')) {
  fail('Old 3-card Login Remnants in index.html', 'Found old login portal card IDs');
} else {
  pass('Old 3-card Login Remnants in index.html', 'Unified login card active, old cards removed');
}

// Check no Google OAuth demo button in login area
if (indexHtmlContent.includes('google-signin-btn') || indexHtmlContent.includes('Masuk dengan Akun Google Resmi')) {
  fail('Google OAuth button in index.html', 'Found leftover Google OAuth login button');
} else {
  pass('Google OAuth in index.html', 'No legacy Google OAuth button in login portal');
}

// -------------------------------------------------------------
// 3. HTML DOM IDs & Event Handlers Audit
// -------------------------------------------------------------
console.log('\n--- 3. AUDIT: DOM IDs & INLINE HANDLERS ---');

// Extract all DOM IDs from index.html
const idRegex = /id=["']([a-zA-Z0-9_\-]+)["']/g;
const domIds = new Set();
let match;
while ((match = idRegex.exec(indexHtmlContent)) !== null) {
  domIds.add(match[1]);
}
pass('DOM IDs extracted', `Found ${domIds.size} unique element IDs in index.html`);

// Essential page views
const requiredViews = [
  'view-public',
  'view-buyer',
  'view-seller',
  'view-admin',
  'view-login'
];
requiredViews.forEach(v => {
  if (domIds.has(v)) {
    pass(`View Element: #${v}`, 'Found in index.html');
  } else {
    fail(`View Element: #${v}`, 'Missing from index.html!');
  }
});

// Essential public tabs
const requiredTabs = [
  'tab-home',
  'tab-sell',
  'tab-subscription',
  'tab-simulation',
  'tab-solutions',
  'tab-cari',
  'tab-event',
  'tab-pesan',
  'tab-saya'
];
requiredTabs.forEach(t => {
  if (domIds.has(t)) {
    pass(`Public Tab: #${t}`, 'Found in index.html');
  } else {
    fail(`Public Tab: #${t}`, 'Missing from index.html!');
  }
});

// Unified Login DOM Elements
const requiredLoginElements = [
  'form-login-account',
  'login-input-identifier',
  'login-input-password',
  'login-remember-me',
  'login-submit-btn',
  'login-alert-box',
  'login-alert-msg',
  'modal-register-choice'
];
requiredLoginElements.forEach(elId => {
  if (domIds.has(elId)) {
    pass(`Unified Login Element: #${elId}`, 'Found');
  } else {
    fail(`Unified Login Element: #${elId}`, 'Missing from index.html!');
  }
});

// -------------------------------------------------------------
// 4. Mock Browser & Test Store Functions in Node
// -------------------------------------------------------------
console.log('\n--- 4. AUDIT: STORE & STATE LOGIC UNIT TESTS ---');

// Mock localStorage
const localStorageStore = {};
global.localStorage = {
  getItem: (key) => localStorageStore[key] || null,
  setItem: (key, val) => { localStorageStore[key] = String(val); },
  removeItem: (key) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

// Mock window and document
global.window = {
  location: {
    hostname: 'localhost',
    port: '3000',
    protocol: 'http:',
    pathname: '/',
    origin: 'http://localhost:3000'
  }
};
global.document = {
  getElementById: (id) => null,
  querySelectorAll: () => [],
  querySelector: () => null
};

// Load data.js and store.js
try {
  let dataCode = fs.readFileSync(path.join(ROOT_DIR, 'js/data.js'), 'utf8');
  // Expose top-level const definitions to global for store initialization in Node
  dataCode = dataCode.replace(/^const\s+([A-Za-z0-9_]+)\s*=/gm, 'global.$1 =');
  eval(dataCode); // Populates INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_PRODUCTS, etc.

  let storeCode = fs.readFileSync(path.join(ROOT_DIR, 'js/store.js'), 'utf8');
  eval(storeCode); // Populates window.bursaLimbahStore

  const store = global.window.bursaLimbahStore;
  if (!store) throw new Error('window.bursaLimbahStore failed to initialize');
  pass('Store Initialization', 'Store instance created successfully');

  // Test 4.1: Verify Users Loaded
  const users = store.state.users;
  if (Array.isArray(users) && users.length > 0) {
    pass('Store Users Count', `Loaded ${users.length} initial users`);
  } else {
    fail('Store Users Count', 'No users found in store');
  }

  // Test 4.2: Verify Categories Loaded
  const categories = store.getCategories();
  if (Array.isArray(categories) && categories.length > 0) {
    pass('Store Categories Count', `Loaded ${categories.length} categories`);
  } else {
    fail('Store Categories Count', 'No categories found in store');
  }

  // Test 4.3: Verify Products Loaded
  const products = store.getProducts();
  if (Array.isArray(products) && products.length > 0) {
    pass('Store Products Count', `Loaded ${products.length} products`);
  } else {
    fail('Store Products Count', 'No products found in store');
  }

  // Test 4.4: Role-based Login Test Cases
  // Buyer Login by email
  const buyerUser = users.find(u => u.role === 'buyer') || { email: 'buyer@bursalimbah.com' };
  const buyerLoginRes = store.loginUser(buyerUser.email, '123456');
  if (buyerLoginRes.success && buyerLoginRes.role === 'buyer') {
    pass('Login as Buyer (email)', `Logged in as buyer: ${buyerUser.email}`);
  } else {
    fail('Login as Buyer (email)', `Expected success for buyer, got: ${JSON.stringify(buyerLoginRes)}`);
  }

  // Seller Login by email
  const sellerUser = users.find(u => u.role === 'seller') || { email: 'seller@bursalimbah.com' };
  const sellerLoginRes = store.loginUser(sellerUser.email, '123456');
  if (sellerLoginRes.success && sellerLoginRes.role === 'seller') {
    pass('Login as Seller (email)', `Logged in as seller: ${sellerUser.email}`);
  } else {
    fail('Login as Seller (email)', `Expected success for seller, got: ${JSON.stringify(sellerLoginRes)}`);
  }

  // Admin Login by email
  const adminUser = users.find(u => u.role === 'admin') || { email: 'admin@bursalimbah.com' };
  const adminLoginRes = store.loginUser(adminUser.email, 'admin');
  if (adminLoginRes.success && adminLoginRes.role === 'admin') {
    pass('Login as Admin (email)', `Logged in as admin: ${adminUser.email}`);
  } else {
    fail('Login as Admin (email)', `Expected success for admin, got: ${JSON.stringify(adminLoginRes)}`);
  }

  // Admin Login by username
  if (adminUser.username) {
    const adminUsernameRes = store.loginUser(adminUser.username, 'admin');
    if (adminUsernameRes.success && adminUsernameRes.role === 'admin') {
      pass('Login as Admin (username)', `Logged in as admin username: ${adminUser.username}`);
    } else {
      fail('Login as Admin (username)', `Failed username login: ${JSON.stringify(adminUsernameRes)}`);
    }
  }

  // Login with invalid password
  const invalidPassRes = store.loginUser(adminUser.email, 'wrong_password_xyz');
  if (!invalidPassRes.success) {
    pass('Login with Invalid Password', 'Correctly rejected invalid password');
  } else {
    fail('Login with Invalid Password', 'Unexpectedly accepted invalid password');
  }

  // Login with non-existent user
  const nonexistentRes = store.loginUser('nobody@nowhere9988.com', '123456');
  if (!nonexistentRes.success) {
    pass('Login with Nonexistent User', 'Correctly rejected nonexistent account');
  } else {
    fail('Login with Nonexistent User', 'Unexpectedly accepted nonexistent user');
  }

  // Test 4.5: User Registration (Buyer & Seller)
  const newBuyer = store.registerBuyer({
    name: 'PT Daur Ulang Nusantara',
    email: 'nusantara@daurulang.co.id',
    phone: '081234567890',
    company: 'PT Daur Ulang Nusantara',
    password: 'password123',
    tierId: 'tier_starter'
  });
  if (newBuyer && newBuyer.role === 'buyer') {
    pass('Register New Buyer', `Successfully registered buyer with ID: ${newBuyer.id}`);
  } else {
    fail('Register New Buyer', `Failed: ${JSON.stringify(newBuyer)}`);
  }

  const newSeller = store.registerSeller({
    name: 'Bank Sampah Berkah Mandiri',
    email: 'berkah@banksampah.org',
    phone: '081987654321',
    company: 'Bank Sampah Berkah Mandiri',
    location: 'Surabaya, Jawa Timur',
    password: 'password123'
  });
  if (newSeller && newSeller.role === 'seller') {
    pass('Register New Seller', `Successfully registered seller with ID: ${newSeller.id}`);
  } else {
    fail('Register New Seller', `Failed: ${JSON.stringify(newSeller)}`);
  }

  // Test 4.6: Create Listing / Product Test
  const newProductData = {
    title: 'Limbah Plastik HDPE Flakes Bersih',
    categoryId: categories[0]?.id || 'cat-1',
    categoryName: categories[0]?.name || 'Plastik',
    offerPrice: 8500,
    unit: 'Kg',
    weight: 1500,
    sellerId: newSeller.id,
    sellerName: newSeller.name,
    location: 'Surabaya, Jawa Timur',
    description: 'Flakes HDPE bersih siap proses, kadar air < 1%',
    status: 'approved',
    moq: 500
  };
  const createdProd = store.addProduct(newProductData);
  if (createdProd && createdProd.id) {
    pass('Add Product / Listing', `Product created with ID: ${createdProd.id} (Initial status: ${createdProd.status})`);
    const foundProd = store.getProductById(createdProd.id);
    if (foundProd && foundProd.title === newProductData.title) {
      pass('Fetch Product by ID', 'Retrieved newly created product accurately');
    } else {
      fail('Fetch Product by ID', 'Could not retrieve created product');
    }

    // Admin verifies & approves the listing
    const approvedProd = store.updateProductStatus(createdProd.id, 'approved', 'Disetujui oleh Pengelola Pusat');
    if (approvedProd && approvedProd.status === 'approved') {
      pass('Admin Listing Approval', `Listing ${createdProd.id} successfully approved by Admin`);
    } else {
      fail('Admin Listing Approval', 'Failed to approve listing');
    }
  } else {
    fail('Add Product / Listing', 'Failed to add product');
  }

  // Test 4.7: Tier Subscription Limits & Escrow DP 30% Booking
  // Step A: Verify starter quota enforcement (1500 Kg exceeds 200 Kg limit)
  try {
    store.createBooking({
      productId: createdProd.id,
      buyerId: newBuyer.id,
      pickupDate: '2026-11-10',
      notes: 'Testing quota enforcement'
    });
    fail('Starter Tier Quota Check', 'Expected rejection of 1500 Kg for starter tier');
  } catch (err) {
    pass('Starter Tier Quota Check', `Properly blocked over-limit booking: ${err.message}`);
  }

  // Step B: Book with Enterprise Buyer (PT Hijau Lestari Industri)
  const enterpriseBuyer = users.find(u => u.email === 'pengadaan@hijaulestari.co.id') || newBuyer;
  // Upgrade buyer or use enterprise buyer
  enterpriseBuyer.subscriptionTier = 'tier_enterprise';
  enterpriseBuyer.subscriptionActive = true;

  const newBooking = store.createBooking({
    productId: createdProd.id,
    buyerId: enterpriseBuyer.id,
    pickupDate: '2026-11-10',
    notes: 'Testing pesanan escrow DP 30%'
  });

  if (newBooking && newBooking.id) {
    pass('Create Order with Escrow DP 30%', `Order ID: ${newBooking.id}, DP 30%: Rp ${newBooking.downPaymentAmount.toLocaleString('id-ID')}, Total: Rp ${newBooking.totalPrice.toLocaleString('id-ID')}`);
    
    // Complete order
    const completedOrder = store.completeOrder(newBooking.id);
    if (completedOrder && completedOrder.bookingStatus === 'Selesai & Diterima') {
      pass('Complete Order Status', 'Updated to Selesai & Diterima');
    } else {
      fail('Complete Order Status', 'Failed to complete order');
    }
  } else {
    fail('Create Order with Escrow DP', 'Failed to create booking');
  }

} catch (err) {
  fail('Store Logic Execution', err.stack || err);
}

// -------------------------------------------------------------
// 5. Audit Inline Handlers in index.html against App Methods
// -------------------------------------------------------------
console.log('\n--- 5. AUDIT: INLINE EVENT HANDLERS VS APP METHODS ---');
try {
  const appCode = fs.readFileSync(path.join(ROOT_DIR, 'js/app.js'), 'utf8');
  
  // Extract method names defined in class App (both sync and async)
  const methodRegex = /^\s{2}(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/gm;
  const appMethods = new Set();
  let m;
  while ((m = methodRegex.exec(appCode)) !== null) {
    appMethods.add(m[1]);
  }
  pass('App Methods Extracted', `Found ${appMethods.size} methods in class App`);

  // Extract inline calls: app.methodName(...)
  const handlerRegex = /on(?:click|submit|change|input)=["'][^"']*app\.([a-zA-Z0-9_]+)\(/g;
  const calledMethods = new Set();
  while ((m = handlerRegex.exec(indexHtmlContent)) !== null) {
    calledMethods.add(m[1]);
  }
  pass('Called Inline Methods Extracted', `Found ${calledMethods.size} unique methods called via onclick/onsubmit/etc.`);

  let missingMethods = [];
  calledMethods.forEach(method => {
    if (!appMethods.has(method)) {
      missingMethods.push(method);
    }
  });

  if (missingMethods.length === 0) {
    pass('Inline Handler Method Validation', 'All called inline methods exist on class App!');
  } else {
    warn('Missing App Methods', `Inline handlers call methods not directly matched: ${missingMethods.join(', ')}`);
  }
} catch (err) {
  fail('App Method Audit', err.message);
}

// -------------------------------------------------------------
// 6. Summary Report
// -------------------------------------------------------------
console.log('\n=======================================');
console.log('AUDIT SUMMARY');
console.log(`Passed:   ${results.passed}`);
console.log(`Failed:   ${results.failed}`);
console.log(`Warnings: ${results.warnings}`);
console.log('=======================================\n');

if (results.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
