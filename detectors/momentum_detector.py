"""
Детектор импульса покупок/продаж
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, Callable, Awaitable, Optional
from loguru import logger


class MomentumDetector:
    """
    Обнаружение аномального роста объёма

    Алгоритм:
    1. Считаем объём за последние N секунд
    2. Сравниваем с базовым уровнем
    3. Если рост > X% → алерт
    
    Интеграция:
    - Вызов callback при обнаружении импульса
    - Отправка в API через signal_emitter
    """

    def __init__(
        self,
        window_seconds: int = 60,
        threshold_percent: int = 300,
        on_momentum_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
        min_volume_usd: float = 10000,  # Новый параметр
    ):
        self.window_seconds = window_seconds
        self.threshold_percent = threshold_percent
        self.on_momentum_detected = on_momentum_detected
        self.min_volume_usd = min_volume_usd  # Минимальный объём

        # Хранилище объёмов по парам
        self._volumes: Dict[str, deque] = {}
        self._baseline_volumes: Dict[str, float] = {}
        
        # Статистика
        self._momentum_count = 0

    def check_momentum(
        self, 
        pair: str, 
        volume_usd: float, 
        side: str,
        exchange: str = "BINANCE",
        price: float = 0,
        amount: float = 0,
    ) -> bool:
        """
        Проверка импульса

        Args:
            pair: Торговая пара
            volume_usd: Объём сделки
            side: BUY или SELL
            exchange: Биржа
            price: Цена сделки
            amount: Количество токенов

        Returns:
            bool: True если обнаружен импульс
        """
        # Проверка минимального объёма
        if volume_usd < self.min_volume_usd:
            return False  # Игнорируем мелкие сделки
        
        now = datetime.now()
        key = f"{pair}_{side}"

        # Инициализация
        if key not in self._volumes:
            self._volumes[key] = deque()
            self._baseline_volumes[key] = 0

        # Добавление текущего объёма
        self._volumes[key].append((now, volume_usd))

        # Очистка старых данных
        cutoff = now - timedelta(seconds=self.window_seconds)
        while self._volumes[key] and self._volumes[key][0][0] < cutoff:
            self._volumes[key].popleft()

        # Расчёт текущего объёма за окно
        current_volume = sum(v for _, v in self._volumes[key])

        # Установка базового уровня
        if self._baseline_volumes[key] == 0:
            self._baseline_volumes[key] = current_volume
            return False

        # Проверка роста
        growth_percent = ((current_volume - self._baseline_volumes[key])
                         / max(self._baseline_volumes[key], 1) * 100)

        if growth_percent >= self.threshold_percent:
            logger.warning(
                f"📈 IMPULSE: {pair} {side} | "
                f"+{growth_percent:.0f}% | "
                f"${current_volume:,.0f}"
            )

            self._momentum_count += 1

            # Вызов callback если задан
            if self.on_momentum_detected:
                try:
                    asyncio.create_task(self.on_momentum_detected({
                        "signal_type": "MOMENTUM",
                        "exchange": exchange,
                        "pair": pair,
                        "side": side,
                        "volume_usd": volume_usd,
                        "amount": amount,
                        "price": price,
                        "growth_percent": growth_percent,
                    }))
                except Exception as e:
                    logger.error(f"❌ Ошибка callback импульса: {e}")

            # Обновление базового уровня
            self._baseline_volumes[key] = current_volume
            return True

        # Плавное обновление базового уровня
        self._baseline_volumes[key] = (
            0.9 * self._baseline_volumes[key] +
            0.1 * current_volume
        )

        return False

    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            "momentum_count": self._momentum_count,
            "tracked_pairs": len(self._volumes),
        }

    def reset_baseline(self, pair: str = None):
        """Сброс базовых уровней"""
        if pair:
            for key in list(self._baseline_volumes.keys()):
                if pair in key:
                    self._baseline_volumes[key] = 0
        else:
            self._baseline_volumes.clear()