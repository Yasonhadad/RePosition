# Multi-stage: build then run with Node + Python (for data_loader bootstrap)
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install Python for models/data_loader.py (bootstrap)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Install Python deps for bootstrap script (--break-system-packages: OK in container, Debian PEP 668)
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# ---
# Production image
# ---
FROM node:20-bookworm-slim

WORKDIR /app

# Python for data_loader.py on bootstrap
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

# Python dependencies (used by models/data_loader.py)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

ENV NODE_ENV=production
EXPOSE 5000

# Allow override for DB and bootstrap; default port 5000
CMD ["node", "dist/index.js"]
