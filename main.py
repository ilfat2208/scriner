#!/usr/bin/env python3
"""
🐋 Crypto Whale Screener
Автономная система обнаружения крупных сделок в реальном времени

Author: Senior Python Developer
Version: 2.0.0
"""

import asyncio
import signal
import sys
from pathlib import Path
from typing import List, Optional, Dict

from loguru import logger
from pydantic_settings import BaseSettings
import yaml

# Импорт компонентов
from bot.telegram_bot import WhaleAlertBot
from exchanges.cex import CEXMonitor
from exchanges.dex import DEXMonitor
from detectors.whale_detector import WhaleDetector
from detectors.momentum_detector import MomentumDetector
from detectors.pump_dump_detector import PumpDumpDetector
from detectors.open_interest_detector import OpenInterestDetector
from detectors.ml_anomaly_detector import MLAnomalyDetector
from detectors.accumulation_detector import AccumulationDetector
from utils.logger import setup_logger
from models.alert import Alert, AlertType


class Settings(BaseSettings):
    """Настройки приложения из .env"""

    telegram_bot_token: str
    telegram_admin_id: int

    binance_api_key: Optional[str] = None
    binance_api_secret: Optional[str] = None

    # ByBit API
    bybit_api_key: Optional[str] = None
    bybit_api_secret: Optional[str] = None

    eth_rpc_url: Optional[str] = None
    log_level: str = "INFO"

    # Изменено: принимаем как строку, парсим вручную
    whitelist_addresses: str = "[]"
    blacklist_addresses: str = "[]"

    database_url: Optional[str] = None

    @property
    def whitelist_list(self) -> List[str]:
        """Парсинг whitelist адресов"""
        try:
            import json
            return json.loads(self.whitelist_addresses) if self.whitelist_addresses else []
        except (json.JSONDecodeError, ValueError):
            # Если не JSON, пробуем как CSV
            return [a.strip() for a in self.whitelist_addresses.split(",") if a.strip()]

    @property
    def blacklist_list(self) -> List[str]:
        """Парсинг blacklist адресов"""
        try:
            import json
            return json.loads(self.blacklist_addresses) if self.blacklist_addresses else []
        except (json.JSONDecodeError, ValueError):
            # Если не JSON, пробуем как CSV
            return [a.strip() for a in self.blacklist_addresses.split(",") if a.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class WhaleScreener:
    """
    Основной класс скринера
    
    Управляет всеми компонентами системы:
    - Подключение к биржам (CEX + DEX)
    - Детекция китовых сделок
    - Отправка алертов в Telegram
    """
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.settings = Settings()

        # Настройка логирования
        setup_logger(self.settings.log_level)

        # Компоненты системы
        self.bot: Optional[WhaleAlertBot] = None
        self.cex_monitor: Optional[CEXMonitor] = None
        self.dex_monitor: Optional[DEXMonitor] = None
        # Китовые сделки ОТКЛЮЧЕНЫ
        # self.whale_detector = WhaleDetector(
        #     min_volume_usd=300000,
        #     whitelist=self.settings.whitelist_list,
        #     blacklist=self.settings.blacklist_list
        # )
        
        # MomentumDetector отключён - оставляем только PUMP
        # self.momentum_detector = MomentumDetector(
        #     window_seconds=self.config['whale_detection']['momentum_window_seconds'],
        #     threshold_percent=self.config['whale_detection']['momentum_threshold_percent'],
        #     min_volume_usd=10000,
        # )
        self.pump_dump_detector = PumpDumpDetector(
            # LONG комбинация (для небольших пампов в лонг)
            long_enabled=self.config.get('pump_detector', {}).get('long', {}).get('enabled', True),
            long_min_percent=self.config.get('pump_detector', {}).get('long', {}).get('min_percent', 1.0),
            long_window_seconds=self.config.get('pump_detector', {}).get('long', {}).get('window_seconds', 60),
            long_cooldown_seconds=self.config.get('pump_detector', {}).get('long', {}).get('cooldown_seconds', 30),
            # SHORT комбинация (для шорт-сквизов)
            short_enabled=self.config.get('pump_detector', {}).get('short', {}).get('enabled', True),
            short_min_percent=self.config.get('pump_detector', {}).get('short', {}).get('min_percent', 10.0),
            short_window_seconds=self.config.get('pump_detector', {}).get('short', {}).get('window_seconds', 300),
            short_cooldown_seconds=self.config.get('pump_detector', {}).get('short', {}).get('cooldown_seconds', 60),
            min_signals_count=1,
            min_price_change_for_alert=3.0,  # 3% минимальное изменение для нового алерта
        )
        # OI детектор включён
        self.oi_detector = OpenInterestDetector(
            oi_change_threshold=5.0,
            window_minutes=15,
            check_interval_seconds=60,
        )
        # Accumulation detector (консолидация и пробой)
        self.accumulation_detector = AccumulationDetector(
            consolidation_window_minutes=30,
            consolidation_threshold_percent=0.5,
            breakout_window_minutes=5,
            breakout_threshold_percent=3.0,
            check_interval_seconds=30,
        )
        # ML детектор отключён
        # self.ml_detector = MLAnomalyDetector(
        #     contamination=0.005,
        #     n_estimators=100,
        #     window_size=100,
        #     min_samples=50,
        #     min_severity=1.5,
        # )

        # Флаги управления
        self._running = False
        self._shutdown_event = asyncio.Event()
        
        # Для обратной совместимости
        self.whale_detector = None
        self.oi_detector = None

        logger.info("🐋 Whale Screener инициализирован")
    
    @staticmethod
    def _load_config(config_path: str) -> dict:
        """Загрузка конфигурации из YAML"""
        path = Path(config_path)
        if not path.exists():
            logger.warning(f"Конфиг {config_path} не найден, используем настройки по умолчанию")
            return {
                'whale_detection': {
                    'min_volume_usd': 300000,
                    'momentum_window_seconds': 60,
                    'momentum_threshold_percent': 300
                },
                'tracked_pairs': 'ALL',  # Все фьючерсные пары
                'exchanges': {'cex': ['binance'], 'dex': []},
                'notifications': {'send_to_telegram': True, 'cooldown_seconds': 5},
                'filters': {'exclude_wash_trading': True}
            }

        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    async def _get_all_futures_pairs(self) -> List[str]:
        """
        Получение всех фьючерсных пар с Binance
        
        Returns:
            Список пар в формате ['BTC/USDT', 'ETH/USDT', ...]
        """
        import aiohttp
        
        logger.info("📡 Получение списка всех фьючерсных пар Binance...")
        
        try:
            import aiohttp
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = "https://fapi.binance.com/fapi/v1/exchangeInfo"

                async with session.get(url) as response:
                    if response.status != 200:
                        raise Exception(f"Binance API returned {response.status}")
                    data = await response.json()
                    
                    # Фильтрация только USDT пар с статусом TRADING
                    pairs = []
                    for symbol in data.get('symbols', []):
                        if (symbol.get('quoteAsset') == 'USDT' and 
                            symbol.get('status') == 'TRADING' and
                            symbol.get('contractType') == 'PERPETUAL'):
                            pair = f"{symbol['baseAsset']}/{symbol['quoteAsset']}"
                            pairs.append(pair)
                    
                    # Сортировка по объёму (BTC, ETH, SOL первыми)
                    priority = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'MATIC', 'DOT', 'AVAX']
                    pairs.sort(key=lambda x: (x.split('/')[0] not in priority, x))
                    
                    logger.info(f"✅ Найдено {len(pairs)} фьючерсных пар")
                    logger.info(f"📊 Топ-10: {', '.join(pairs[:10])}")
                    
                    return pairs
                    
        except Exception as e:
            logger.error(f"❌ Ошибка получения пар: {e}")
            logger.warning("⚠️ Используем дефолтный список пар")
            # Возврат дефолтного списка при ошибке
            default_pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 
                           'DOGE/USDT', 'ADA/USDT', 'MATIC/USDT', 'DOT/USDT', 'AVAX/USDT',
                           'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'NEAR/USDT', 'APT/USDT',
                           'ARB/USDT', 'OP/USDT', 'INJ/USDT', 'SUI/USDT', 'LTC/USDT']
            return default_pairs
    
    async def initialize(self):
        """Инициализация всех компонентов"""
        logger.info("🔧 Инициализация компонентов...")

        # Инициализация Telegram бота
        self.bot = WhaleAlertBot(
            token=self.settings.telegram_bot_token,
            admin_id=self.settings.telegram_admin_id,
            screener=self
        )
        await self.bot.initialize()

        # Получение списка пар
        tracked_pairs_config = self.config.get('tracked_pairs', 'ALL')
        
        if tracked_pairs_config == 'ALL':
            # Получение всех фьючерсных пар с Binance
            pairs = await self._get_all_futures_pairs()
        else:
            # Использование списка из конфига
            pairs = tracked_pairs_config

        logger.info(f"📈 Отслеживаем пар: {len(pairs)}")

        # Инициализация мониторов бирж
        self.cex_monitor = CEXMonitor(
            exchanges=self.config['exchanges']['cex'],
            pairs=pairs,
            whale_detector=None,  # Китовые сделки отключены
            momentum_detector=None,  # Momentum отключён
            on_alert=self._handle_alert,
            pump_dump_detector=self.pump_dump_detector,
            oi_detector=self.oi_detector,
            ml_detector=None,  # ML отключён
            accumulation_detector=self.accumulation_detector  # Accumulation detector
        )

        if self.settings.eth_rpc_url:
            self.dex_monitor = DEXMonitor(
                exchanges=self.config['exchanges']['dex'],
                rpc_url=self.settings.eth_rpc_url,
                whale_detector=self.whale_detector,
                on_alert=self._handle_alert
            )

        logger.info("✅ Все компоненты инициализированы")
    
    async def _handle_alert(self, alert: Alert):
        """
        Обработка обнаруженной китовой сделки

        Args:
            alert: Объект алерта
        """
        if alert.alert_type in [AlertType.WHALE, AlertType.MOMENTUM]:
            logger.warning(f"🚨 ALERT: {alert.pair} | {alert.side} | ${alert.volume_usd:,.2f}")
        elif alert.alert_type in [AlertType.PUMP, AlertType.DUMP]:
            logger.warning(f"🚨 {alert.alert_type.value}: {alert.pair} | {alert.price_change:+.2f}%")
        elif alert.alert_type in [AlertType.OI_INCREASE, AlertType.OI_DECREASE]:
            logger.warning(f"🚨 OI: {alert.pair} | {alert.price_change:+.2f}%")

        if self.config['notifications']['send_to_telegram'] and self.bot:
            await self.bot.send_alert(alert)

    async def _process_trade(self, exchange: str, pair: str, price: float, amount: float, side: str):
        """
        Обработка трейда всеми детекторами

        Args:
            exchange: Биржа
            pair: Пара
            price: Цена
            amount: Количество
            side: Сторона
        """
        volume_usd = amount * price

        # Whale detector
        is_whale = self.whale_detector.check_whale(
            volume_usd=volume_usd,
            side=side,
            exchange=exchange,
            pair=pair,
            price=price,
            amount=amount,
        )

        # Momentum detector
        is_momentum = self.momentum_detector.check_momentum(
            pair=pair,
            volume_usd=volume_usd,
            side=side,
            exchange=exchange,
            price=price,
            amount=amount,
        )

        # Pump/Dump detector
        pump_dump = self.pump_dump_detector.check_price_change(
            pair=pair,
            price=price,
            exchange=exchange,
        )

        # Создание алертов
        if is_whale:
            alert = Alert(
                alert_type=AlertType.WHALE,
                exchange=exchange,
                pair=pair,
                side=side,
                volume_usd=volume_usd,
                amount=amount,
                price=price,
            )
            await self._handle_alert(alert)

        if is_momentum:
            alert = Alert(
                alert_type=AlertType.MOMENTUM,
                exchange=exchange,
                pair=pair,
                side=side,
                volume_usd=volume_usd,
                amount=amount,
                price=price,
            )
            await self._handle_alert(alert)

        if pump_dump:
            alert = Alert(
                alert_type=AlertType.PUMP if pump_dump['type'] == 'PUMP' else AlertType.DUMP,
                exchange=exchange,
                pair=pair,
                price_change=pump_dump['price_change'],
                start_price=pump_dump['start_price'],
                price=pump_dump['current_price'],
                signal_count=pump_dump['signal_count'],
            )
            await self._handle_alert(alert)
    
    async def start(self):
        """Запуск скринера"""
        logger.info("🚀 Запуск Whale Screener...")
        self._running = True
        
        # Запуск бота
        bot_task = asyncio.create_task(self.bot.start())
        
        # Запуск мониторов
        cex_task = asyncio.create_task(self.cex_monitor.start())
        dex_task = None
        
        if self.dex_monitor:
            dex_task = asyncio.create_task(self.dex_monitor.start())
        
        # Ожидание сигнала остановки
        await self._shutdown_event.wait()
        
        # Остановка
        logger.info("⏹️ Остановка Whale Screener...")
        self._running = False
        
        if self.cex_monitor:
            await self.cex_monitor.stop()
        if self.dex_monitor:
            await self.dex_monitor.stop()
        if self.bot:
            await self.bot.stop()
        
        # Отмена задач
        for task in [bot_task, cex_task, dex_task]:
            if task and not task.done():
                task.cancel()
        
        logger.info("✅ Whale Screener остановлен")
    
    async def stop(self):
        """Сигнал остановки"""
        self._shutdown_event.set()
    
    def update_config(self, new_config: dict):
        """Обновление конфигурации через бота"""
        self.config.update(new_config)
        self.whale_detector.min_volume_usd = self.config['whale_detection']['min_volume_usd']
        logger.info(f"📝 Конфигурация обновлена: {new_config}")


async def main():
    """Точка входа"""
    # Проверка .env файла
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ Файл .env не найден!")
        print("📝 Скопируйте .env.example в .env и заполните значения")
        sys.exit(1)

    screener = WhaleScreener()

    # Обработка сигналов ОС
    # Примечание: на Windows add_signal_handler не работает
    loop = asyncio.get_event_loop()

    def signal_handler():
        logger.info("📶 Получен сигнал остановки")
        asyncio.create_task(screener.stop())

    # Добавляем обработчики сигналов (работает на Linux/Mac)
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, signal_handler)
        except (NotImplementedError, OSError):
            # На Windows сигналы обрабатываются через KeyboardInterrupt
            pass

    try:
        await screener.initialize()
        await screener.start()
    except KeyboardInterrupt:
        logger.info("⌨️ Прервано пользователем")
        await screener.stop()
    except Exception as e:
        logger.exception(f"❌ Критическая ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())