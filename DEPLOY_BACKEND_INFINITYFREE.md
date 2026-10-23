# Deployment Backend BL-24 untuk Frontend InfinityFree

Dokumen ini menjelaskan cara menjalankan backend Node.js BL-24 ketika frontend di-host pada InfinityFree.

## Arsitektur yang disarankan

```text
Browser
  |
  | HTTPS
  v
Frontend HTML/CSS/JS di InfinityFree
  |
  | HTTPS + CORS_ORIGIN
  v
Backend Node.js BL-24 di VPS / Railway / Render
  |
  | private network atau TLS database
  v
MySQL staging/production
```

InfinityFree cocok untuk file frontend static/PHP dan menyediakan MySQL serta SSL. Backend BL-24 tetap dijalankan pada layanan yang mendukung proses Node.js. Jangan menaruh `JWT_SECRET`, password MySQL, atau credential storage di frontend InfinityFree.

## File environment

Gunakan [server/.env.staging.example](server/.env.staging.example) sebagai template. Jangan membuat commit untuk `server/.env` yang berisi nilai nyata.

Generate JWT secret:

```bash
openssl rand -hex 32
```

Nilai minimum yang wajib diganti sebelum deploy:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGIN`
- credential object storage
- `GOOGLE_CLIENT_ID` jika Google OAuth akan diaktifkan

Pastikan:

```dotenv
NODE_ENV=production
DEMO_MODE=false
CORS_ORIGIN=https://domain-frontend-anda.example
```

`CORS_ORIGIN` harus berisi origin frontend yang tepat, tanpa path. Jika frontend juga dapat dibuka dengan `www`, masukkan kedua origin dengan koma.

## Persiapan database MySQL

Buat database staging terpisah dan jangan gunakan database production untuk pengujian:

```bash
mysql -h "$MYSQL_HOST" -u root -p
```

```sql
CREATE DATABASE bursalimbah_staging
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'bursalimbah_staging'@'%'
  IDENTIFIED BY 'PASSWORD_STAGING_KUAT';

GRANT ALL PRIVILEGES ON bursalimbah_staging.*
  TO 'bursalimbah_staging'@'%';

FLUSH PRIVILEGES;
```

Import skema dari mesin yang aman:

```bash
mysql -h "$MYSQL_HOST" \
  -u bursalimbah_staging \
  -p \
  bursalimbah_staging \
  < database/setup_complete.sql
```

Buat akun uji menggunakan:

```text
database/create_staging_accounts.sql
```

Skrip tersebut hanya menerima bcrypt hash dan tidak menyimpan password plaintext.

## Persiapan kode

Dari root repository:

```bash
git checkout security-hardening-2026-10-23
git pull --ff-only
cd server
npm ci --omit=dev
node --check server.js
```

Uji lokal dengan environment staging hanya jika database dapat dijangkau:

```bash
set -a
. ./server/.env
set +a
npm start
```

Health check:

```bash
curl -fsS http://127.0.0.1:5000/api/health | jq
```

Health check harus menunjukkan database terhubung sebelum backend dipasang ke frontend.

## Opsi A: VPS Ubuntu

### 1. Siapkan server

Gunakan VPS staging dengan Ubuntu LTS dan alamat IP publik. VPS gratis sering memiliki batas CPU, penyimpanan, suspend, atau masa berlaku; gunakan untuk staging, bukan transaksi production tanpa backup dan monitoring.

Di VPS:

```bash
sudo apt update
sudo apt install -y git curl nginx mysql-client ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

Buat user deploy non-root:

```bash
sudo adduser --disabled-password --gecos '' bursalimbah
sudo mkdir -p /srv/bursalimbah
sudo chown -R bursalimbah:bursalimbah /srv/bursalimbah
```

### 2. Deploy backend

```bash
sudo -u bursalimbah git clone \
  https://github.com/Blesiongne5758/BL-24.git \
  /srv/bursalimbah/BL-24

cd /srv/bursalimbah/BL-24/server
sudo -u bursalimbah npm ci --omit=dev
sudo -u bursalimbah mkdir -p uploads backups logs
```

Buat environment file secara interaktif:

```bash
sudo -u bursalimbah nano /srv/bursalimbah/BL-24/server/.env
sudo chmod 600 /srv/bursalimbah/BL-24/server/.env
```

Salin variabel dari [server/.env.staging.example](server/.env.staging.example), lalu isi secret melalui password manager.

### 3. Buat service systemd

Buat `/etc/systemd/system/bursalimbah-api.service`:

