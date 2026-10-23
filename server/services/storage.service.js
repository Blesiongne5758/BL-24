/**
 * Cloud Object Storage Service (AWS S3, DigitalOcean Spaces, MinIO Compatible)
 * 
 * Strict Architecture:
 * 1. Decoupled from local server filesystem.
 * 2. 2-Bucket Strategy:
 *    - Public Bucket (CDN/ImageKit accelerated): listing evidence photos, public avatars
 *    - Private Bucket (Vault): KYC docs (KTP, NPWP, B3 permit), chat transaction attachments
 * 3. Pre-Signed PUT URLs: Client uploads directly to bucket (no memory load on web server)
 * 4. Pre-Signed GET URLs: Short-lived tokenized access to private files
 * 5. Magic Bytes & MIME Validation: Prevents script injection & file spoofing
 */

const crypto = require('crypto');
const path = require('path');
const mediaOptimizer = require('./mediaOptimization.service');

// Whitelist of allowed MIME types & maximum size limits
const ALLOWED_MIME_TYPES = {
  // Images (Public & Private)
  'image/jpeg': { exts: ['.jpg', '.jpeg'], maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/png': { exts: ['.png'], maxSize: 10 * 1024 * 1024 },
  'image/webp': { exts: ['.webp'], maxSize: 10 * 1024 * 1024 },
  'image/heic': { exts: ['.heic'], maxSize: 10 * 1024 * 1024 },
  // Documents (Private KYC & Permits)
  'application/pdf': { exts: ['.pdf'], maxSize: 20 * 1024 * 1024 } // 20MB
};

// Known Magic Bytes signatures
const MAGIC_SIGNATURES = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/webp', check: (buf) => buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] } // %PDF
];

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'mock'; // 's3' | 'spaces' | 'minio' | 'mock'
    this.region = process.env.STORAGE_REGION || 'ap-southeast-1';
    this.endpoint = process.env.STORAGE_ENDPOINT || (this.provider === 'spaces' ? 'https://sgp1.digitaloceanspaces.com' : `https://s3.${this.region}.amazonaws.com`);
    this.accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || '';
    if (this.provider !== 'mock' && (!this.accessKeyId || !this.secretAccessKey)) {
      throw new Error('STORAGE_ACCESS_KEY_ID dan STORAGE_SECRET_ACCESS_KEY wajib diset untuk storage non-mock.');
    }

    // 2-Bucket Strategy
    this.publicBucket = process.env.STORAGE_PUBLIC_BUCKET || 'circulink-public-media';
    this.privateBucket = process.env.STORAGE_PRIVATE_BUCKET || 'circulink-private-vault';
    this.publicCdnDomain = (process.env.STORAGE_CDN_DOMAIN || '').replace(/\/$/, '');

    // Default expiration for Pre-Signed URLs (in seconds)
    this.presignedUploadTtl = Number(process.env.STORAGE_UPLOAD_TTL_SECONDS) || 900; // 15 mins
    this.presignedGetTtl = Number(process.env.STORAGE_GET_TTL_SECONDS) || 900; // 15 mins
  }

  /**
   * Validate file parameters before issuing a Pre-Signed Upload URL
   * @param {Object} params - { filename, contentType, fileSize, category }
   */
  validateUploadRequest(params) {
    const { filename, contentType, fileSize, category } = params;

    if (!filename || typeof filename !== 'string') {
      return { valid: false, message: 'Nama file tidak valid.' };
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeConfig = ALLOWED_MIME_TYPES[contentType];

    if (!mimeConfig) {
      return {
        valid: false,
        message: `Tipe file '${contentType}' tidak diizinkan. Hanya menerima: JPEG, PNG, WEBP, HEIC, dan PDF.`
      };
    }

    if (!mimeConfig.exts.includes(ext)) {
      return {
        valid: false,
        message: `Ekstensi file '${ext}' tidak cocok dengan tipe konten '${contentType}'.`
      };
    }

    if (fileSize && fileSize > mimeConfig.maxSize) {
      const maxMb = Math.round(mimeConfig.maxSize / (1024 * 1024));
      return {
        valid: false,
        message: `Ukuran file (${Math.round(fileSize / (1024 * 1024))} MB) melebihi batas maksimal ${maxMb} MB.`
      };
    }

    // Category restriction check
    const validCategories = ['public_listing', 'public_avatar', 'private_kyc', 'private_chat', 'private_payment_proof'];
    if (!validCategories.includes(category)) {
      return { valid: false, message: `Kategori storage '${category}' tidak valid.` };
    }

    return { valid: true };
  }

  /**
   * Verify file magic bytes from buffer or initial slice
   * @param {Buffer} buffer - File buffer or header slice (at least 32 bytes)
   * @param {string} declaredMimeType - Expected MIME type
   * @returns {boolean} - true if signature matches
   */
  validateMagicBytes(buffer, declaredMimeType) {
    if (!buffer || buffer.length < 4) return false;

    // Check against dangerous executable patterns regardless of declared mime
    const isDangerous = this._checkDangerousSignatures(buffer);
    if (isDangerous) return false;

    const matchedSig = MAGIC_SIGNATURES.find(sig => sig.mime === declaredMimeType);
    if (!matchedSig) {
      // Fallback for image/heic
      if (declaredMimeType === 'image/heic') {
        const str = buffer.toString('ascii', 4, 12);
        return str.includes('ftyp') || str.includes('heic') || str.includes('mif1');
      }
      return false;
    }

    if (matchedSig.check) {
      return matchedSig.check(buffer);
    }

    for (let i = 0; i < matchedSig.bytes.length; i++) {
      if (buffer[i] !== matchedSig.bytes[i]) return false;
    }

    return true;
  }

  /**
   * Check for script, executable, or PHP tag injections in initial bytes
   * @private
   */
  _checkDangerousSignatures(buffer) {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).toLowerCase();
    const dangerousPatterns = [
      '<?php',
      '<script',
      'eval(',
      '#!/bin/sh',
      '#!/bin/bash',
      'powershell',
      '<%',
      '<!doctype html'
    ];
    return dangerousPatterns.some(pat => head.includes(pat));
  }

  /**
   * Generate a Decoupled Pre-Signed PUT URL for direct client upload
   * @param {Object} options - { filename, contentType, fileSize, category, userId }
   * @returns {Object} - { uploadUrl, fileKey, publicUrl, accessType, expiresAt }
   */
  generatePresignedUploadUrl(options) {
    const { filename, contentType, category, userId = 'anon' } = options;
    const isPrivate = category.startsWith('private_');
    const targetBucket = isPrivate ? this.privateBucket : this.publicBucket;

    const ext = path.extname(filename).toLowerCase();
    const uniqueToken = crypto.randomBytes(16).toString('hex');
    const datePrefix = new Date().toISOString().split('T')[0];
    const fileKey = `${category}/${datePrefix}/${userId}-${uniqueToken}${ext}`;

    const expiresAt = new Date(Date.now() + this.presignedUploadTtl * 1000).toISOString();

    // S3 SigV4 Pre-Signed PUT URL calculation
    const uploadUrl = this._buildPresignedPutUrl({
      bucket: targetBucket,
      key: fileKey,
      contentType,
      expiresIn: this.presignedUploadTtl
    });

    let publicUrl = null;
    let optimizedThumbnailUrl = null;

    if (!isPrivate) {
      // Construct CDN / Direct public URL
      if (this.publicCdnDomain) {
        publicUrl = `${this.publicCdnDomain}/${fileKey}`;
      } else {
        publicUrl = `${this.endpoint}/${targetBucket}/${fileKey}`;
      }
      optimizedThumbnailUrl = mediaOptimizer.getThumbnailUrl(publicUrl);
    }

    return {
      success: true,
      uploadUrl,
      fileKey,
      publicUrl,
      optimizedThumbnailUrl,
      bucket: targetBucket,
      accessType: isPrivate ? 'private' : 'public',
      contentType,
      expiresAt
    };
  }

  /**
   * Generate short-lived Pre-Signed GET URL for restricted private files
   * @param {string} fileKey - Key within private bucket
   * @param {number} expiresInSeconds - Expiration in seconds (default: 15 min)
   * @returns {string} - Signed URL with access token
   */
  generatePresignedGetUrl(fileKey, expiresInSeconds = 900) {
    if (!fileKey) return null;

    return this._buildPresignedGetUrl({
      bucket: this.privateBucket,
      key: fileKey.replace(/^\/+/, ''),
      expiresIn: expiresInSeconds
    });
  }

  /**
   * Build AWS Signature Version 4 Pre-Signed PUT URL
   * Decoupled implementation compatible with AWS S3, DO Spaces, MinIO, Cloudflare R2
   * @private
   */
  _buildPresignedPutUrl({ bucket, key, contentType, expiresIn }) {
    const host = this._getHostForBucket(bucket);
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'content-type;host'
    };

    const canonicalQuery = Object.keys(queryParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
    const canonicalHeaders = `content-type:${contentType.trim()}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const protocol = this.endpoint.startsWith('http://') ? 'http' : 'https';
    return `${protocol}://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  /**
   * Build AWS Signature Version 4 Pre-Signed GET URL
   * @private
   */
  _buildPresignedGetUrl({ bucket, key, expiresIn }) {
    const host = this._getHostForBucket(bucket);
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;

    const queryParams = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expiresIn),
      'X-Amz-SignedHeaders': 'host'
    };

    const canonicalQuery = Object.keys(queryParams)
      .sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');

    const signingKey = this._getSignatureKey(this.secretAccessKey, dateStamp, this.region, 's3');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const protocol = this.endpoint.startsWith('http://') ? 'http' : 'https';
    return `${protocol}://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  /**
   * Calculate AWS SigV4 derived signing key
   * @private
   */
  _getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  /**
   * Extract or assemble the appropriate host for virtual-hosted or path-style bucket
   * @private
   */
  _getHostForBucket(bucket) {
    try {
      const url = new URL(this.endpoint);
      // For MinIO or IP-based local endpoint, use path-style or host
      if (url.hostname === 'localhost' || url.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        return `${url.host}/${bucket}`;
      }
      // For AWS S3 or DO Spaces virtual hosted style
      return `${bucket}.${url.host}`;
    } catch {
      return `${bucket}.s3.${this.region}.amazonaws.com`;
    }
  }
}

module.exports = new StorageService();
