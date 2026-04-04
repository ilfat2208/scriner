"""
Сервис для работы с Binance API
"""

import aiohttp
from typing import List, Dict, Optional
from loguru import logger
from datetime import datetime


class BinanceService:
    """
    Асинхронный клиент для Binance API
    
    Поддерживает:
    - Futures API (fapi.binance.com)
    - Spot API (api.binance.com)
    """

    FUTURES_BASE_URL = "https://fapi.binance.com"
    SPOT_BASE_URL = "https://api.binance.com"

    def __init__(self, is_futures: bool = True):
        self.base_url = self.FUTURES_BASE_URL if is_futures else self.SPOT_BASE_URL
        self.is_futures = is_futures
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Получение HTTP сессии"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=aiohttp.ClientTimeout(total=10),
            )
        return self._session

    async def close(self):
        """Закрытие сессии"""
        if self._session and not self._session.closed:
            await self._session.close()

    async def get_tickers(self) -> List[Dict]:
        """
        Получение всех тикеров за 24 часа
        
        Returns:
            Список тикеров USDT пар
        """
        session = await self._get_session()
        endpoint = "/fapi/v1/ticker/24hr" if self.is_futures else "/api/v3/ticker/24hr"
        url = f"{self.base_url}{endpoint}"

        try:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    # Фильтрация только USDT пар
                    tickers = [
                        t for t in data 
                        if t.get("symbol", "").endswith("USDT")
                    ]
                    # Сортировка по объёму
                    tickers.sort(
                        key=lambda x: float(x.get("quoteVolume", 0)), 
                        reverse=True
                    )
                    return tickers
                else:
                    logger.error(f"Binance API error: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch tickers: {e}")
            return []

    async def get_ticker(self, symbol: str) -> Optional[Dict]:
        """
        Получение тикера для конкретной пары
        
        Args:
            symbol: Торговая пара (например, BTCUSDT)
            
        Returns:
            Данные тикера или None
        """
        tickers = await self.get_tickers()
        for ticker in tickers:
            if ticker.get("symbol") == symbol:
                return ticker
        return None

    async def get_klines(
        self, 
        symbol: str, 
        interval: str = "1h", 
        limit: int = 200
    ) -> List[List]:
        """
        Получение свечей (K-lines)
        
        Args:
            symbol: Торговая пара
            interval: Таймфрейм (1m, 5m, 1h, 1d, etc.)
            limit: Количество свечей (макс. 1500)
            
        Returns:
            Список свечей [time, open, high, low, close, volume, ...]
        """
        session = await self._get_session()
        endpoint = "/fapi/v1/klines" if self.is_futures else "/api/v3/klines"
        url = f"{self.base_url}{endpoint}"

        params = {
            "symbol": symbol,
            "interval": interval,
            "limit": min(limit, 1500),
        }

        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Binance klines error: {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch klines: {e}")
            return []

    async def get_orderbook(self, symbol: str, limit: int = 100) -> Dict:
        """
        Получение стакана заказов
        
        Args:
            symbol: Торговая пара
            limit: Глубина стакана (5, 10, 20, 50, 100, 500, 1000)
            
        Returns:
            {"bids": [[price, qty, ...]], "asks": [[price, qty, ...]]}
        """
        session = await self._get_session()
        endpoint = "/fapi/v1/depth" if self.is_futures else "/api/v3/depth"
        url = f"{self.base_url}{endpoint}"

        params = {
            "symbol": symbol,
            "limit": limit,
        }

        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"bids": [], "asks": []}
        except Exception as e:
            logger.error(f"Failed to fetch orderbook: {e}")
            return {"bids": [], "asks": []}

    async def get_open_interest(self, symbol: str) -> Optional[float]:
        """
        Получение открытого интереса
        
        Args:
            symbol: Торговая пара
            
        Returns:
            Значение открытого интереса или None
        """
        if not self.is_futures:
            return None

        session = await self._get_session()
        url = f"{self.FUTURES_BASE_URL}/fapi/v1/openInterest"

        params = {"symbol": symbol}

        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return float(data.get("openInterest", 0))
                return None
        except Exception as e:
            logger.error(f"Failed to fetch OI: {e}")
            return None

    async def get_funding_rate(self, symbol: str, limit: int = 1) -> List[Dict]:
        """
        Получение funding rate
        
        Args:
            symbol: Торговая пара
            limit: Количество записей
            
        Returns:
            Список записей funding rate
        """
        if not self.is_futures:
            return []

        session = await self._get_session()
        url = f"{self.FUTURES_BASE_URL}/fapi/v1/fundingRate"

        params = {
            "symbol": symbol,
            "limit": limit,
        }

        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                return []
        except Exception as e:
            logger.error(f"Failed to fetch funding rate: {e}")
            return []

    async def get_mark_price(self, symbol: str) -> Optional[Dict]:
        """
        Получение марк-цены
        
        Args:
            symbol: Торговая пара
            
        Returns:
            Данные марк-цены
        """
        if not self.is_futures:
            return None

        session = await self._get_session()
        url = f"{self.FUTURES_BASE_URL}/fapi/v1/premiumIndex"

        params = {"symbol": symbol}

        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                return None
        except Exception as e:
            logger.error(f"Failed to fetch mark price: {e}")
            return None
