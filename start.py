#!/usr/bin/env python3
"""
Главный startup скрипт для Railway
Запускает:
  1. Telegram бота (главный поток — нужен для signal handlers)
  2. FastAPI сервер (отдельный поток)
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

# ── Запуск Telegram бота в главном потоке ────────────────────
async def start_telegram_bot():
    """Запускаем aiogram бота в главном потоке"""
    if not START_BOT:
        print("⏭️  Skipping Telegram bot (no token)")
        return
    
    try:
        from bot.telegram_bot import WhaleAlertBot
        
        bot_token = TELEGRAM_BOT_TOKEN
        admin_id = int(TELEGRAM_ADMIN_ID)
        
        print(f"🤖 Starting Telegram Bot...")
        print(f"   Admin ID: {admin_id}")
        
        # Создаём и инициализируем бота
        bot = WhaleAlertBot(token=bot_token, admin_id=admin_id)
        await bot.initialize()
        
        print("✅ Telegram Bot is running!")
        
        # Запускаем polling в главном потоке (signal handlers работают)
        await bot.dispatcher.start_polling(bot.bot)
        
    except Exception as e:
        print(f"❌ Telegram Bot failed: {e}")
        import traceback
        traceback.print_exc()

# ── Main ─────────────────────────────────────────────────────
def main():
    """Запускаем все сервисы"""
    
    print("\n🚀 Launching services...")
    print("-" * 60)
    
    # 1. Запускаем FastAPI в отдельном потоке
    print("🌐 Starting FastAPI server in background...")
    fastapi_thread = threading.Thread(target=start_fastapi, daemon=True)
    fastapi_thread.start()
    
    # 2. Запускаем Telegram бота в главном потоке (нужен для signal handlers)
    if START_BOT:
        print("🤖 Starting Telegram Bot in main thread...")
        print("-" * 60)
        print("✅ All services started!")
        print("=" * 60)
        
        try:
            asyncio.run(start_telegram_bot())
        except KeyboardInterrupt:
            print("\n\n⏹️  Shutting down...")
        except Exception as e:
            print(f"\n❌ Telegram Bot failed: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("⏭️  Skipping Telegram Bot")
        print("-" * 60)
        print("✅ FastAPI started!")
        print("=" * 60)
        
        try:
            # Просто ждём
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n⏹️  Shutting down...")

if __name__ == "__main__":
    main()
