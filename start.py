#!/usr/bin/env python3
"""
Главный startup скрипт для Railway
Запускает ВСЁ:
  1. Детекторы + мониторинг Binance (главный поток)
  2. Telegram бот (внутри скринера)
  3. FastAPI сервер (отдельный поток)
"""

import os
import sys
import asyncio
import threading
from pathlib import Path

print("=" * 60)
print("🐋 Whale Screener - Starting All Services...")
print("=" * 60)
print(f"📊 Port: {os.environ.get('PORT', '8000')}")
print(f"📊 Environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'development')}")
print(f"📊 Python: {sys.version}")
print("=" * 60)

# ── Проверяем зависимости ────────────────────────────────────
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_ADMIN_ID = os.environ.get("TELEGRAM_ADMIN_ID")

if not TELEGRAM_BOT_TOKEN:
    print("⚠️  TELEGRAM_BOT_TOKEN not set — starting WEB ONLY (no bot)")
    START_BOT = False
else:
    print("✅ Telegram bot token found")
    START_BOT = True

print("=" * 60)

# ── Запуск FastAPI в отдельном потоке ────────────────────────
def start_fastapi():
    """Запускаем uvicorn с FastAPI"""
    import uvicorn
    
    port = int(os.environ.get("PORT", "8000"))
    
    print(f"🌐 Starting FastAPI on 0.0.0.0:{port}")
    
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=False,
    )

# ── Запуск полного скринера (детекторы + бот) ────────────────
async def start_full_screener():
    """Запускаем полный скринер с детекторами"""
    try:
        from main import WhaleScreener
        
        print("🔧 Initializing Whale Screener...")
        screener = WhaleScreener()
        await screener.initialize()
        
        print("🚀 Starting full screener (detectors + bot + monitoring)...")
        print("=" * 60)
        print("✅ All services started!")
        print("=" * 60)
        
        # Запускаем скринер (он сам запустит бота и мониторинг)
        await screener.start()
        
    except Exception as e:
        print(f"❌ Screener failed: {e}")
        import traceback
        traceback.print_exc()
        # Если скринер упал, просто ждём
        import time
        while True:
            time.sleep(60)

# ── Main ─────────────────────────────────────────────────────
def main():
    """Запускаем все сервисы"""
    
    print("\n🚀 Launching services...")
    print("-" * 60)
    
    # 1. Запускаем FastAPI в отдельном потоке
    print("🌐 Starting FastAPI server in background...")
    fastapi_thread = threading.Thread(target=start_fastapi, daemon=True)
    fastapi_thread.start()
    
    # 2. Запускаем полный скринер в главном потоке
    if START_BOT:
        print("🤖 Starting Full Screener (detectors + bot + monitoring)...")
        print("-" * 60)
        
        try:
            asyncio.run(start_full_screener())
        except KeyboardInterrupt:
            print("\n\n⏹️  Shutting down...")
        except Exception as e:
            print(f"\n❌ Screener failed: {e}")
            import traceback
            traceback.print_exc()
            
            # Даже если скринер упал, FastAPI продолжает работать
            print("⚠️  FastAPI still running, but detectors stopped")
            import time
            while True:
                time.sleep(60)
    else:
        print("⏭️  Skipping Screener (no bot token)")
        print("-" * 60)
        print("✅ FastAPI running (web only)")
        print("=" * 60)
        
        try:
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n⏹️  Shutting down...")

if __name__ == "__main__":
    main()
