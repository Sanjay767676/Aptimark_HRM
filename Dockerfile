# ------------------------------------------------------------
# 1️⃣ Builder stage – install deps and (optionally) compile TS
# ------------------------------------------------------------
FROM node:22-alpine AS builder

# Install git (needed for some internal installs) and python for node‑gyp
RUN apk add --no-cache git python3 make g++   # optional but safe

WORKDIR /app

# Copy only lockfiles first – helps Docker cache layers
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY .npmrc ./
COPY . .

# Install all workspaces (including puppeteer)
RUN npm ci

# ------------------------------------------------------------
# 2️⃣ Runtime stage – install system Chrome and run the app
# ------------------------------------------------------------
FROM node:22-alpine

# ---- Install Chromium (the headless browser) ----
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    ca-certificates

# Tell Puppeteer to use this binary
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# Optional: force Puppeteer to write its cache in a writable folder
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer

WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app .

# Expose the port your backend serves on (default 3000)
EXPOSE 3000

# Default command – runs both backend and frontend in dev mode
CMD ["npm", "run", "dev"]
