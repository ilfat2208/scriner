#!/usr/bin/env python3
"""
Главный startup скрипт для Railway
Запускает:
  1. FastAPI сервер (веб-приложение + API)
  2. Telegram бота (aiogram)
"""

import os
import sys
import asyncio
import threading
import signal
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

# ── Запуск Telegram бота ─────────────────────────────────────
async def start_telegram_bot():
    """Запускаем aiogram бота"""
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
        
        # Запускаем polling
        await bot.dispatcher.start_polling(bot.bot)
        
    except Exception as e:
        print(f"❌ Telegram Bot failed to start: {e}")
        import traceback
        traceback.print_exc()

def start_bot_thread():
    """Запускаем бота в отдельном потоке с asyncio loop"""
    if not START_BOT:
        return
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        loop.run_until_complete(start_telegram_bot())
    except Exception as e:
        print(f"❌ Bot thread error: {e}")
        import traceback
        traceback.print_exc()

# ── Main ─────────────────────────────────────────────────────
def main():
    """Запускаем все сервисы"""
    
    print("\n🚀 Launching services...")
    print("-" * 60)
    
    # 1. Запускаем Telegram бота в отдельном потоке (если есть токен)
    if START_BOT:
        print("🤖 Starting Telegram Bot in background...")
        bot_thread = threading.Thread(target=start_bot_thread, daemon=True)
        bot_thread.start()
    else:
        print("⏭️  Skipping Telegram Bot")
    
    # 2. Запускаем FastAPI в главном потоке
    print("🌐 Starting FastAPI server...")
    print("-" * 60)
    print("✅ All services started!")
    print("=" * 60)
    
    try:
        start_fastapi()
    except KeyboardInterrupt:
        print("\n\n⏹️  Shutting down...")
    except Exception as e:
        print(f"\n❌ FastAPI failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
