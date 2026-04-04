"""
Модели базы данных
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from datetime import datetime

from .database import Base


class SignalModel(Base):
    """
    Модель сигнала о китовой сделке
    
    Таблица: signals
    """
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    
    # Тип сигнала
    signal_type = Column(String(20), nullable=False, index=True)  # WHALE, MOMENTUM, PRICE_SPIKE
    
    # Биржа и пара
    exchange = Column(String(50), nullable=False, index=True)
    pair = Column(String(20), nullable=False, index=True)
    
    # Параметры сделки
    side = Column(String(10), nullable=False)  # BUY или SELL
    volume_usd = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    
    # Метаданные
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    tx_hash = Column(String(100), nullable=True)  # Для DEX
    is_read = Column(Boolean, default=False)
    
    # Дополнительная информация (JSON как текст)
    metadata_json = Column(Text, nullable=True)

    def __repr__(self):
        return f"<Signal(id={self.id}, type={self.signal_type}, pair={self.pair}, volume=${self.volume_usd:,.2f})>"


class TickerModel(Base):
    """
    Модель тикера для кэширования
    
    Таблица: tickers
    """
    __tablename__ = "tickers"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, nullable=False, index=True)
    
    # Данные тикера
    last_price = Column(String(50), nullable=False)
    price_change_percent = Column(Float, default=0.0)
    high_price = Column(String(50), nullable=True)
    low_price = Column(String(50), nullable=True)
    quote_volume = Column(Float, default=0.0)
    open_interest = Column(Float, nullable=True)
    funding_rate = Column(Float, nullable=True)
    
    # Время обновления
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=func.now())

    def __repr__(self):
        return f"<Ticker(symbol={self.symbol}, price={self.last_price})>"


class WhaleThresholdModel(Base):
    """
    Модель порогов для детекции китов
    
    Таблица: whale_thresholds
    """
    __tablename__ = "whale_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    pair = Column(String(20), unique=True, nullable=False, index=True)
    min_volume_usd = Column(Float, default=50000.0)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=func.now())

    def __repr__(self):
        return f"<WhaleThreshold(pair={self.pair}, threshold=${self.min_volume_usd:,.2f})>"
