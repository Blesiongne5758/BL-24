# SPDX-License-Identifier: MIT
# Multi-stage Production Dockerfile untuk Bursa Limbah Backend

FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

# Final Runtime Image (Minimal footprint)
FROM node:20-alpine

# Pasang tzdata untuk zona waktu WIB (Asia/Jakarta)
RUN apk add --no-cache tzdata
ENV TZ=Asia/Jakarta

WORKDIR /usr/src/app

# Buat direktori non-root user
USER node

# Copy dependencies dan kode aplikasi
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

# Buat folder uploads dan backups dengan izin yang sesuai
RUN mkdir -p uploads/product-evidence uploads/identity-documents uploads/weighing-proofs backups logs

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
