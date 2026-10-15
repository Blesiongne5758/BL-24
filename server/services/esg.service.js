// SPDX-License-Identifier: MIT
/**
 * Logika Bisnis: Kalkulator ESG & Reduksi Emisi Karbon (CO2e)
 * Mengestimasi dampak positif daur ulang limbah terhadap lingkungan
 * berdasarkan faktor emisi standar IPCC / KLHK.
 */

// Faktor reduksi kg CO2e per kg/liter bahan baku daur ulang
const EMISSION_FACTORS = {
  'minyak_jelantah': 2.85,    // Pengganti biofuel diesel murni
  'oli_bekas': 1.95,          // Re-refining pelumas base oil
  'kardus': 1.34,             // Menyelamatkan penebangan pohon dan pulp
  'plastik': 1.58,            // Pengurangan virgin polymer berbasis minyak bumi
  'besi_rongsok': 1.82,       // Pengurangan energi peleburan bijih besi (blast furnace)
  'aluminium': 9.12,          // Salah satu penghematan energi terbesar (sampai 95%)
  'tembaga': 4.35,            // Reduksi penambangan dan smelting tembaga
  'kertas': 1.15,             // Pulp daur ulang
  'limbah_elektronik': 14.50, // Recovery logam tanah jarang & emas/perak
  'default': 1.20
};

/**
 * Menghitung estimasi reduksi emisi gas rumah kaca (kg CO2e)
 * @param {string} categoryId ID Kategori limbah
 * @param {number} quantity Jumlah volume/bobot (Kg atau Liter)
 * @returns {Object} { kgCO2e: number, tonCO2e: number, treesEquivalent: number }
 */
function calculateCO2Reduction(categoryId, quantity) {
  const qty = Math.max(0, Number(quantity) || 0);
  const factor = EMISSION_FACTORS[categoryId] || EMISSION_FACTORS['default'];
  const kgCO2e = Math.round(qty * factor * 100) / 100;
  const tonCO2e = Math.round((kgCO2e / 1000) * 1000) / 1000;
  // 1 pohon dewasa menyerap rata-rata ~21.77 kg CO2 per tahun
  const treesEquivalent = Math.round((kgCO2e / 21.77) * 10) / 10;

  return {
    kgCO2e,
    tonCO2e,
    treesEquivalent
  };
}

module.exports = {
  calculateCO2Reduction,
  EMISSION_FACTORS
};
