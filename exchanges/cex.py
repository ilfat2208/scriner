"""
Мониторинг централизованных бирж (CEX) через WebSocket
"""

import asyncio
import json
import time
from typing import List, Dict, Callable, Optional
from datetime import datetime
import aiohttp
from loguru import logger

from models.alert import Alert, AlertType
from detectors.pump_dump_detector import PumpDumpDetector
# OI и ML детекторы отключены
# from detectors.open_interest_detector import OpenInterestDetector
# from detectors.ml_anomaly_detector import MLAnomalyDetector


class CEXMonitor:
    """
    Асинхронный монитор CEX бирж

    Поддерживает:
    - Binance Futures (через WebSocket)
    - Bybit (через REST polling)
    """

    # WebSocket эндпоинты
    BINANCE_WS_URL = "wss://fstream.binance.com/ws"
    BYBIT_WS_URL = "wss://stream.bybit.com/v5/public/linear"

    def __init__(
        self,
        exchanges: List[str],
        pairs: List[str],
        whale_detector,  # Не используется
        momentum_detector,  # Не используется
        on_alert: Callable,
        pump_dump_detector: PumpDumpDetector = None,
        oi_detector=None,  # Не используется
        ml_detector=None,  # Не используется
        accumulation_detector=None,  # Аккумуляция/консолидация
    ):
        self.exchange_names = exchanges
        self.pairs = pairs
        # Китовый детектор отключён
        # self.whale_detector = whale_detector
        # Momentum детектор отключён
        # self.momentum_detector = momentum_detector
        self.pump_dump_detector = pump_dump_detector or PumpDumpDetector()
        # OI детектор отключён
        # self.oi_detector = oi_detector or OpenInterestDetector()
        # ML детектор отключён
        # self.ml_detector = ml_detector or MLAnomalyDetector()
        self.on_alert = on_alert
        self.accumulation_detector = accumulation_detector

        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._session: Optional[aiohttp.ClientSession] = None

    async def initialize(self):
        """Инициализация HTTP сессии"""
        self._session = aiohttp.ClientSession(
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=aiohttp.ClientTimeout(total=10)
        )
        logger.info("✅ HTTP сессия инициализирована")

    async def start(self):
        """Запуск мониторинга"""
        logger.info(f"📡 Запуск CEX мониторинга: {len(self.pairs)} пар")
        self._running = True

        await self.initialize()

        # Запуск WebSocket для Binance
        if 'binance' in self.exchange_names:
            task = asyncio.create_task(self._monitor_binance())
            self._tasks.append(task)

        # Запуск REST polling для Bybit
        if 'bybit' in self.exchange_names:
            task = asyncio.create_task(self._monitor_bybit())
            self._tasks.append(task)

        await asyncio.gather(*self._tasks, return_exceptions=True)

    async def _monitor_binance(self):
        """Мониторинг Binance через WebSocket"""
        logger.info("🔌 Подключение к Binance WebSocket...")
        
        # OI проверка отключена
        # oi_task = asyncio.create_task(self._oi_check_loop())
        
        while self._running:
            try:
                # Формирование стримов для всех пар
                streams = []
                for pair in self.pairs:
                    symbol = pair.replace('/', '').lower()
                    streams.append(f"{symbol}@aggTrade")

                # Группировка по 100 стримов (лимит Binance)
                batch_size = 100
                for i in range(0, len(streams), batch_size):
                    batch_streams = streams[i:i + batch_size]
                    ws_url = f"{self.BINANCE_WS_URL}/{'/'.join(batch_streams)}"
                    
                    async with self._session.ws_connect(ws_url) as ws:
                        logger.info(f"✅ Binance WebSocket подключен ({len(batch_streams)} стримов)")
                        
                        async for msg in ws:
                            if not self._running:
                                break
                                
                            if msg.type == aiohttp.WSMsgType.TEXT:
                                data = json.loads(msg.data)
                                
                                # Обработка trade
                                if data.get('e') == 'aggTrade':
                                    await self._process_binance_trade(data)
                                    
                            elif msg.type == aiohttp.WSMsgType.ERROR:
                                logger.error(f"❌ Binance WebSocket error: {ws.exception()}")
                                break

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Ошибка Binance WebSocket: {e}")
                if self._running:
                    await asyncio.sleep(5)  # Переподключение
        
        # OI задача отключена
        # if oi_task and not oi_task.done():
        #     oi_task.cancel()
    
    async def _oi_check_loop(self):
        """Отдельный цикл проверки Open Interest"""
        logger.info("📊 Запуск цикла проверки OI...")
        oi_check_count = 0
        
        # Начальная задержка для накопления данных (10 секунд)
        await asyncio.sleep(10)
        
        while self._running:
            try:
                oi_check_count += 1
                logger.info(f"📊 Проверка OI #{oi_check_count}...")
                await self._check_open_interest_for_all_pairs()
                logger.info(f"✅ Проверка OI #{oi_check_count} завершена")
            except Exception as e:
                logger.error(f"❌ Ошибка в цикле OI: {e}")
            
            # Проверка каждые 60 секунд
            await asyncio.sleep(60)

    async def _check_open_interest_for_all_pairs(self):
        """Проверка OI для топ-100 пар по объёму"""
        checked_count = 0
        alert_count = 0
        error_count = 0
        
        # Приоритетные пары для проверки OI (топ по ликвидности)
        priority_pairs = [
            'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
            'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'MATIC/USDT',
            'DOT/USDT', 'UNI/USDT', 'LTC/USDT', 'ATOM/USDT', 'ETC/USDT',
            'FIL/USDT', 'ARB/USDT', 'OP/USDT', 'APT/USDT', 'NEAR/USDT',
            'AAVE/USDT', 'MKR/USDT', 'VET/USDT', 'ALGO/USDT', 'XLM/USDT',
            'FTM/USDT', 'SAND/USDT', 'MANA/USDT', 'AXS/USDT', 'GRT/USDT',
            'ENJ/USDT', 'CHZ/USDT', 'COMP/USDT', 'YFI/USDT', 'SUSHI/USDT',
            'SNX/USDT', 'CRV/USDT', '1INCH/USDT', 'RUNE/USDT', 'KAVA/USDT',
            'INJ/USDT', 'RNDR/USDT', 'FET/USDT', 'AGIX/USDT', 'OCEAN/USDT',
            'THETA/USDT', 'HBAR/USDT', 'FLOW/USDT', 'EGLD/USDT', 'XTZ/USDT',
            'KSM/USDT', 'ZEC/USDT', 'DASH/USDT', 'NEO/USDT', 'EOS/USDT',
            'IOTA/USDT', 'MIOTA/USDT', 'LUNA2/USDT', 'LUNC/USDT', 'SHIB/USDT',
            'PEPE/USDT', 'BONK/USDT', 'FLOKI/USDT', 'MEME/USDT', 'BLZ/USDT',
            'AR/USDT', 'BLUR/USDT', 'IMX/USDT', 'GALA/USDT', 'ENS/USDT',
            'LDO/USDT', 'SSV/USDT', 'CFX/USDT', 'APE/USDT', 'MAGIC/USDT',
            'GMX/USDT', 'DYDX/USDT', 'KLAY/USDT', 'MINA/USDT', 'ASTR/USDT',
            'STX/USDT', 'INJ/USDT', 'SUI/USDT', 'SEI/USDT', 'WLD/USDT',
            'ARB/USDT', 'ID/USDT', 'HOOK/USDT', 'EDU/USDT', 'RDNT/USDT',
        ]
        
        # Фильтруем только те пары, которые есть в нашем списке
        pairs_to_check = [p for p in priority_pairs if p in self.pairs]
        
        # Если мало пар, берём первые 50 из общего списка
        if len(pairs_to_check) < 20:
            pairs_to_check = self.pairs[:50]
        
        logger.info(f"📊 Проверка OI для {len(pairs_to_check)} приоритетных пар")
        
        for pair in pairs_to_check:
            try:
                symbol = pair.replace('/', '')
                url = f"https://fapi.binance.com/fapi/v1/openInterest"
                params = {'symbol': symbol}
                
                async with self._session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Проверка на ошибку API
                        if 'code' in data and data['code'] != 200:
                            error_count += 1
                            continue
                            
                        oi = float(data.get('openInterest', 0))
                        
                        # Пропускаем пары с нулевым OI
                        if oi <= 0:
                            continue
                        
                        # Получение текущей цены
                        ticker_url = f"https://fapi.binance.com/fapi/v1/ticker/price"
                        ticker_params = {'symbol': symbol}
                        
                        async with self._session.get(ticker_url, params=ticker_params, timeout=aiohttp.ClientTimeout(total=5)) as ticker_response:
                            if ticker_response.status == 200:
                                ticker_data = await ticker_response.json()
                                price = float(ticker_data.get('price', 0))
                                
                                # Проверка OI
                                oi_result = self.oi_detector.check_oi_change(
                                    pair=pair,
                                    open_interest=oi,
                                    price=price,
                                    exchange='BINANCE',
                                )
                                
                                checked_count += 1
                                
                                if oi_result:
                                    alert_count += 1
                                    logger.warning(
                                        f"📊 OI ALERT: {pair} | {oi_result['type']} | "
                                        f"{oi_result['oi_change']:+.2f}% | "
                                        f"OI: {oi_result['start_oi']:,.0f} → {oi_result['current_oi']:,.0f}"
                                    )
                                    alert = Alert(
                                        alert_type=AlertType.OI_INCREASE if oi_result['type'] == 'OI_INCREASE' else AlertType.OI_DECREASE,
                                        exchange='BINANCE',
                                        pair=pair,
                                        price_change=oi_result['oi_change'],
                                        start_oi=oi_result['start_oi'],
                                        current_oi=oi_result['current_oi'],
                                        price=price,
                                        oi_price_change=oi_result.get('price_change', 0),
                                        timestamp=datetime.now(),
                                    )
                                    await self.on_alert(alert)
                            else:
                                error_count += 1
                    else:
                        error_count += 1
                    
                    # Rate limiting - 10 запросов в секунду
                    await asyncio.sleep(0.1)
                                    
            except asyncio.TimeoutError:
                error_count += 1
                continue
            except Exception as e:
                error_count += 1
                continue
        
        logger.info(f"📊 OI проверено: {checked_count} пар, {alert_count} алертов, {error_count} ошибок")

    async def _process_binance_trade(self, data: dict):
        """Обработка сделки от Binance"""
        try:
            symbol = data.get('s', '')
            price = float(data.get('p', 0))
            amount = float(data.get('q', 0))
            is_buyer_maker = data.get('m', False)  # True = SELL, False = BUY
            timestamp = data.get('T', 0)

            # Правильный парсинг пары (BTCUSDT -> BTC/USDT)
            if 'USDT' in symbol:
                base = symbol.replace('USDT', '')
                pair = f"{base}/USDT"
            else:
                pair = f"{symbol[:3]}/{symbol[3:]}"
            side = 'SELL' if is_buyer_maker else 'BUY'
            volume_usd = amount * price

            # Китовые сделки отключены
            # is_whale = self.whale_detector.check_whale(
            #     volume_usd=volume_usd,
            #     side=side,
            #     exchange='BINANCE',
            #     pair=pair,
            #     price=price,
            #     amount=amount,
            # )

            # Momentum отключён
            # is_momentum = self.momentum_detector.check_momentum(
            #     pair=pair,
            #     volume_usd=volume_usd,
            #     side=side,
            #     exchange='BINANCE',
            #     price=price,
            #     amount=amount,
            # )

            # Проверка Pump/Dump - ТОЛЬКО ЭТО РАБОТАЕТ
            pump_dump = self.pump_dump_detector.check_price_change(
                pair=pair,
                price=price,
                exchange='BINANCE',
            )

            # ML аномалии отключены
            # ml_anomaly = self.ml_detector.check_anomaly(
            #     pair=pair,
            #     price=price,
            #     volume=volume_usd,
            #     exchange='BINANCE',
            # )

            # PUMP/Dump алерты - ТОЛЬКО ЭТО РАБОТАЕТ
            # Китовые сделки отключены
            # if is_whale:
            #     alert = Alert(
            #         alert_type=AlertType.WHALE,
            #         exchange='BINANCE',
            #         pair=pair,
            #         side=side,
            #         volume_usd=volume_usd,
            #         amount=amount,
            #         price=price,
            #         timestamp=datetime.fromtimestamp(timestamp / 1000),
            #     )
            #     await self.on_alert(alert)
 
            # Momentum отключён
            # if is_momentum:
            #     alert = Alert(
            #         alert_type=AlertType.MOMENTUM,
            #         exchange='BINANCE',
            #         pair=pair,
            #         side=side,
            #         volume_usd=volume_usd,
            #         amount=amount,
            #         price=price,
            #         timestamp=datetime.fromtimestamp(timestamp / 1000),
            #     )
            #     await self.on_alert(alert)
 
            if pump_dump:
                # Определяем тип: LONG (небольшой памп) или SHORT (шорт-сквиз)
                # Для этого смотрим на порог в детекторе
                detector = self.pump_dump_detector
                
                # Если включен short и изменение соответствует его порогу - это SHORT
                if detector.short_config.enabled and pump_dump['price_change'] >= detector.short_config.min_percent:
                    side = 'SHORT'
                elif detector.long_config.enabled and pump_dump['price_change'] >= detector.long_config.min_percent:
                    side = 'LONG'
                else:
                    side = 'PUMP'
                
                alert = Alert(
                    alert_type=AlertType.PUMP,  # Всегда PUMP для LONG и SHORT сигналов
                    exchange='BINANCE',
                    pair=pair,
                    side=side,  # Добавляем информацию о LONG/SHORT
                    price_change=pump_dump['price_change'],
                    start_price=pump_dump['start_price'],
                    price=pump_dump['current_price'],
                    signal_count=pump_dump['signal_count'],
                    timestamp=datetime.fromtimestamp(timestamp / 1000),
                )
                await self.on_alert(alert)
            
            # Проверка накопления/консолидации
            if self.accumulation_detector:
                accumulation_result = self.accumulation_detector.check_accumulation(
                    pair=pair,
                    price=price,
                    exchange='BINANCE'
                )
                if accumulation_result:
                    alert = Alert(
                        alert_type=AlertType.ACCUMULATION,
                        exchange='BINANCE',
                        pair=pair,
                        side=accumulation_result.get('side', 'BREAKOUT'),
                        price_change=accumulation_result.get('price_change', 0),
                        start_price=accumulation_result.get('start_price', 0),
                        price=accumulation_result.get('price', 0),
                        current_oi=accumulation_result.get('current_oi', 0),
                        signal_count=accumulation_result.get('signal_count', 1),
                        oi_price_change=accumulation_result.get('oi_price_change', 0),
                        timestamp=accumulation_result.get('timestamp', datetime.now()),
                    )
                    await self.on_alert(alert)

        except Exception as e:
            import traceback
            logger.error(f"⚠️ Ошибка обработки Binance trade: {e}")
            logger.error(traceback.format_exc())

    async def _monitor_bybit(self):
        """Мониторинг Bybit через REST polling"""
        logger.info("📊 Запуск Bybit REST мониторинга...")
        
        last_trade_ids = {}
        
        while self._running:
            try:
                for pair in self.pairs:
                    if not self._running:
                        break
                    
                    symbol = pair.replace('/', '')
                    
                    try:
                        # Получение последних сделок
                        url = f"https://api.bybit.com/v5/market/recent-trade"
                        params = {
                            'category': 'linear',
                            'symbol': symbol,
                            'limit': 50
                        }
                        
                        async with self._session.get(url, params=params) as response:
                            if response.status == 200:
                                result = await response.json()
                                trades = result.get('result', {}).get('list', [])
                                
                                for trade in trades:
                                    trade_id = trade.get('T')
                                    
                                    # Пропускаем уже обработанные
                                    if trade_id in last_trade_ids:
                                        continue
                                    last_trade_ids[trade_id] = True
                                    
                                    # Ограничиваем размер кэша
                                    if len(last_trade_ids) > 1000:
                                        last_trade_ids.clear()
                                    
                                    price = float(trade.get('p', 0))
                                    amount = float(trade.get('v', 0))
                                    side = trade.get('S', 'Buy')
                                    timestamp = int(trade.get('T', 0))
                                    volume_usd = amount * price
                                    
                                    # Китовые сделки отключены
                                    # is_whale = self.whale_detector.check_whale(
                                    #     volume_usd=volume_usd,
                                    #     side=side.upper(),
                                    #     exchange='BYBIT',
                                    #     pair=pair,
                                    #     price=price,
                                    #     amount=amount,
                                    # )
                                    
                                    # Momentum отключён
                                    # is_momentum = self.momentum_detector.check_momentum(
                                    #     pair=pair,
                                    #     volume_usd=volume_usd,
                                    #     side=side.upper(),
                                    #     exchange='BYBIT',
                                    #     price=price,
                                    #     amount=amount,
                                    # )
                                    
                                     # Только PUMP
                                     # if is_momentum:
                                     #     alert = Alert(
                                     #         alert_type=AlertType.MOMENTUM,
                                     #         exchange='BYBIT',
                                     #         pair=pair,
                                     #         side=side.upper(),
                                     #         volume_usd=volume_usd,
                                     #         amount=amount,
                                     #         price=price,
                                     #         timestamp=datetime.fromtimestamp(timestamp / 1000),
                                     #     )
                                     #     await self.on_alert(alert)
                                     # 
                                     # Проверка накопления/консолидации для Bybit
                                    if self.accumulation_detector:
                                        accumulation_result = self.accumulation_detector.check_accumulation(
                                            pair=pair,
                                            price=price,
                                            exchange='BYBIT'
                                        )
                                        if accumulation_result:
                                            alert = Alert(
                                                alert_type=AlertType.ACCUMULATION,
                                                exchange='BYBIT',
                                                pair=pair,
                                                side=accumulation_result.get('side', 'BREAKOUT'),
                                                price_change=accumulation_result.get('price_change', 0),
                                                start_price=accumulation_result.get('start_price', 0),
                                                price=accumulation_result.get('price', 0),
                                                current_oi=accumulation_result.get('current_oi', 0),
                                                signal_count=accumulation_result.get('signal_count', 1),
                                                oi_price_change=accumulation_result.get('oi_price_change', 0),
                                                timestamp=accumulation_result.get('timestamp', datetime.now()),
                                            )
                                            await self.on_alert(alert)

                    except Exception as e:
                        logger.debug(f"⚠️ Ошибка получения Bybit trades для {pair}: {type(e).__name__}: {e}")
                    
                    # Rate limiting
                    await asyncio.sleep(0.2)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Ошибка Bybit мониторинга: {e}")
                if self._running:
                    await asyncio.sleep(5)

    async def stop(self):
        """Остановка мониторинга"""
        self._running = False

        for task in self._tasks:
            if not task.done():
                task.cancel()

        # Закрытие HTTP сессии
        if self._session:
            await self._session.close()

        logger.info("🛑 CEX мониторинг остановлен")
