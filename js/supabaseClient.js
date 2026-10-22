/**
 * Circulink Supabase Database Client
 * 
 * Provides direct connection to Supabase PostgreSQL via HTTPS REST API (PostgREST)
 * or official @supabase/supabase-js client.
 * 
 * Zero-dependency standalone fallback if CDN is blocked.
 */

(function (window) {
  'use strict';

  class CirculinkSupabaseClient {
    constructor() {
      this.client = null;
      this.initClient();
    }

    getConfig() {
      let cfg = { enabled: false, url: '', anonKey: '', syncEnabled: false };
      try {
        if (window.bursaLimbahStore && window.bursaLimbahStore.getSettings) {
          const s = window.bursaLimbahStore.getSettings();
          if (s.supabaseConfig) {
            cfg = { ...cfg, ...s.supabaseConfig };
          }
        }
      } catch (_) {}

      // Fallback to window globals or localStorage or project default
      cfg.url = cfg.url || window.SUPABASE_URL || localStorage.getItem('supabase_url') || 'https://vnajenbubmglwlsvteed.supabase.co';
      cfg.anonKey = cfg.anonKey || window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuYWplbmJ1Ym1nbHdsc3Z0ZWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDI0MjUsImV4cCI6MjEwODIxODQyNX0.Ft3UjkZa0nqkflx1gG1JaFCAfhFlIYY2Jy3xetLwDRE';
      if (cfg.url && cfg.anonKey) cfg.enabled = true;
      return cfg;
    }

    initClient() {
      const cfg = this.getConfig();
      if (cfg.url && cfg.anonKey) {
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
          try {
            this.client = window.supabase.createClient(cfg.url, cfg.anonKey);
            console.log('[Supabase] Client initialized with SDK');
          } catch (e) {
            console.warn('[Supabase] SDK init error, using REST fallback:', e.message);
            this.client = null;
          }
        }
      }
    }

    isConfigured() {
      const cfg = this.getConfig();
      return Boolean(cfg.enabled && cfg.url && cfg.anonKey);
    }

    /**
     * Direct PostgREST fetch helper
     */
    async _restRequest(table, options = {}) {
      const cfg = this.getConfig();
      if (!cfg.url || !cfg.anonKey) throw new Error('Supabase URL atau Anon Key belum dikonfigurasi.');

      const cleanUrl = cfg.url.replace(/\/$/, '');
      const method = options.method || 'GET';
      const query = options.query ? `?${options.query}` : '';
      const endpoint = `${cleanUrl}/rest/v1/${table}${query}`;

      const headers = {
        'apikey': cfg.anonKey,
        'Authorization': `Bearer ${cfg.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation'
      };

      const res = await fetch(endpoint, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Supabase REST Error (${res.status}): ${errText}`);
      }

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    }

    async testConnection(customCfg = null) {
      const cfg = customCfg || this.getConfig();
      if (!cfg.url || !cfg.anonKey) {
        return { ok: false, success: false, message: 'Supabase URL atau Anon Key belum diisi.', error: 'Kredensial belum diisi' };
      }
      const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const cleanUrl = cfg.url.replace(/\/$/, '');
      try {
        const authRes = await fetch(`${cleanUrl}/auth/v1/health`, {
          method: 'GET',
          headers: {
            'apikey': cfg.anonKey,
            'Authorization': `Bearer ${cfg.anonKey}`
          }
        });
        const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const latency = Math.round(t1 - t0);

        if (!authRes.ok) {
          const errText = await authRes.text();
          return { ok: false, success: false, latency, message: `HTTP ${authRes.status}: ${errText}`, error: errText };
        }

        // Test table existence
        let tablesExist = false;
        try {
          const tableRes = await fetch(`${cleanUrl}/rest/v1/categories?select=id&limit=1`, {
            method: 'GET',
            headers: {
              'apikey': cfg.anonKey,
              'Authorization': `Bearer ${cfg.anonKey}`
            }
          });
          tablesExist = tableRes.ok;
        } catch (_) {}

        return {
          ok: true,
          success: true,
          latency,
          tablesExist,
          message: tablesExist
            ? `Koneksi Supabase aktif! Database dan tabel terhubung (${latency}ms).`
            : `Koneksi Supabase aktif (${latency}ms)! Tabel belum dibuat di SQL Editor.`
        };
      } catch (err) {
        return { ok: false, success: false, message: err.message, error: err.message };
      }
    }

    // --- Product Methods ---
    async getProducts() {
      if (!this.isConfigured()) return null;
      try {
        return await this._restRequest('products', { query: 'select=*&order=created_at.desc' });
      } catch (err) {
        console.warn('[Supabase] getProducts error:', err.message);
        return null;
      }
    }

    async upsertProduct(product) {
      if (!this.isConfigured()) return null;
      try {
        return await this._restRequest('products', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=representation',
          body: {
            id: product.id,
            code: product.code,
            title: product.title,
            category_id: product.categoryId,
            category_name: product.categoryName,
            seller_id: product.sellerId,
            seller_name: product.sellerName,
            seller_type: product.sellerType,
            source_type: product.sourceType,
            volume: Number(product.volume) || 0,
            weight: Number(product.weight) || 0,
            unit: product.unit || 'Kg',
            offer_price: Number(product.offerPrice) || 0,
            total_price: Number(product.totalPrice) || 0,
            container_type: product.containerType,
            condition: product.condition,
            grade: product.grade,
            description: product.description,
            address: product.address,
            location: product.location,
            origin: product.origin,
            latitude: product.latitude,
            longitude: product.longitude,
            status: product.status || 'pending',
            listing_status: product.listingStatus || 'Tersedia',
            evidences: product.evidences || []
          }
        });
      } catch (err) {
        console.warn('[Supabase] upsertProduct error:', err.message);
        return null;
      }
    }

    // --- Order Methods ---
    async getOrders() {
      if (!this.isConfigured()) return null;
      try {
        return await this._restRequest('orders', { query: 'select=*&order=created_at.desc' });
      } catch (err) {
        console.warn('[Supabase] getOrders error:', err.message);
        return null;
      }
    }

    async upsertOrder(order) {
      if (!this.isConfigured()) return null;
      try {
        return await this._restRequest('orders', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates,return=representation',
          body: {
            id: order.id,
            booking_code: order.bookingCode || order.order_code,
            product_id: order.productId,
            product_title: order.productTitle,
            seller_id: order.sellerId,
            seller_name: order.sellerName,
            buyer_id: order.buyerId,
            buyer_name: order.buyerName,
            total_price: Number(order.totalPrice || order.totalAmount) || 0,
            dp_amount: Number(order.dpAmount || order.downPaymentAmount) || 0,
            dp_percent: Number(order.dpPercent) || 30,
            remaining_amount: Number(order.remainingAmount) || 0,
            handling_fee: Number(order.handlingFee) || 10000,
            status: order.status || 'DP Terbayar (30%)',
            pickup_date: order.pickupDate,
            notes: order.notes,
            remaining_payment_status: order.remainingPaymentStatus || 'unpaid',
            remaining_payment_proof: order.remainingPaymentProof || {}
          }
        });
      } catch (err) {
        console.warn('[Supabase] upsertOrder error:', err.message);
        return null;
      }
    }

    // --- Sync Store with Supabase ---
    async syncWithStore(store) {
      if (!this.isConfigured()) return;
      try {
        const remoteProducts = await this.getProducts();
        if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
          const mapped = remoteProducts.map(p => ({
            id: p.id,
            code: p.code,
            title: p.title,
            categoryId: p.category_id,
            categoryName: p.category_name,
            sellerId: p.seller_id,
            sellerName: p.seller_name,
            sellerType: p.seller_type,
            sourceType: p.source_type,
            volume: Number(p.volume),
            weight: Number(p.weight),
            unit: p.unit,
            offerPrice: Number(p.offer_price),
            totalPrice: Number(p.total_price),
            containerType: p.container_type,
            condition: p.condition,
            grade: p.grade,
            description: p.description,
            address: p.address,
            location: p.location,
            origin: p.origin,
            latitude: p.latitude,
            longitude: p.longitude,
            status: p.status,
            listingStatus: p.listing_status,
            evidences: p.evidences || []
          }));
          store.state.products = mapped;
          store.save();
          console.log(`[Supabase] Synced ${mapped.length} products to store`);
        }
      } catch (err) {
        console.warn('[Supabase Sync Warning]', err.message);
      }
    }
  }

  window.circulinkSupabase = new CirculinkSupabaseClient();

})(typeof window !== 'undefined' ? window : global);
