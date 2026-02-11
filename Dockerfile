# Multi-stage build: Node + Python (for data_loader bootstrap on container start)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install Python for models/data_loader.py bootstrap script
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Install Python deps for bootstrap (--break-system-packages: required on Debian 12+)
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# -----------------------------------------------------------------------------
# Production image
# -----------------------------------------------------------------------------
FROM node:20-bookworm-slim

WORKDIR /app

# Python runtime for data_loader.py bootstrap
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/models ./models
COPY --from=builder /app/data ./data
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./

# Python dependencies for models/data_loader.py
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

ENV NODE_ENV=production
EXPOSE 5000

# DB URL and bootstrap flag are configurable via environment variables
CMD ["node", "dist/index.js"]
