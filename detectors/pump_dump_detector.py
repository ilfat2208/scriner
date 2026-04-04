"""
Детектор Pump & Dump сигналов с двумя настраиваемыми комбинациями

Обнаружение резких изменений цены (pump/dump) с поддержкой:
1. ЛОНГ сигналы (для входа в long на небольших пампах)
2. ШОРТ сигналы (для входа в short на аномальных пампах/шорт-сквизах)

Каждая комбинация имеет свои настройки:
- Процент изменения цены (от 0.1% до 100%)
- Временное окно (от 1 до 30 минут)
"""

import asyncio
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable, Awaitable, List
from loguru import logger
from dataclasses import dataclass, field
import requests


@dataclass
class PumpDetectionConfig:
    """
    Конфигурация для одной комбинации обнаружения пампов
    
    Атрибуты:
        name: Название конфигурации (например "ЛОНГ" или "ШОРТ")
        enabled: Включена ли эта конфигурация
        min_percent: Минимальный процент изменения для алерта (0.1 - 100)
        window_seconds: Временное окно в секундах (60 - 1800, т.е. 1-30 минут)
        cooldown_seconds: Кулдаун между алертами в секундах
        direction: Направление - 'long' для покупок, 'short' для продаж
        
        # Новые фильтры
        rsi_enabled: Включить RSI фильтр
        rsi_min: Минимальное значение RSI (для LONG сигналов - перепроданность)
        rsi_max: Максимальное значение RSI (для LONG сигналов - перекупленность)
        rsi_period: Период RSI (по умолчанию 14)
        rsi_timeframe: Таймфрейм для RSI ('1m', '5m', '15m', '1h', '4h', '1d')
        
        # Фильтр 24h изменения
        change_24h_enabled: Включить фильтр 24h изменения
        change_24h_min: Минимальное 24h изменение (%)
        change_24h_max: Максимальное 24h изменение (%)
    """
    name: str = "LONG"
    enabled: bool = True
    min_percent: float = 1.0  # По умолчанию 1%
    window_seconds: int = 60  # По умолчанию 1 минута
    cooldown_seconds: int = 30  # 30 секунд между алертами
    direction: str = "long"  # 'long' или 'short'
    
    # RSI фильтр
    rsi_enabled: bool = False
    rsi_min: float = 30.0
    rsi_max: float = 70.0
    rsi_period: int = 14
    rsi_timeframe: str = "1h"
    
    # Фильтр 24h изменения
    change_24h_enabled: bool = False
    change_24h_min: float = -50.0
    change_24h_max: float = 50.0


