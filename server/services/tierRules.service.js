// SPDX-License-Identifier: MIT
/**
 * Logika Bisnis: 3-Tier Berlangganan Pembeli & Kontrol Hak Akses
 * Menegakkan kuota volume maksimum, batas nominal transaksi penawaran,
 * dan visibilitas data penjual (GPS, nomor WA, alamat lengkap).
 */

const DEFAULT_TIERS = {
  tier_starter: {
    id: 'tier_starter',
    name: 'Paket Gratis (Starter)',
    price: 0,
    maxPriceLimit: 200000,          // Maks. Rp 200.000 per transaksi
    maxBookingVolume: 200,          // Maks. 200 Kg / Liter
    canBooking: true,
    allowAddress: 'city_only',      // Hanya tampil nama kota
    allowGpsMap: false,             // Titik peta presisi terkunci
    allowWhatsapp: false            // Kontak langsung terkunci
  },
  tier_pro: {
    id: 'tier_pro',
    name: 'Paket Profesional',
    price: 99000,
    maxPriceLimit: 50000000,        // Maks. Rp 50.000.000
    maxBookingVolume: 5000,         // Maks. 5.000 Kg / Liter
    canBooking: true,
    allowAddress: 'full',           // Alamat gudang lengkap
    allowGpsMap: true,              // Peta OpenStreetMap aktif
    allowWhatsapp: true             // Buka kontak WA
  },
  tier_enterprise: {
    id: 'tier_enterprise',
    name: 'Paket Industri (Enterprise)',
    price: 299000,
    maxPriceLimit: 0,               // 0 = Tanpa batas (Unlimited)
    maxBookingVolume: 0,            // 0 = Tanpa batas (Unlimited)
    canBooking: true,
    allowAddress: 'full',
    allowGpsMap: true,
    allowWhatsapp: true
  }
};

/**
 * Validasi apakah pembeli berhak melakukan pemesanan (booking) sesuai kuota tier
 * @param {Object} tier Konfigurasi paket langganan pembeli
 * @param {number} offerPrice Harga penawaran / total nilai transaksi (Rp)
 * @param {number} volume Volume atau berat pesanan (Kg/Liter)
 * @returns {Object} { valid: boolean, message?: string }
 */
function validateTierBookingRules(tier, offerPrice, volume) {
  const currentTier = tier || DEFAULT_TIERS.tier_starter;
  const price = Number(offerPrice) || 0;
  const vol = Number(volume) || 0;

  if (currentTier.canBooking === false) {
    return {
      valid: false,
      message: `Tier ${currentTier.name} tidak memiliki hak melakukan booking pesanan. Silakan upgrade paket berlangganan.`
    };
  }

  // Cek batas volume
  const maxVol = Number(currentTier.maxBookingVolume) || 0;
  if (maxVol > 0 && vol > maxVol) {
    return {
      valid: false,
      message: `Volume booking (${vol.toLocaleString('id-ID')}) melebihi kuota maksimal tier ${currentTier.name} (Maks. ${maxVol.toLocaleString('id-ID')}). Silakan upgrade paket langganan Anda.`
    };
  }

  // Cek batas nominal harga
  const maxPrice = Number(currentTier.maxPriceLimit) || 0;
  if (maxPrice > 0 && price > maxPrice) {
    return {
      valid: false,
      message: `Nilai transaksi (Rp ${price.toLocaleString('id-ID')}) melebihi batas maksimal paket ${currentTier.name} (Maks. Rp ${maxPrice.toLocaleString('id-ID')}). Silakan upgrade paket langganan Anda.`
    };
  }

  return { valid: true };
}

module.exports = {
  DEFAULT_TIERS,
  validateTierBookingRules
};
