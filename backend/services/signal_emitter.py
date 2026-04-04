"""
Сервис для интеграции детектора китов с API
"""

import asyncio
import aiohttp
from typing import Optional, Callable
from loguru import logger
from datetime import datetime

from backend.api.schemas import SignalType, SignalSide, Exchange


class SignalEmitter:
    """
    Сервис для отправки сигналов в API
    
    Используется в детекторах для отправки обнаруженных китовых сделок
    """

    def __init__(self, api_url: str = "http://localhost:8000"):
        self.api_url = api_url
        self._session: Optional[aiohttp.ClientSession] = None
        self._ws_connection: Optional[aiohttp.ClientWebSocketResponse] = None
        self._connected = False

    async def _get_session(self) -> aiohttp.ClientSession:
        """Получение HTTP сессии"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            )
        return self._session

    async def connect_websocket(self) -> bool:
        """
        Подключение к WebSocket для получения сигналов
        
        Returns:
            bool: True если подключение успешно
        """
        try:
            session = await self._get_session()
            ws_url = f"{self.api_url}/api/signals/ws"
            self._ws_connection = await session.ws_connect(ws_url)
            self._connected = True
            logger.info("✅ WebSocket подключен")
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка подключения WebSocket: {e}")
            self._connected = False
            return False

    async def disconnect_websocket(self):
        """Отключение от WebSocket"""
        if self._ws_connection and not self._ws_connection.closed:
            await self._ws_connection.close()
        self._connected = False
        logger.info("🔌 WebSocket отключен")

    async def send_signal(
        self,
        signal_type: SignalType,
        exchange: str,
        pair: str,
        side: str,
        volume_usd: float,
        amount: float,
        price: float,
        tx_hash: Optional[str] = None,
    ) -> bool:
        """
        Отправка сигнала в API
        
        Args:
            signal_type: Тип сигнала (WHALE, MOMENTUM, PRICE_SPIKE)
            exchange: Биржа
            pair: Торговая пара
            side: Сторона сделки (BUY/SELL)
            volume_usd: Объём в долларах
            amount: Количество токенов
            price: Цена сделки
            tx_hash: Хэш транзакции (для DEX)
            
        Returns:
            bool: True если сигнал успешно отправлен
        """
        session = await self._get_session()
        url = f"{self.api_url}/api/signals"

        payload = {
            "signal_type": signal_type.value,
            "exchange": exchange.upper(),
            "pair": pair,
            "side": side.upper(),
            "volume_usd": volume_usd,
            "amount": amount,
            "price": price,
            "tx_hash": tx_hash,
        }

        try:
            async with session.post(url, json=payload) as response:
                if response.status == 201:
                    logger.info(
                        f"📤 Сигнал отправлен: {pair} {side} ${volume_usd:,.2f}"
                    )
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Ошибка отправки сигнала: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Ошибка отправки сигнала: {e}")
            return False

    async def receive_signals(self, callback: Callable) -> None:
        """
        Получение сигналов из WebSocket
        
        Args:
            callback: Функция обратного вызова для обработки сигналов
        """
        if not self._connected or not self._ws_connection:
            logger.warning("⚠️ WebSocket не подключен")
            return

        try:
            async for msg in self._ws_connection:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = msg.json()
                    if data.get("event") == "new_signal":
                        await callback(data.get("data"))
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    logger.error(f"❌ WebSocket error: {self._ws_connection.exception()}")
                    break
        except Exception as e:
            logger.error(f"❌ Ошибка получения сигналов: {e}")

    async def send_heartbeat(self):
        """Отправка heartbeat для поддержания соединения"""
        if self._connected and self._ws_connection:
            try:
                await self._ws_connection.send_str("ping")
            except Exception:
                self._connected = False

    async def close(self):
        """Закрытие всех соединений"""
        await self.disconnect_websocket()
        if self._session and not self._session.closed:
            await self._session.close()


# Глобальный экземпляр для использования в детекторах
_signal_emitter: Optional[SignalEmitter] = None


def get_signal_emitter(api_url: str = "http://localhost:8000") -> SignalEmitter:
    """Получение глобального экземпляра SignalEmitter"""
    global _signal_emitter
    if _signal_emitter is None:
        _signal_emitter = SignalEmitter(api_url)
    return _signal_emitter


async def emit_whale_signal(
    exchange: str,
    pair: str,
    side: str,
    volume_usd: float,
    amount: float,
    price: float,
) -> bool:
    """
    Быстрая отправка сигнала о китовой сделке
    
    Args:
        exchange: Биржа (BINANCE, BYBIT, etc.)
        pair: Торговая пара (BTC/USDT)
        side: Сторона (BUY/SELL)
        volume_usd: Объём в долларах
        amount: Количество токенов
        price: Цена сделки
        
    Returns:
        bool: True если успешно
    """
    emitter = get_signal_emitter()
    return await emitter.send_signal(
        signal_type=SignalType.WHALE,
        exchange=exchange,
        pair=pair,
        side=side,
        volume_usd=volume_usd,
        amount=amount,
        price=price,
    )


async def emit_momentum_signal(
    exchange: str,
    pair: str,
    side: str,
    volume_usd: float,
    amount: float,
    price: float,
    growth_percent: float,
) -> bool:
    """
    Быстрая отправка сигнала об импульсе
    
    Args:
        exchange: Биржа
        pair: Торговая пара
        side: Сторона
        volume_usd: Объём
        amount: Количество
        price: Цена
        growth_percent: Процент роста
        
    Returns:
        bool: True если успешно
    """
    emitter = get_signal_emitter()
    return await emitter.send_signal(
        signal_type=SignalType.MOMENTUM,
        exchange=exchange,
        pair=pair,
        side=side,
        volume_usd=volume_usd,
        amount=amount,
        price=price,
        metadata_json={"growth_percent": growth_percent},
    )
