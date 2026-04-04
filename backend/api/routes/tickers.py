"""
API маршруты для работы с тикерами
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime

from backend.db.database import get_db
from backend.db.models import TickerModel
from backend.api.schemas import (
    TickerResponse,
    TickerListResponse,
    TickerUpdate,
)
from backend.services.binance_service import BinanceService

router = APIRouter(prefix="/tickers", tags=["Tickers"])


# Кэш для тикеров
_tickers_cache: List[TickerResponse] = []
_cache_timestamp: Optional[datetime] = None
CACHE_DURATION_SECONDS = 10


@router.get("", response_model=TickerListResponse)
async def get_tickers(
    limit: int = Query(100, ge=1, le=1000, description="Макс. количество тикеров"),
    min_volume: Optional[float] = Query(None, ge=0, description="Мин. объём"),
    search: Optional[str] = Query(None, description="Поиск по символу"),
    is_futures: bool = Query(True, description="Фьючерсы или спот"),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение списка тикеров
    
    Данные кэшируются на 10 секунд
    """
    global _tickers_cache, _cache_timestamp

    now = datetime.utcnow()
    
    # Проверка кэша
    if (
        _cache_timestamp and 
        (now - _cache_timestamp).total_seconds() < CACHE_DURATION_SECONDS and
        not search and not min_volume
    ):
        # Возврат из кэша
        filtered = _tickers_cache[:limit]
        return TickerListResponse(
            data=filtered,
            count=len(filtered),
            last_updated=_cache_timestamp,
        )

    # Получение из Binance API
    binance = BinanceService(is_futures=is_futures)
    try:
        tickers_data = await binance.get_tickers()
    finally:
        await binance.close()

    # Преобразование в response
    tickers = []
    for t in tickers_data:
        if search and search.upper() not in t.get("symbol", ""):
            continue
        if min_volume and float(t.get("quoteVolume", 0)) < min_volume:
            continue

        ticker = TickerResponse(
            symbol=t.get("symbol", ""),
            last_price=t.get("lastPrice", "0"),
            price_change_percent=float(t.get("priceChangePercent", 0)),
            high_price=t.get("highPrice"),
            low_price=t.get("lowPrice"),
            quote_volume=float(t.get("quoteVolume", 0)),
            open_interest=float(t.get("openInterest", 0)) if is_futures else None,
            funding_rate=None,  # Можно добавить отдельно
        )
        tickers.append(ticker)

    # Обновление кэша
    _tickers_cache = tickers
    _cache_timestamp = now

    return TickerListResponse(
        data=tickers[:limit],
        count=len(tickers[:limit]),
        last_updated=now,
    )


@router.get("/{symbol}", response_model=TickerResponse)
async def get_ticker(
    symbol: str,
    is_futures: bool = Query(True, description="Фьючерсы или спот"),
):
    """
    Получение тикера по символу
    """
    binance = BinanceService(is_futures=is_futures)
    try:
        ticker_data = await binance.get_ticker(symbol.upper())
    finally:
        await binance.close()

    if not ticker_data:
        raise HTTPException(status_code=404, detail="Ticker not found")

    return TickerResponse(
        symbol=ticker_data.get("symbol", ""),
        last_price=ticker_data.get("lastPrice", "0"),
        price_change_percent=float(ticker_data.get("priceChangePercent", 0)),
        high_price=ticker_data.get("highPrice"),
        low_price=ticker_data.get("lowPrice"),
        quote_volume=float(ticker_data.get("quoteVolume", 0)),
        open_interest=float(ticker_data.get("openInterest", 0)) if is_futures else None,
    )


@router.get("/{symbol}/klines")
async def get_klines(
    symbol: str,
    interval: str = Query("1h", description="Таймфрейм"),
    limit: int = Query(200, ge=1, le=1500, description="Количество свечей"),
    is_futures: bool = Query(True, description="Фьючерсы или спот"),
):
    """
    Получение свечей (K-lines)
    """
    binance = BinanceService(is_futures=is_futures)
    try:
        klines = await binance.get_klines(symbol.upper(), interval, limit)
    finally:
        await binance.close()

    if not klines:
        return {"data": [], "count": 0}

    # Форматирование
    formatted = [
        {
            "timestamp": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        }
        for k in klines
    ]

    return {"data": formatted, "count": len(formatted)}


@router.get("/{symbol}/orderbook")
async def get_orderbook(
    symbol: str,
    limit: int = Query(100, ge=5, le=1000, description="Глубина стакана"),
    is_futures: bool = Query(True, description="Фьючерсы или спот"),
):
    """
    Получение стакана заказов
    """
    binance = BinanceService(is_futures=is_futures)
    try:
        orderbook = await binance.get_orderbook(symbol.upper(), limit)
    finally:
        await binance.close()

    if not orderbook or ("bids" not in orderbook and "asks" not in orderbook):
        raise HTTPException(status_code=404, detail="Orderbook not found")

    # Форматирование
    return {
        "symbol": symbol.upper(),
        "bids": [
            {"price": float(b[0]), "amount": float(b[1])}
            for b in orderbook.get("bids", [])[:limit]
        ],
        "asks": [
            {"price": float(a[0]), "amount": float(a[1])}
            for a in orderbook.get("asks", [])[:limit]
        ],
    }


@router.get("/{symbol}/funding")
async def get_funding_rate(
    symbol: str,
    limit: int = Query(10, ge=1, le=100, description="Количество записей"),
):
    """
    Получение funding rate (только фьючерсы)
    """
    binance = BinanceService(is_futures=True)
    try:
        funding_data = await binance.get_funding_rate(symbol.upper(), limit)
    finally:
        await binance.close()

    if not funding_data:
        return {"data": [], "count": 0}

    formatted = [
        {
            "symbol": f.get("symbol"),
            "funding_rate": float(f.get("fundingRate", 0)),
            "funding_time": f.get("fundingTime"),
        }
        for f in funding_data
    ]

    return {"data": formatted, "count": len(formatted)}


@router.get("/{symbol}/open-interest")
async def get_open_interest(
    symbol: str,
):
    """
    Получение открытого интереса (только фьючерсы)
    """
    binance = BinanceService(is_futures=True)
    try:
        oi = await binance.get_open_interest(symbol.upper())
    finally:
        await binance.close()

    if oi is None:
        raise HTTPException(status_code=404, detail="Open interest not found")

    return {"symbol": symbol.upper(), "open_interest": oi}
