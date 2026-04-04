"""
Детектор накопления/консолидации и пробоя
"""
import asyncio
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Awaitable
from loguru import logger

from models.alert import Alert, AlertType


class AccumulationDetector:
    """
    Обнаружение накопления (консолидации) followed by a breakout
    
    Алгоритм:
    1. Отслеживаем цену за длительный период (окно консолидации)
    2. Если цена движется в узком диапазоне (консолидация)
    3. Затем проверяем пробой из этого диапазона за короткий период
    4. Если пробой подтверждается -> алерт
    """
    
    def __init__(
        self,
        consolidation_window_minutes: int = 30,  # Окно для проверки консолидации
        consolidation_threshold_percent: float = 0.5,  # Порог диапазона для консолидации (%)
        breakout_window_minutes: int = 5,  # Окно для проверки пробоя
        breakout_threshold_percent: float = 3.0,  # Порог пробоя (%)
        check_interval_seconds: int = 30,  # Интервал проверки
        on_accumulation_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        self.consolidation_window = consolidation_window_minutes
        self.consolidation_threshold = consolidation_threshold_percent
        self.breakout_window = breakout_window_minutes
        self.breakout_threshold = breakout_threshold_percent
        self.check_interval = check_interval_seconds
        self.on_accumulation_detected = on_accumulation_detected
        
        # Хранилище цен по парам
        self._price_data: Dict[str, deque] = {}
        self._last_alert_time: Dict[str] = {}
        
        # Статистика
        self._alert_count = 0
        
        logger.info(
            f"📊 Accumulation Detector initialized: "
            f"consolidation={consolidation_window_minutes}min/{consolidation_threshold_percent}%, "
            f"breakout={breakout_window_minutes}min/{breakout_threshold_percent}%"
        )
    
    def check_accumulation(
        self,
        pair: str,
        price: float,
        exchange: str = "BINANCE",
    ) -> Optional[dict]:
        """
        Проверка накопления и пробоя
        
        Args:
            pair: Торговая пара
            price: Текущая цена
            exchange: Биржа
            
        Returns:
            dict с данными накопления или None
        """
        now = datetime.now()
        key = pair
        
        # Инициализация
        if key not in self._price_data:
            self._price_data[key] = deque()
            logger.info(f"📊 {pair}: Начало отслеживания для накопления")
        
        # Добавление текущей цены
        self._price_data[key].append((now, price))
        
        # Очистка старых данных (оставляем только за consolidation_window + breakout_window)
        cutoff = now - timedelta(minutes=self.consolidation_window + self.breakout_window)
        while self._price_data[key] and self._price_data[key][0][0] < cutoff:
            self._price_data[key].popleft()
        
        # Нужна достаточно данных для анализа
        if len(self._price_data[key]) < 2:
            return None
        
        # Разбиваем данные на два окна: консолидация и потенциальный пробой
        consolidation_cutoff = now - timedelta(minutes=self.consolidation_window)
        breakout_cutoff = now - timedelta(minutes=self.breakout_window)
        
        consolidation_prices = [p for t, p in self._price_data[key] if t >= consolidation_cutoff]
        breakout_prices = [p for t, p in self._price_data[key] if t >= breakout_cutoff]
        
        # Проверяем, что у нас есть данные для обоих окон
        if len(consolidation_prices) < 2 or len(breakout_prices) < 2:
            return None
        
        # Анализ консолидации: цена должна двигаться в узком диапазоне
        consolidation_min = min(consolidation_prices)
        consolidation_max = max(consolidation_prices)
        consolidation_range = ((consolidation_max - consolidation_min) / consolidation_min) * 100 if consolidation_min > 0 else 0
        
        # Если консолидация не обнаружена (диапазон слишком широкий), сбрасываем и ждем
        if consolidation_range > self.consolidation_threshold:
            # Сбрасываем данные консолидации, чтобы начать заново
            # Оставляем только данные за breakout_window для возможного следующего анализа
            self._price_data[key] = deque([(t, p) for t, p in self._price_data[key] if t >= breakout_cutoff])
            return None
        
        # Проверяем пробой: цена вышла за пределы диапазона консолидации
        # Мы ищем восходящий пробой (как указано в запросе пользователя)
        current_price = price
        breakout_level = consolidation_max * (1 + self.breakout_threshold / 100)
        
        if current_price >= breakout_level:
            # Проверяем cooldown (один алерт в интервал check_interval на пару)
            last_alert = self._last_alert_time.get(key)
            if last_alert and (now - last_alert).total_seconds() < self.check_interval:
                return None
            
            self._last_alert_time[key] = now
            self._alert_count += 1
            
            logger.warning(
                f"📈 ACCUMULATION BREAKOUT: {pair} | "
                f"Консолидация: {consolidation_range:.2f}% ({consolidation_min:.6f} → {consolidation_max:.6f}) | "
                f"Пробой: +{self.breakout_threshold:.2f}% | "
                f"Текущая цена: {current_price:.6f}"
            )
            
            result = {
                "type": "ACCUMULATION",
                "pair": pair,
                "exchange": exchange,
                "side": "BREAKOUT",
                "volume_usd": 0.0,
                "amount": 0.0,
                "price": current_price,
                "timestamp": now,
                "price_change": consolidation_range,  # consolidation range in percent
                "start_price": consolidation_min,
                "current_oi": 0,
                "signal_count": 1,
                "oi_price_change": self.breakout_threshold,  # breakout threshold in percent
            }
            
            # Вызов callback
            if self.on_accumulation_detected:
                asyncio.create_task(self.on_accumulation_detected(result))
            
            return result
        
        return None
    
    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            "alert_count": self._alert_count,
            "tracked_pairs": len(self._price_data),
        }
    
    def reset(self, pair: str = None):
        """Сброс данных"""
        if pair:
            if pair in self._price_data:
                del self._price_data[pair]
            if pair in self._last_alert_time:
                del self._last_alert_time[pair]
        else:
            self._price_data.clear()
            self._last_alert_time.clear()