```ini
[Unit]
Description=BL-24 Node.js API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=bursalimbah
Group=bursalimbah
WorkingDirectory=/srv/bursalimbah/BL-24/server
EnvironmentFile=/srv/bursalimbah/BL-24/server/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/srv/bursalimbah/BL-24/server/uploads /srv/bursalimbah/BL-24/server/backups /srv/bursalimbah/BL-24/server/logs

[Install]
WantedBy=multi-user.target
```

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bursalimbah-api
sudo systemctl status bursalimbah-api
journalctl -u bursalimbah-api -f
```

### 4. Pasang reverse proxy HTTPS

Gunakan Nginx di depan Node.js. Contoh `/etc/nginx/sites-available/api-staging`:

```nginx
server {
    listen 80;
    server_name api-staging.example.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/api-staging /etc/nginx/sites-enabled/api-staging
sudo nginx -t
sudo systemctl reload nginx
```

Pasang sertifikat menggunakan Certbot atau sertifikat TLS dari provider Anda:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api-staging.example.com
```

Setelah HTTPS aktif, ubah `CORS_ORIGIN` agar hanya menunjuk ke domain InfinityFree dan restart service:

```bash
sudo systemctl restart bursalimbah-api
```

## Opsi B: Railway

Railway dapat deploy service Express/Node.js dari GitHub atau CLI. Railway menyediakan variables pada level service dan variable tersebut tersedia saat build maupun runtime. Review dan deploy perubahan variables sebelum menganggap konfigurasi aktif.

### 1. Buat service

1. Buka Railway Dashboard.
2. Buat project baru.
3. Pilih **Deploy from GitHub repo**.
4. Pilih `Blesiongne5758/BL-24`.
5. Atur service root directory ke `server` jika dashboard menyediakan opsi tersebut.
6. Build command: `npm ci --omit=dev`.
7. Start command: `npm start`.
8. Generate public domain pada menu Networking.

Jika root directory tidak dapat diatur, gunakan command:

```bash
cd server && npm ci --omit=dev
```

dan:

```bash
cd server && npm start
```

### 2. Isi variables

Masukkan variable dari [server/.env.staging.example](server/.env.staging.example) pada tab **Variables**. Jangan meng-commit file environment berisi nilai nyata.

Railway otomatis menyediakan `PORT`; backend harus menggunakannya. Repository saat ini membaca `process.env.PORT`.

Jika menggunakan MySQL eksternal, isi:

```dotenv
DB_HOST=<mysql-host>
DB_PORT=3306
DB_USER=<staging-user>
DB_PASSWORD=<staging-password>
DB_NAME=bursalimbah_staging
```

Railway guide umumnya menggunakan PostgreSQL, sedangkan BL-24 saat ini menggunakan `mysql2`. Jangan memasang PostgreSQL tanpa mengubah kode database secara menyeluruh. Gunakan MySQL eksternal atau layanan MySQL yang kompatibel.

### 3. Deploy dan verifikasi

Setelah variables disimpan dan perubahan di-deploy:

```bash
curl -fsS https://<service>.up.railway.app/api/health | jq
```

Periksa log service. Backend harus menunjukkan database connected dan tidak boleh menampilkan nilai environment.

Gunakan domain custom seperti `api-staging.example.com` bila tersedia, lalu ubah `CORS_ORIGIN` ke domain InfinityFree.

### 4. Catatan biaya

Ketersediaan free/trial Railway dan batas kredit dapat berubah. Periksa halaman pricing dan billing Railway sebelum mengandalkan layanan ini untuk uptime staging. Jangan memasukkan kartu atau mengaktifkan billing tanpa memahami batas pengeluaran.

## Opsi C: Render

### 1. Buat Web Service

1. Buka Render Dashboard.
2. Pilih **New → Web Service**.
3. Hubungkan repository GitHub `Blesiongne5758/BL-24`.
4. Pilih branch `security-hardening-2026-10-23` untuk staging.
5. Root directory: `server`.
6. Runtime: Node.
7. Build command: `npm ci --omit=dev`.
8. Start command: `npm start`.
9. Health check path: `/api/health`.
10. Tambahkan variables pada menu Environment.

Render mewajibkan web service bind ke `0.0.0.0` dan port yang diberikan melalui `PORT`. Node.js biasanya memilih semua interface saat host tidak ditentukan, dan aplikasi ini membaca `process.env.PORT`; bila deploy gagal karena port binding, ubah startup menjadi eksplisit:

```javascript
const server = app.listen(PORT, '0.0.0.0', async () => {
```

Lakukan perubahan ini di branch deployment bila diperlukan.

### 2. Isi environment variables

Tambahkan semua variable dari `server/.env.staging.example` melalui dashboard Render. Render juga mendukung **Add from .env**, tetapi periksa file tersebut sebelum upload dan jangan mengunggah file yang berisi secret ke repository.

Render menyediakan TLS untuk URL `onrender.com` dan custom domain. Setelah service aktif:

```bash
curl -fsS https://<service>.onrender.com/api/health | jq
```

### 3. MySQL di Render

Render mendukung web service Node.js dan memiliki opsi database tertentu, tetapi BL-24 membutuhkan MySQL melalui `mysql2`. Gunakan MySQL eksternal yang mengizinkan koneksi dari Render, atau jalankan MySQL pada VPS/database provider terpisah. Batasi firewall MySQL ke koneksi yang diperlukan dan gunakan TLS jika provider mendukungnya.

Jangan mengekspos port MySQL tanpa pembatasan IP atau credential kuat.

### 4. Free plan

Free compute Render cocok untuk staging ringan, tetapi periksa batasan sleep, resource, build, dan database sebelum dipakai untuk production. Pastikan health check `/api/health` tidak melakukan query berat.

## Hubungkan frontend InfinityFree

Tambahkan konfigurasi API sebelum script aplikasi frontend dimuat:

```html
<script>
  window.BURSALIMBAH_API_BASE_URL = 'https://api-staging.example.com';
</script>
```

Kode frontend perlu membaca variabel tersebut. Jika belum ada di branch deployment, ubah `detectApiBaseUrl()` di `js/store.js` dan `js/storageClient.js` agar memprioritaskan `window.BURSALIMBAH_API_BASE_URL` dan hanya memakai `http://localhost:5000` untuk development lokal.

Upload frontend ke folder `htdocs` InfinityFree melalui FTP/File Manager. Pastikan URL frontend memakai HTTPS. Jangan menaruh `.env`, database credential, JWT secret, atau credential object storage di `htdocs`.

## Validasi staging setelah deploy

Jalankan urutan berikut:

```bash
API='https://api-staging.example.com'

curl -fsS "$API/api/health" | jq

curl -i "$API/api/admin/backups"

curl -i -X PUT "$API/api/settings" \
  -H 'Content-Type: application/json' \
  -d '{"google_login_enabled":"true"}'
```

Expected:

- `/api/health`: HTTP 200 dan database connected.
- `/api/admin/backups` tanpa token: HTTP 401.
- `PUT /api/settings` tanpa token: HTTP 401.
- Token buyer pada route admin: HTTP 403.
- Token admin valid pada route admin: HTTP 200.
- Refresh token tidak diterima sebagai access token.
- Access token tidak diterima sebagai refresh token.
- Google OAuth OFF menolak request tanpa ID token.
- Origin asing tidak mendapat `Access-Control-Allow-Origin`.

Kemudian lakukan login manual dari domain InfinityFree dan verifikasi bahwa browser tidak menampilkan error mixed content atau CORS.

## Checklist keamanan sebelum production

- `NODE_ENV=production`.
- `DEMO_MODE=false`.
- JWT secret dibuat acak dan tidak pernah masuk Git.
- Database staging dan production terpisah.
- MySQL tidak terbuka bebas ke internet.
- `CORS_ORIGIN` tidak wildcard.
- HTTPS aktif pada frontend dan backend.
- Storage public dan private memakai bucket berbeda.
- Backup directory memakai volume/disk persisten.
- Log tidak mencetak token atau password.
- Akun staging tidak dipakai ulang di production.
- Secret lama yang pernah ter-commit sudah dirotasi.

## Referensi resmi

- [1] [InfinityFree hosting features](https://www.infinityfree.com/) — PHP, MySQL, SSL, dan static hosting.
- [2] [InfinityFree Node.js support discussion](https://forum.infinityfree.com/t/can-i-run-a-node-js-website/49625) — batasan Node.js pada free hosting.
- [3] [Railway Express deployment guide](https://docs.railway.com/guides/express) — deploy Express dari GitHub/CLI.
- [4] [Railway variables](https://docs.railway.com/variables) — service variables dan sealed variables.
- [5] [Render web services](https://render.com/docs/web-services) — port, `0.0.0.0`, Git deploy, dan TLS.
- [6] [Render environment variables and secrets](https://render.com/docs/configure-environment-variables) — variables dan secret files.
- [7] [Render health checks](https://render.com/docs/health-checks) — HTTP health check dan kriteria 2xx/3xx.
