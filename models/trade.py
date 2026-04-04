"""
Модель сделки
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Trade:
    """
    Модель торговой сделки
    
    Attributes:
        exchange: Название биржи
        pair: Торговая пара
        side: BUY или SELL
        price: Цена сделки
        amount: Количество токенов
        volume_usd: Объём в долларах
        timestamp: Время сделки
        buyer: Адрес покупателя (для DEX)
        seller: Адрес продавца (для DEX)
    """
    exchange: str
    pair: str
    side: str
    price: float
    amount: float
    volume_usd: float
    timestamp: datetime
    buyer: Optional[str] = None
    seller: Optional[str] = None
    tx_hash: Optional[str] = None  # Хэш транзакции для DEX
    
    def to_dict(self) -> dict:
        """Конвертация в словарь"""
        return {
            'exchange': self.exchange,
            'pair': self.pair,
            'side': self.side,
            'price': self.price,
            'amount': self.amount,
            'volume_usd': self.volume_usd,
            'timestamp': self.timestamp,
            'buyer': self.buyer,
            'seller': self.seller,
            'tx_hash': self.tx_hash
        }