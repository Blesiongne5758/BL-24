// SPDX-License-Identifier: MIT
/**
 * Logika Bisnis: Rekening Bersama (Escrow) & Transaksi Bursa Limbah
 * Menangani kalkulasi DP 30%, biaya penanganan platform (handling fee),
 * dan mesin status transisi pesanan.
 */

const DEFAULT_DP_PERCENT = 30;
const DEFAULT_HANDLING_FEE = 10000;

/**
 * Menghitung rincian finansial transaksi escrow
 * @param {number} totalValue Total nilai bruto limbah (Rp)
 * @param {Object} settings Konfigurasi biaya dari admin
 */
function calculateEscrowBreakdown(totalValue, settings = {}) {
  const gross = Math.max(0, Math.round(Number(totalValue) || 0));
  const dpPercent = typeof settings.dpPercent === 'number' ? settings.dpPercent : DEFAULT_DP_PERCENT;
  const dpEnabled = settings.dpEnabled !== false;
  const handlingFee = typeof settings.handlingFee === 'number' ? settings.handlingFee : DEFAULT_HANDLING_FEE;

  const dpAmount = dpEnabled ? Math.round((gross * dpPercent) / 100) : 0;
  const remainingAmount = gross - dpAmount;
  const initialPayment = dpAmount + handlingFee;

  return {
    totalValue: gross,
    dpPercent,
    dpEnabled,
    dpAmount,
    handlingFee,
    initialPayment,
    remainingAmount
  };
}

/**
 * Mesin Status Validasi Transisi Pesanan
 */
const VALID_ORDER_TRANSITIONS = {
  'draft': ['dp_paid', 'cancelled'],
  'pending_dp': ['dp_paid', 'cancelled'],
  'dp_paid': ['pickup_scheduled', 'proof_submitted', 'cancelled'],
  'pickup_scheduled': ['proof_submitted', 'completed', 'cancelled'],
  'proof_submitted': ['verified_by_admin', 'verified_by_seller', 'rejected', 'completed'],
  'verified_by_admin': ['completed'],
  'verified_by_seller': ['completed'],
  'completed': [],
  'cancelled': []
};

function canTransitionOrderStatus(currentStatus, nextStatus) {
  if (!currentStatus) return true;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

module.exports = {
  calculateEscrowBreakdown,
  canTransitionOrderStatus,
  DEFAULT_DP_PERCENT,
  DEFAULT_HANDLING_FEE
};