class PumpDumpDetector:
    """
    Обнаружение резких изменений цены с двумя настраиваемыми комбинациями
    
    Алгоритм:
    1. Отслеживаем цену за последние N секунд для каждой конфигурации
    2. Считаем процентное изменение
    3. Если изменение > порога → алерт
    
    Поддерживает:
    - LONG: обнаружение небольших пампов для входа в лонг
    - SHORT: обнаружение аномальных пампов для входа в шорт (шорт-сквиз)
    """

    def __init__(
        self,
        # LONG комбинация (для небольших пампов)
        long_enabled: bool = True,
        long_min_percent: float = 1.0,  # 1% по умолчанию
        long_window_seconds: int = 60,  # 1 минута
        long_cooldown_seconds: int = 30,
        
        # SHORT комбинация (для шорт-сквизов)
        short_enabled: bool = True,
        short_min_percent: float = 10.0,  # 10% по умолчанию
        short_window_seconds: int = 300,  # 5 минут
        short_cooldown_seconds: int = 60,
        
        # Общие настройки
        min_signals_count: int = 1,
        min_price_change_for_alert: float = 0.5,  # Мин. изменение цены для нового алерта (%)
        on_pump_dump_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        """
        Инициализация детектора с двумя комбинациями
        
        Args:
            long_enabled: Включить детектирование для лонгов
            long_min_percent: Минимальный процент для лонг сигнала (0.1-100)
            long_window_seconds: Окно для лонгов в секундах (60-1800)
            long_cooldown_seconds: Кулдаун для лонгов
            
            short_enabled: Включить детектирование для шортов
            short_min_percent: Минимальный процент для шорт сигнала (0.1-100)
            short_window_seconds: Окно для шортов в секундах (60-1800)
            short_cooldown_seconds: Кулдаун для шортов
            
            min_signals_count: Минимальное количество сигналов
            min_price_change_for_alert: Минимальное изменение цены для алерта
            on_pump_dump_detected: Callback для обработки сигналов
        """
        # Конфигурация для LONG (небольшие пампы)
        self.long_config = PumpDetectionConfig(
            name="LONG",
            enabled=long_enabled,
            min_percent=long_min_percent,
            window_seconds=long_window_seconds,
            cooldown_seconds=long_cooldown_seconds,
            direction="long"
        )
        
        # Конфигурация для SHORT (шорт-сквизы)
        self.short_config = PumpDetectionConfig(
            name="SHORT",
            enabled=short_enabled,
            min_percent=short_min_percent,
            window_seconds=short_window_seconds,
            cooldown_seconds=short_cooldown_seconds,
            direction="short"
        )
        
        self.min_signals = min_signals_count
        self.min_price_change_for_alert = min_price_change_for_alert
        self.on_pump_dump_detected = on_pump_dump_detected

        # Хранилище цен по парам - для каждой конфигурации отдельно
        self._prices_long: Dict[str, deque] = {}
        self._prices_short: Dict[str, deque] = {}
        
        self._signal_counts: Dict[str, int] = {}
        
        # Cooldown для каждой конфигурации
        self._last_alert_time_long: Dict[str, float] = {}
        self._last_alert_time_short: Dict[str, float] = {}
        
        # Последнее изменение цены при алерте
        self._last_alert_price_change_long: Dict[str, float] = {}
        self._last_alert_price_change_short: Dict[str, float] = {}
        
        # Статистика
        self._long_count = 0
        self._short_count = 0
        self._total_checks = 0
        
        # Кэш для RSI и 24h данных
        self._rsi_cache: Dict[str, dict] = {}
        self._rsi_cache_time: Dict[str, float] = {}
        self._rsi_cache_ttl = 60  # TTL кэша в секундах
        
        # Кэш для 24h изменения
        self._change_24h_cache: Dict[str, dict] = {}
        self._change_24h_cache_time: Dict[str, float] = {}
        self._change_24h_cache_ttl = 30  # TTL кэша в секундах
        
        logger.info(
            f"🟢 LONG: {long_min_percent}% за {long_window_seconds} сек, "
            f"🔴 SHORT: {short_min_percent}% за {short_window_seconds} сек"
        )

    def check_price_change(
        self,
        pair: str,
        price: float,
        exchange: str = "BINANCE",
    ) -> Optional[dict]:
        """
        Проверка изменения цены для обеих комбинаций

        Args:
            pair: Торговая пара
            price: Текущая цена
            exchange: Биржа

        Returns:
            dict с данными pump/dump или None
        """
        self._total_checks += 1
        now = time.time()
        
        results = []
        
        # Проверка LONG комбинации (небольшие пампы для лонга)
        if self.long_config.enabled:
            long_result = self._check_config(
                config=self.long_config,
                prices_dict=self._prices_long,
                last_alert_time=self._last_alert_time_long,
                last_alert_price_change=self._last_alert_price_change_long,
                pair=pair,
                price=price,
                exchange=exchange,
                now=now,
                config_type="LONG"
            )
            if long_result:
                results.append(long_result)
        
        # Проверка SHORT комбинации (шорт-сквизы)
        if self.short_config.enabled:
            short_result = self._check_config(
                config=self.short_config,
                prices_dict=self._prices_short,
                last_alert_time=self._last_alert_time_short,
                last_alert_price_change=self._last_alert_price_change_short,
                pair=pair,
                price=price,
                exchange=exchange,
                now=now,
                config_type="SHORT"
            )
            if short_result:
                results.append(short_result)
        
        # Возвращаем первый сработавший сигнал
        return results[0] if results else None

    def _check_config(
        self,
        config: PumpDetectionConfig,
        prices_dict: Dict[str, deque],
        last_alert_time: Dict[str, float],
        last_alert_price_change: Dict[str, float],
        pair: str,
        price: float,
        exchange: str,
        now: float,
        config_type: str
    ) -> Optional[dict]:
        """Проверка одной конфигурации"""
        key = pair
        
        # Инициализация
        if key not in prices_dict:
            prices_dict[key] = deque()
        
        # Добавление текущей цены с timestamp
        prices_dict[key].append((now, price))
        
        # Очистка старых данных
        cutoff = now - config.window_seconds
        while prices_dict[key] and prices_dict[key][0][0] < cutoff:
            prices_dict[key].popleft()
        
        # Нужна минимум 1 цена для сравнения
        if len(prices_dict[key]) < 2:
            return None
        
        # Получение первой цены в окне
        first_time, first_price = prices_dict[key][0]
        price_change = ((price - first_price) / first_price) * 100
        
        # Определяем порог в зависимости от направления
        threshold = config.min_percent
        
        # Для LONG - проверяем рост (положительный процент)
        # Для SHORT - проверяем рост (так как это шорт-сквиз, цена растёт перед падением)
        if price_change >= threshold:
            return self._process_signal(
                config=config,
                key=key,
                prices_dict=prices_dict,
                last_alert_time=last_alert_time,
                last_alert_price_change=last_alert_price_change,
                pair=pair,
                exchange=exchange,
                price_change=price_change,
                first_price=first_price,
                current_price=price,
                now=now,
                config_type=config_type
            )
        
        # Сброс счётчика если цена вернулась в норму
        recovery_threshold = threshold * 0.5
        if abs(price_change) < recovery_threshold:
            if pair in self._signal_counts and self._signal_counts[pair] > 0:
                logger.debug(f"📊 {pair} цена вернулась в норму ({price_change:.2f}%), сброс счётчика")
                self._signal_counts[pair] = 0
                if pair in last_alert_price_change:
                    last_alert_price_change[pair] = 0
        
        return None

    def _process_signal(
        self,
        config: PumpDetectionConfig,
        key: str,
        prices_dict: Dict[str, deque],
        last_alert_time: Dict[str, float],
        last_alert_price_change: Dict[str, float],
        pair: str,
        exchange: str,
        price_change: float,
        first_price: float,
        current_price: float,
        now: float,
        config_type: str
    ) -> Optional[dict]:
        """Обработка сигнала"""
        # Проверка cooldown
        last_alert = last_alert_time.get(key, 0)
        time_since_last = now - last_alert
        
        # Защита от отрицательных значений
        if time_since_last < 0:
            time_since_last = float('inf')
        
        if time_since_last < config.cooldown_seconds:
            return None
        
        # Проверка минимального изменения цены с прошлого алерта
        last_price_change = last_alert_price_change.get(key, 0)
        price_change_diff = abs(price_change - last_price_change)
        
        if last_price_change > 0 and price_change_diff < self.min_price_change_for_alert:
            # Пропускаем - недостаточное изменение цены с прошлого алерта
            return None
        
        # Проверка RSI и 24h фильтров
        passed, filter_reason = self.check_filters(pair, config, current_price)
        if not passed:
            logger.debug(f"🔍 {pair} фильтр не пройден: {filter_reason}")
            return None
        
        # Увеличиваем счётчик
        if key not in self._signal_counts:
            self._signal_counts[key] = 0
        self._signal_counts[key] += 1
        signal_count = self._signal_counts[key]
        
        last_alert_time[key] = now
        last_alert_price_change[key] = price_change
        
        if config_type == "LONG":
            self._long_count += 1
        else:
            self._short_count += 1

        # Логирование
        emoji = "🟢" if config_type == "LONG" else "🔴"
        direction_text = "📈 LONG" if config_type == "LONG" else "📉 SHORT-SQUEEZE"
        
        logger.warning(
            f"{emoji} {direction_text}: {pair} | {price_change:+.2f}% | "
            f"({first_price:.6f} → {current_price:.6f}) | "
            f"{config.window_seconds // 60}мин | Сигнал #{signal_count}"
        )

        result = {
            "type": config_type,
            "direction": config.direction,
            "pair": pair,
            "exchange": exchange,
            "price_change": price_change,
            "start_price": first_price,
            "current_price": current_price,
            "signal_count": signal_count,
            "window_minutes": config.window_seconds // 60,
            "threshold_percent": config.min_percent,
        }

        # Вызов callback
        if self.on_pump_dump_detected:
            asyncio.create_task(self.on_pump_dump_detected(result))

        return result

    def update_config(self, config_type: str, **kwargs):
        """
        Обновление конфигурации одной комбинации
        
        Args:
            config_type: "long" или "short"
            **kwargs: Параметры для обновления (enabled, min_percent, window_seconds, cooldown_seconds)
        """
        config = self.long_config if config_type == "long" else self.short_config
        
        if "enabled" in kwargs:
            config.enabled = kwargs["enabled"]
        if "min_percent" in kwargs:
            config.min_percent = max(0.1, min(100, kwargs["min_percent"]))
        if "window_seconds" in kwargs:
            config.window_seconds = max(60, min(1800, kwargs["window_seconds"]))
        if "cooldown_seconds" in kwargs:
            config.cooldown_seconds = max(5, min(300, kwargs["cooldown_seconds"]))
        
        # RSI фильтр
        if "rsi_enabled" in kwargs:
            config.rsi_enabled = kwargs["rsi_enabled"]
        if "rsi_min" in kwargs:
            config.rsi_min = max(0, min(100, kwargs["rsi_min"]))
        if "rsi_max" in kwargs:
            config.rsi_max = max(0, min(100, kwargs["rsi_max"]))
        if "rsi_period" in kwargs:
            config.rsi_period = max(2, min(100, kwargs["rsi_period"]))
        if "rsi_timeframe" in kwargs:
            config.rsi_timeframe = kwargs["rsi_timeframe"]
        
        # 24h фильтр
        if "change_24h_enabled" in kwargs:
            config.change_24h_enabled = kwargs["change_24h_enabled"]
        if "change_24h_min" in kwargs:
            config.change_24h_min = max(-100, min(100, kwargs["change_24h_min"]))
        if "change_24h_max" in kwargs:
            config.change_24h_max = max(-100, min(100, kwargs["change_24h_max"]))
        
        logger.info(
            f"📝 Обновлена конфигурация {config_type.upper()}: "
            f"enabled={config.enabled}, min_percent={config.min_percent}%, "
            f"window={config.window_seconds}сек, "
            f"rsi={config.rsi_enabled} ({config.rsi_min}-{config.rsi_max}), "
            f"24h={config.change_24h_enabled} ({config.change_24h_min:+.1f}% to {config.change_24h_max:+.1f}%)"
        )

    def get_config(self, config_type: str = None) -> dict:
        """
        Получение текущей конфигурации
        
        Args:
            config_type: "long", "short" или None для всех
        """
        if config_type == "long":
            return {
                "enabled": self.long_config.enabled,
                "min_percent": self.long_config.min_percent,
                "window_seconds": self.long_config.window_seconds,
                "window_minutes": self.long_config.window_seconds // 60,
                "cooldown_seconds": self.long_config.cooldown_seconds,
                "direction": self.long_config.direction,
                "rsi_enabled": self.long_config.rsi_enabled,
                "rsi_min": self.long_config.rsi_min,
                "rsi_max": self.long_config.rsi_max,
                "rsi_period": self.long_config.rsi_period,
                "rsi_timeframe": self.long_config.rsi_timeframe,
                "change_24h_enabled": self.long_config.change_24h_enabled,
                "change_24h_min": self.long_config.change_24h_min,
                "change_24h_max": self.long_config.change_24h_max
            }
        elif config_type == "short":
            return {
                "enabled": self.short_config.enabled,
                "min_percent": self.short_config.min_percent,
                "window_seconds": self.short_config.window_seconds,
                "window_minutes": self.short_config.window_seconds // 60,
                "cooldown_seconds": self.short_config.cooldown_seconds,
                "direction": self.short_config.direction,
                "rsi_enabled": self.short_config.rsi_enabled,
                "rsi_min": self.short_config.rsi_min,
                "rsi_max": self.short_config.rsi_max,
                "rsi_period": self.short_config.rsi_period,
                "rsi_timeframe": self.short_config.rsi_timeframe,
                "change_24h_enabled": self.short_config.change_24h_enabled,
                "change_24h_min": self.short_config.change_24h_min,
                "change_24h_max": self.short_config.change_24h_max
            }
        else:
            return {
                "long": self.get_config("long"),
                "short": self.get_config("short")
            }

    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            "long_count": self._long_count,
            "short_count": self._short_count,
            "total_checks": self._total_checks,
            "tracked_pairs_long": len(self._prices_long),
            "tracked_pairs_short": len(self._prices_short),
            "long_config": {
                "enabled": self.long_config.enabled,
                "min_percent": self.long_config.min_percent,
                "window_minutes": self.long_config.window_seconds // 60
            },
            "short_config": {
                "enabled": self.short_config.enabled,
                "min_percent": self.short_config.min_percent,
                "window_minutes": self.short_config.window_seconds // 60
            }
        }
    
    def _get_rsi(self, symbol: str, timeframe: str = "1h", period: int = 14) -> Optional[float]:
        """
        Получение RSI для символа
        
        Args:
            symbol: Символ (BTCUSDT)
            timeframe: Таймфрейм
            period: Период RSI
            
        Returns:
            Значение RSI или None
        """
        now = time.time()
        cache_key = f"{symbol}_{timeframe}"
        
        # Проверка кэша
        if cache_key in self._rsi_cache:
            if now - self._rsi_cache_time.get(cache_key, 0) < self._rsi_cache_ttl:
                return self._rsi_cache[cache_key].get('rsi')
        
        try:
            # Получение свечей
            url = f"https://fapi.binance.com/fapi/v1/klines"
            params = {
                'symbol': symbol,
                'interval': timeframe,
                'limit': period + 20  # Нужно больше данных для расчёта RSI
            }
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code != 200:
                return None
            
            klines = response.json()
            if not klines or len(klines) < period + 1:
                return None
            
            # Расчёт RSI
            closes = [float(k[4]) for k in klines]
            rsi = self._calculate_rsi(closes, period)
            
            # Сохранение в кэш
            self._rsi_cache[cache_key] = {'rsi': rsi}
            self._rsi_cache_time[cache_key] = now
            
            return rsi
            
        except Exception as e:
            logger.debug(f"⚠️ Ошибка получения RSI для {symbol}: {e}")
            return None
    
    def _calculate_rsi(self, closes: List[float], period: int = 14) -> float:
        """
        Расчёт RSI
        
        Args:
            closes: Список цен закрытия
            period: Период RSI
            
        Returns:
            Значение RSI
        """
        if len(closes) < period + 1:
            return 50.0
        
        gains = []
        losses = []
        
        for i in range(1, len(closes)):
            change = closes[i] - closes[i - 1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < period:
            return 50.0
        
        # Средние значения
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _get_change_24h(self, symbol: str) -> Optional[dict]:
        """
        Получение 24h изменения для символа
        
        Args:
            symbol: Символ (BTCUSDT)
            
        Returns:
            dict с change_24h, volume_24h, high_24h, low_24h или None
        """
        now = time.time()
        cache_key = symbol
        
        # Проверка кэша
        if cache_key in self._change_24h_cache:
            if now - self._change_24h_cache_time.get(cache_key, 0) < self._change_24h_cache_ttl:
                return self._change_24h_cache[cache_key]
        
        try:
            url = f"https://fapi.binance.com/fapi/v1/ticker/24hr"
            params = {'symbol': symbol}
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code != 200:
                return None
            
            data = response.json()
            
            result = {
                'change_24h': float(data.get('priceChangePercent', 0)),
                'volume_24h': float(data.get('quoteVolume', 0)),
                'high_24h': float(data.get('highPrice', 0)),
                'low_24h': float(data.get('lowPrice', 0)),
                'price': float(data.get('lastPrice', 0))
            }
            
            # Сохранение в кэш
            self._change_24h_cache[cache_key] = result
            self._change_24h_cache_time[cache_key] = now
            
            return result
            
        except Exception as e:
            logger.debug(f"⚠️ Ошибка получения 24h данных для {symbol}: {e}")
            return None
    
    def check_filters(
        self,
        pair: str,
        config: PumpDetectionConfig,
        price: float
    ) -> tuple[bool, str]:
        """
        Проверка фильтров RSI и 24h изменения
        
        Args:
            pair: Торговая пара (BTC/USDT)
            config: Конфигурация
            price: Текущая цена
            
        Returns:
            (passed: bool, reason: str)
        """
        # Конвертация пары в символ
        symbol = pair.replace('/', '')
        
        # Проверка RSI фильтра
        if config.rsi_enabled:
            rsi = self._get_rsi(symbol, config.rsi_timeframe, config.rsi_period)
            if rsi is not None:
                # Для LONG сигналов - RSI должен быть в диапазоне
                if config.direction == "long":
                    if rsi < config.rsi_min:
                        logger.debug(f"📊 {pair} RSI={rsi:.1f} < {config.rsi_min:.1f} (перепроданность - good for LONG)")
                    elif rsi > config.rsi_max:
                        return False, f"RSI={rsi:.1f} > {config.rsi_max:.1f} (перекупленность)"
                # Для SHORT сигналов - наоборот
                else:
                    if rsi > config.rsi_max:
                        logger.debug(f"📊 {pair} RSI={rsi:.1f} > {config.rsi_max:.1f} (перекупленность - good for SHORT)")
                    elif rsi < config.rsi_min:
                        return False, f"RSI={rsi:.1f} < {config.rsi_min:.1f} (перепроданность)"
        
        # Проверка 24h изменения
        if config.change_24h_enabled:
            change_data = self._get_change_24h(symbol)
            if change_data is not None:
                change_24h = change_data['change_24h']
                if not (config.change_24h_min <= change_24h <= config.change_24h_max):
                    return False, f"24h change {change_24h:+.2f}% вне диапазона [{config.change_24h_min:+.1f}%, {config.change_24h_max:+.1f}%]"
        
        return True, ""

    def reset(self, pair: str = None):
        """Сброс данных"""
        if pair:
            for d in [self._prices_long, self._prices_short]:
                if pair in d:
                    del d[pair]
            if pair in self._signal_counts:
                del self._signal_counts[pair]
            for d in [self._last_alert_time_long, self._last_alert_time_short]:
                if pair in d:
                    del d[pair]
            for d in [self._last_alert_price_change_long, self._last_alert_price_change_short]:
                if pair in d:
                    del d[pair]
        else:
            self._prices_long.clear()
            self._prices_short.clear()
            self._signal_counts.clear()
            self._last_alert_time_long.clear()
            self._last_alert_time_short.clear()
            self._last_alert_price_change_long.clear()
            self._last_alert_price_change_short.clear()
