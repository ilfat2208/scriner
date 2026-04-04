"""
Детектор китовых сделок
"""

import asyncio
from typing import List, Optional, Callable, Awaitable
from loguru import logger


class WhaleDetector:
    """
    Обнаружение китовых сделок

    Критерии:
    - Объём сделки > порога
    - Исключение wash trading
    - Фильтрация по адресам
    
    Интеграция:
    - Вызов callback при обнаружении кита
    - Отправка в API через signal_emitter
    """

    def __init__(
        self,
        min_volume_usd: float = 50000,
        whitelist: Optional[List[str]] = None,
        blacklist: Optional[List[str]] = None,
        on_whale_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        self.min_volume_usd = min_volume_usd
        self.whitelist = set(whitelist or [])
        self.blacklist = set(blacklist or [])
        self.on_whale_detected = on_whale_detected

        # Статистика
        self._whale_count = 0
        self._total_volume = 0

    def check_whale(
        self, 
        volume_usd: float, 
        side: str, 
        exchange: str = "BINANCE",
        pair: str = "BTC/USDT",
        price: float = 0,
        amount: float = 0,
        **kwargs
    ) -> bool:
        """
        Проверка сделки на китовую

        Args:
            volume_usd: Объём в долларах
            side: BUY или SELL
            exchange: Биржа
            pair: Торговая пара
            price: Цена сделки
            amount: Количество токенов
            **kwargs: Дополнительные данные (адреса и т.д.)

        Returns:
            bool: True если сделка китовая
        """
        # Проверка по объёму (двойная для надёжности)
        if volume_usd < self.min_volume_usd:
            return False

        # Проверка blacklist
        address = kwargs.get('address')
        if address and address in self.blacklist:
            logger.debug(f"⛔ Адрес в blacklist: {address}")
            return False

        # Проверка whitelist (если задан)
        if self.whitelist and address and address not in self.whitelist:
            return False

        # Проверка на wash trading (упрощённая)
        if self._is_wash_trading(kwargs):
            logger.debug("⚠️ Подозрение на wash trading")
            return False

        self._whale_count += 1
        self._total_volume += volume_usd

        logger.info(f"🐋 КИТ обнаружен: ${volume_usd:,.2f} ({side}) - {pair}")

        # Вызов callback если задан
        if self.on_whale_detected:
            asyncio.create_task(self.on_whale_detected({
                "signal_type": "WHALE",
                "exchange": exchange,
                "pair": pair,
                "side": side,
                "volume_usd": volume_usd,
                "amount": amount,
                "price": price,
                "address": address,
            }))

        return True
    
    def _is_wash_trading(self, trade_data: dict) -> bool:
        """
        Проверка на wash trading
        
        Wash trading - сделка между собственными кошельками биржи
        """
        buyer = trade_data.get('buyer')
        seller = trade_data.get('seller')
        
        # Если покупатель и продавец одинаковы
        if buyer and seller and buyer == seller:
            return True
        
        # Проверка по известным адресам бирж
        known_wash_addresses = {
            'binance_hot_wallet',
            'bybit_internal',
        }
        
        if buyer in known_wash_addresses and seller in known_wash_addresses:
            return True
        
        return False
    
    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            'whale_count': self._whale_count,
            'total_volume_usd': self._total_volume,
            'avg_whale_size': self._total_volume / max(self._whale_count, 1),
            'threshold': self.min_volume_usd
        }