# ============================================================
# Whale Screener — hybrid Node.js (Next.js) + Python (FastAPI)
#
# Strategy: start from python:3.11-bullseye (matches runtime.txt)
# and install Node.js 18 via the official NodeSource setup script.
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

# ── Entrypoint script ────────────────────────────────────────
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# ── Runtime ──────────────────────────────────────────────────
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
