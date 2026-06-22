# ---------- Build stage ----------
FROM node:22-alpine AS builder

# Install build-time dependencies (including Chromium for later use)
RUN apk add --no-cache \
    python3 make g++ \
    chromium

WORKDIR /app

# Copy package files and install all dependencies (including dev for build)
COPY package*.json ./
COPY . .
RUN npm ci

# Build the frontend (assumes workspace @workspace/hr-platform)
RUN npm run build -w @workspace/hr-platform
# Build the backend (TS compile)
RUN npm run build -w @workspace/backend

# ---------- Runtime stage ----------
FROM node:22-alpine

# Install Chromium runtime (same package name works)
RUN apk add --no-cache chromium

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app /app

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_CACHE_DIR=/tmp/puppeteer

# Optional: clean up npm cache to keep image small
RUN npm prune --production && npm cache clean --force

EXPOSE 3000

# Start the backend in production mode
CMD ["npm", "run", "start", "-w", "@workspace/backend"]
