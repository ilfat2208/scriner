"""
Pydantic схемы для API
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class SignalType(str, Enum):
    """Тип сигнала"""
    WHALE = "WHALE"
    MOMENTUM = "MOMENTUM"
    PRICE_SPIKE = "PRICE_SPIKE"


class SignalSide(str, Enum):
    """Сторона сделки"""
    BUY = "BUY"
    SELL = "SELL"


class Exchange(str, Enum):
    """Биржи"""
    BINANCE = "BINANCE"
    BYBIT = "BYBIT"
    OKX = "OKX"
    UNISWAP = "UNISWAP"
    PANCAKESWAP = "PANCAKESWAP"


# === Request Schemas ===

class SignalCreate(BaseModel):
    """Схема для создания сигнала"""
    signal_type: SignalType = Field(..., description="Тип сигнала")
    exchange: Exchange = Field(..., description="Биржа")
    pair: str = Field(..., description="Торговая пара", min_length=3)
    side: SignalSide = Field(..., description="Сторона сделки")
    volume_usd: float = Field(..., description="Объём в USD", gt=0)
    amount: float = Field(..., description="Количество токенов", gt=0)
    price: float = Field(..., description="Цена сделки", gt=0)
    tx_hash: Optional[str] = Field(None, description="Хэш транзакции (для DEX)")
    metadata_json: Optional[dict] = Field(None, description="Дополнительные данные")


class SignalFilter(BaseModel):
    """Схема для фильтрации сигналов"""
    signal_type: Optional[SignalType] = None
    exchange: Optional[Exchange] = None
    side: Optional[SignalSide] = None
    min_volume_usd: Optional[float] = None
    pair_search: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SignalUpdate(BaseModel):
    """Схема для обновления сигнала"""
    is_read: Optional[bool] = None


# === Response Schemas ===

class SignalResponse(BaseModel):
    """Схема ответа с сигналом"""
    id: int
    signal_type: SignalType
    exchange: Exchange
    pair: str
    side: SignalSide
    volume_usd: float
    amount: float
    price: float
    timestamp: datetime
    tx_hash: Optional[str] = None
    is_read: bool
    metadata_json: Optional[dict] = None

    class Config:
        from_attributes = True


class SignalListResponse(BaseModel):
    """Схема ответа со списком сигналов"""
    data: List[SignalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SignalStatsResponse(BaseModel):
    """Статистика по сигналам"""
    total_signals: int
    active_tokens: int
    profit_24h: float
    whale_count: int
    momentum_count: int
    total_volume_24h: float
    avg_signal_size: float


class WhaleThresholdResponse(BaseModel):
    """Порог детекции китов"""
    pair: str
    min_volume_usd: float
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class WhaleThresholdUpdate(BaseModel):
    """Обновление порога"""
    min_volume_usd: float = Field(..., gt=0)
    is_active: Optional[bool] = None


# === WebSocket Schemas ===

class WebSocketSignalMessage(BaseModel):
    """Сообщение WebSocket о новом сигнале"""
    event: str = "new_signal"
    data: SignalResponse


class WebSocketErrorMessage(BaseModel):
    """Сообщение об ошибке WebSocket"""
    event: str = "error"
    message: str
    code: str
