"""
Детектор изменений Open Interest

Обнаружение значительных изменений открытого интереса
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Awaitable
from loguru import logger


class OpenInterestDetector:
    """
    Обнаружение изменений Open Interest
    
    Алгоритм:
    1. Отслеживаем OI за последние N минут
    2. Считаем процентное изменение
    3. Если изменение > порога → алерт
    """

    def __init__(
        self,
        oi_change_threshold: float = 5.0,  # Порог изменения OI %
        window_minutes: int = 15,  # Окно анализа
        check_interval_seconds: int = 60,  # Интервал проверки
        on_oi_change_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        self.oi_threshold = oi_change_threshold
        self.window_minutes = window_minutes
        self.check_interval = check_interval_seconds
        self.on_oi_change_detected = on_oi_change_detected

        # Хранилище OI по парам
        self._oi_data: Dict[str, deque] = {}
        self._last_alert_time: Dict[str] = {}
        
        # Статистика
        self._oi_increase_count = 0
        self._oi_decrease_count = 0

    def check_oi_change(
        self,
        pair: str,
        open_interest: float,
        price: float = 0,
        exchange: str = "BINANCE",
    ) -> Optional[dict]:
        """
        Проверка изменения OI

        Args:
            pair: Торговая пара
            open_interest: Текущий OI
            price: Текущая цена (опционально)
            exchange: Биржа

        Returns:
            dict с данными OI или None
        """
        now = datetime.now()
        key = pair

        # Инициализация
        if key not in self._oi_data:
            self._oi_data[key] = deque()
            logger.info(f"📊 {pair}: Начало отслеживания OI")

        # Добавление текущих данных
        self._oi_data[key].append((now, open_interest, price))

        # Очистка старых данных
        cutoff = now - timedelta(minutes=self.window_minutes)
        while self._oi_data[key] and self._oi_data[key][0][0] < cutoff:
            self._oi_data[key].popleft()

        # Нужна минимум 2 записи для сравнения
        if len(self._oi_data[key]) < 2:
            logger.debug(f"📊 {pair}: Недостаточно данных ({len(self._oi_data[key])} записей)")
            return None

        # Получение первого OI в окне
        first_time, first_oi, first_price = self._oi_data[key][0]
        oi_change = ((open_interest - first_oi) / first_oi) * 100 if first_oi > 0 else 0

        # Логирование каждые 10 проверок
        if len(self._oi_data[key]) % 10 == 0:
            logger.info(f"📊 {pair}: OI {first_oi:,.0f} → {open_interest:,.0f} ({oi_change:+.2f}%)")

        # Проверка cooldown (1 алерт в 2 минуты на пару)
        last_alert = self._last_alert_time.get(key)
        if last_alert and (now - last_alert).total_seconds() < 120:
            logger.debug(f"📊 {pair}: Cooldown активен")
            return None

        # Проверка на значительное изменение
        if abs(oi_change) >= self.oi_threshold:
            self._last_alert_time[key] = now

            if oi_change > 0:
                self._oi_increase_count += 1
                alert_type = "OI_INCREASE"
                emoji = "📈"
            else:
                self._oi_decrease_count += 1
                alert_type = "OI_DECREASE"
                emoji = "📉"

            logger.warning(
                f"{emoji} {alert_type}: {pair} | {oi_change:+.2f}% | "
                f"OI: {first_oi:,.0f} → {open_interest:,.0f}"
            )

            result = {
                "type": alert_type,
                "pair": pair,
                "exchange": exchange,
                "oi_change": oi_change,
                "start_oi": first_oi,
                "current_oi": open_interest,
                "price_change": ((price - first_price) / first_price * 100) if first_price and price else 0,
            }

            # Вызов callback
            if self.on_oi_change_detected:
                asyncio.create_task(self.on_oi_change_detected(result))

            return result

        return None

    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            "oi_increase_count": self._oi_increase_count,
            "oi_decrease_count": self._oi_decrease_count,
            "tracked_pairs": len(self._oi_data),
        }

    def reset(self, pair: str = None):
        """Сброс данных"""
        if pair:
            if pair in self._oi_data:
                del self._oi_data[pair]
            if pair in self._last_alert_time:
                del self._last_alert_time[pair]
        else:
            self._oi_data.clear()
            self._last_alert_time.clear()
