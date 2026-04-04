#!/bin/bash
# EntryPoint скрипт для Railway
# Разворачивает переменные окружения и запускает приложение

# Если PORT не установлен, используем 8000
export PORT=${PORT:-8000}

echo "🚀 Starting server on port $PORT"
echo "📊 Environment: ${RAILWAY_ENVIRONMENT:-development}"

# Запускаем uvicorn
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
