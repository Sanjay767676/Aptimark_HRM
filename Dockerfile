# ---------- Build stage ----------
FROM node:22-alpine AS builder

# Install build‑time dependencies
RUN apk add --no-cache \
    python3 make g++ \
    # Install Chromium for the final image (kept in cache)
    chromium

WORKDIR /app

# Copy only the files needed for install
COPY package*.json ./
COPY . .

# Install deps (uses lockfile that exists)
RUN npm ci --omit=dev

# ---------- Runtime stage ----------
FROM node:22-alpine

# Install Chromium runtime (same package name works)
RUN apk add --no-cache chromium

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app /app

# Tell Puppeteer to use the system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_CACHE_DIR=/tmp/puppeteer

# Optional: clean up npm cache to keep image small
RUN npm prune --production && npm cache clean --force

EXPOSE 3000
CMD ["npm", "run", "start"]
