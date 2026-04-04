#!/bin/bash
# EntryPoint скрипт для Railway
# Разворачивает переменные окружения и запускает приложение

set -e

# Если PORT не установлен, используем 8000
export PORT=${PORT:-8000}

echo "=========================================="
echo "🐋 Whale Screener - Starting..."
echo "=========================================="
echo "📊 Port: $PORT"
echo "📊 Environment: ${RAILWAY_ENVIRONMENT:-development}"
echo "📊 Working directory: $(pwd)"
echo "📊 Python: $(python --version 2>&1 || echo 'not found')"
echo "=========================================="

# Проверяем что файлы существуют
if [ ! -f "backend/main.py" ]; then
    echo "❌ Error: backend/main.py not found!"
    ls -la
    exit 1
fi

if [ ! -d "out" ]; then
    echo "⚠️  Warning: 'out' directory not found. Frontend not built."
else
    echo "✅ Frontend files found in 'out/'"
    ls -la out/ | head -20
fi

echo "=========================================="
echo "✅ Starting uvicorn on 0.0.0.0:$PORT"
echo "=========================================="

# Запускаем uvicorn с подробным логированием
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT --log-level debug
