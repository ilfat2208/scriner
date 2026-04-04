# ============================================================
# Whale Screener — hybrid Node.js (Next.js) + Python (FastAPI)
# ============================================================
FROM python:3.11-bullseye

# ── Node.js 18 ───────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Python dependencies ──────────────────────────────────────
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ── Node.js dependencies ─────────────────────────────────────
COPY package.json package-lock.json ./
RUN npm ci

# ── Copy full source ─────────────────────────────────────────
COPY . .

# ── Build Next.js static export → ./out ──────────────────────
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────
EXPOSE 8000

# Use Python script to start the server (handles PORT properly)
CMD ["python", "start.py"]
