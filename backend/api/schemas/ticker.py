"""
Pydantic схемы для тикеров
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TickerResponse(BaseModel):
    """Схема ответа с тикером"""
    symbol: str
    last_price: str
    price_change_percent: float
    high_price: Optional[str] = None
    low_price: Optional[str] = None
    quote_volume: float
    open_interest: Optional[float] = None
    funding_rate: Optional[float] = None
    updated_at: Optional[datetime] = None


class TickerListResponse(BaseModel):
    """Список тикеров"""
    data: List[TickerResponse]
    count: int
    last_updated: datetime


class TickerUpdate(BaseModel):
    """Обновление тикера"""
    last_price: Optional[str] = None
    price_change_percent: Optional[float] = None
    high_price: Optional[str] = None
    low_price: Optional[str] = None
    quote_volume: Optional[float] = None
    open_interest: Optional[float] = None
    funding_rate: Optional[float] = None
