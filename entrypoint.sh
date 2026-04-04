#!/bin/bash
# EntryPoint скрипт для Railway
# Разворачивает переменные окружения и запускает приложение

set -e

# Если PORT не установлен, используем 8000
export PORT=${PORT:-8000}

echo "🚀 Starting Whale Screener..."
echo "📊 Port: $PORT"
echo "📊 Environment: ${RAILWAY_ENVIRONMENT:-development}"
echo "📊 Working directory: $(pwd)"

# Проверяем что файлы существуют
if [ ! -f "backend/main.py" ]; then
    echo "❌ Error: backend/main.py not found!"
    exit 1
fi

if [ ! -d "out" ]; then
    echo "⚠️  Warning: 'out' directory not found. Frontend not built."
else
    echo "✅ Frontend files found in 'out/'"
fi

# Запускаем uvicorn
echo "✅ Starting uvicorn on 0.0.0.0:$PORT"
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT --log-level info
