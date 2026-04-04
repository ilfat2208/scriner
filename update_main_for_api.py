#!/usr/bin/env python3
"""
🐋 Whale Screener - Интеграция старого детектора с новым API

Этот скрипт обновляет main.py для отправки сигналов в FastAPI backend
"""

import sys
from pathlib import Path

# Путь к новому файлу
main_path = Path("main.py")

if not main_path.exists():
    print("❌ main.py не найден")
    sys.exit(1)

# Чтение текущего main.py
with open(main_path, "r", encoding="utf-8") as f:
    content = f.read()

# Проверка, уже ли обновлён
if "emit_whale_signal" in content:
    print("✅ main.py уже обновлён")
    sys.exit(0)

# Находим импорты и добавляем новые
old_imports = """from bot.telegram_bot import WhaleAlertBot
from exchanges.cex import CEXMonitor
from exchanges.dex import DEXMonitor
from detectors.whale_detector import WhaleDetector
from detectors.momentum_detector import MomentumDetector"""

new_imports = """from bot.telegram_bot import WhaleAlertBot
from exchanges.cex import CEXMonitor
from exchanges.dex import DEXMonitor
from detectors.whale_detector import WhaleDetector
from detectors.momentum_detector import MomentumDetector

# Интеграция с API
try:
    from backend.services.signal_emitter import emit_whale_signal, emit_momentum_signal
    API_AVAILABLE = True
except ImportError:
    API_AVAILABLE = False
    print("⚠️  Backend API не доступен. Установите: pip install fastapi uvicorn")"""

content = content.replace(old_imports, new_imports)

# Обновляем _handle_alert для отправки в API
old_handle_alert = """    async def _handle_alert(self, alert: Alert):
        \"\"\"
        Обработка обнаруженной китовой сделки

        Args:
            alert: Объект алерта
        \"\"\"
        logger.warning(f"🚨 ALERT: {alert.pair} | {alert.side} | ${alert.volume_usd:,.2f}")

        if self.config['notifications']['send_to_telegram'] and self.bot:
            await self.bot.send_alert(alert)"""

new_handle_alert = """    async def _handle_alert(self, alert: Alert):
        \"\"\"
        Обработка обнаруженной китовой сделки

        Args:
            alert: Объект алерта
        \"\"\"
        logger.warning(f"🚨 ALERT: {alert.pair} | {alert.side} | ${alert.volume_usd:,.2f}")

        # Отправка в API
        if API_AVAILABLE:
            try:
                if alert.alert_type.value == "WHALE":
                    await emit_whale_signal(
                        exchange=alert.exchange,
                        pair=alert.pair,
                        side=alert.side,
                        volume_usd=alert.volume_usd,
                        amount=alert.amount,
                        price=alert.price,
                    )
                elif alert.alert_type.value == "MOMENTUM":
                    await emit_momentum_signal(
                        exchange=alert.exchange,
                        pair=alert.pair,
                        side=alert.side,
                        volume_usd=alert.volume_usd,
                        amount=alert.amount,
                        price=alert.price,
                        growth_percent=0,  # Можно добавить в Alert
                    )
            except Exception as e:
                logger.error(f"❌ Ошибка отправки в API: {e}")

        # Отправка в Telegram
        if self.config['notifications']['send_to_telegram'] and self.bot:
            await self.bot.send_alert(alert)"""

content = content.replace(old_handle_alert, new_handle_alert)

# Запись обновлённого файла
with open(main_path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ main.py обновлён для интеграции с API")
print()
print("📝 Теперь сигналы будут отправляться в FastAPI backend")
print("   и сохраняться в базу данных.")
