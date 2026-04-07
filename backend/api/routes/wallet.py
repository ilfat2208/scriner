"""
Wallet API маршруты
Работа с Binance API для получения балансов и создания ордеров
"""

import os
import time
import hmac
import hashlib
import aiohttp
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# Binance API Configuration
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
BINANCE_BASE_URL = "https://api.binance.com"
BINANCE_FUTURES_URL = "https://fapi.binance.com"

# User API Keys (в production использовать БД)
user_api_keys: Dict[str, Dict[str, str]] = {}


class ApiKeyInput(BaseModel):
    api_key: str
    api_secret: str
    exchange: str = "BINANCE"
    market_type: str = "FUTURES"


class OrderInput(BaseModel):
    symbol: str
    side: str  # BUY or SELL
    order_type: str = "MARKET"  # MARKET or LIMIT
    quantity: float
    price: Optional[float] = None


class BalanceItem(BaseModel):
    asset: str
    free: float = 0
    locked: float = 0
    total: float = 0
    usd_value: float = 0


class WalletBalanceResponse(BaseModel):
    balances: List[BalanceItem]
    total_usd: float = 0
    exchange: str
    market_type: str


class OrderResponse(BaseModel):
    success: bool
    order_id: Optional[int] = None
    symbol: str
    side: str
    quantity: float
    price: Optional[float] = None
    status: str
    message: str


def generate_signature(query_string: str, secret: str) -> str:
    """Генерация HMAC SHA256 подписи для Binance API"""
    return hmac.new(
        secret.encode('utf-8'),
        query_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


async def binance_request(endpoint: str, params: Dict = None, api_key: str = None, api_secret: str = None, is_futures: bool = True):
    """Запрос к Binance API"""
    base_url = BINANCE_FUTURES_URL if is_futures else BINANCE_BASE_URL
    params = params or {}
    params['timestamp'] = int(time.time() * 1000)
    
    query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
    signature = generate_signature(query_string, api_secret)
    
    url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
    headers = {'X-MBX-APIKEY': api_key}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                raise HTTPException(status_code=response.status, detail=error_text)
            return await response.json()


async def binance_post_request(endpoint: str, params: Dict = None, api_key: str = None, api_secret: str = None, is_futures: bool = True):
    """POST запрос к Binance API"""
    base_url = BINANCE_FUTURES_URL if is_futures else BINANCE_BASE_URL
    params = params or {}
    params['timestamp'] = int(time.time() * 1000)
    
    query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
    signature = generate_signature(query_string, api_secret)
    
    url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
    headers = {'X-MBX-APIKEY': api_key}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers) as response:
            if response.status != 200:
                error_text = await response.text()
                raise HTTPException(status_code=response.status, detail=error_text)
            return await response.json()


@router.post("/api-keys", summary="Сохранить API ключи пользователя")
async def save_api_keys(
    input: ApiKeyInput,
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID")
):
    """Сохранение API ключей пользователя (в памяти)"""
    if not telegram_user_id:
        raise HTTPException(status_code=400, detail="Telegram User ID required")
    
    user_api_keys[telegram_user_id] = {
        'api_key': input.api_key,
        'api_secret': input.api_secret,
        'exchange': input.exchange,
        'market_type': input.market_type
    }
    
    return {"success": True, "message": "API keys saved successfully"}


@router.get("/balances", response_model=WalletBalanceResponse, summary="Получить балансы")
async def get_balances(
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID")
):
    """Получение балансов с Binance"""
    if not telegram_user_id:
        raise HTTPException(status_code=400, detail="Telegram User ID required")
    
    # Получаем API ключи пользователя
    keys = user_api_keys.get(telegram_user_id)
    if not keys:
        # Если нет ключей, используем глобальные (если есть)
        if not BINANCE_API_KEY or not BINANCE_API_SECRET:
            raise HTTPException(status_code=400, detail="API keys not configured")
        keys = {
            'api_key': BINANCE_API_KEY,
            'api_secret': BINANCE_API_SECRET,
            'market_type': 'FUTURES'
        }
    
    is_futures = keys.get('market_type', 'FUTURES') == 'FUTURES'
    endpoint = '/fapi/v2/account' if is_futures else '/api/v3/account'
    
    try:
        account_data = await binance_request(
            endpoint,
            api_key=keys['api_key'],
            api_secret=keys['api_secret'],
            is_futures=is_futures
        )
        
        # Получаем цены для конвертации в USD
        prices_endpoint = '/fapi/v1/ticker/price' if is_futures else '/api/v3/ticker/price'
        prices_data = await binance_request(
            prices_endpoint,
            api_key=keys['api_key'],
            api_secret=keys['api_secret'],
            is_futures=is_futures
        )
        
        prices = {item['symbol']: float(item['price']) for item in prices_data}
        
        # Формируем балансы
        balances = []
        total_usd = 0
        
        for asset_data in account_data.get('balances', []):
            free = float(asset_data.get('free', 0))
            locked = float(asset_data.get('locked', 0))
            total = free + locked
            
            if total > 0:
                asset = asset_data['asset']
                
                # Конвертация в USDT
                usd_value = 0
                if asset == 'USDT':
                    usd_value = total
                else:
                    symbol = f"{asset}USDT"
                    if symbol in prices:
                        usd_value = total * prices[symbol]
                
                if usd_value > 0.01:  # Показываем только значимые балансы
                    balances.append(BalanceItem(
                        asset=asset,
                        free=free,
                        locked=locked,
                        total=total,
                        usd_value=usd_value
                    ))
                    total_usd += usd_value
        
        # Сортируем по USD value
        balances.sort(key=lambda x: x.usd_value, reverse=True)
        
        return WalletBalanceResponse(
            balances=balances,
            total_usd=total_usd,
            exchange="BINANCE",
            market_type=keys.get('market_type', 'FUTURES')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balances: {str(e)}")


@router.post("/order", response_model=OrderResponse, summary="Создать ордер")
async def create_order(
    order: OrderInput,
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID")
):
    """Создание ордера на Binance"""
    if not telegram_user_id:
        raise HTTPException(status_code=400, detail="Telegram User ID required")
    
    keys = user_api_keys.get(telegram_user_id)
    if not keys:
        if not BINANCE_API_KEY or not BINANCE_API_SECRET:
            raise HTTPException(status_code=400, detail="API keys not configured")
        keys = {
            'api_key': BINANCE_API_KEY,
            'api_secret': BINANCE_API_SECRET,
            'market_type': 'FUTURES'
        }
    
    is_futures = keys.get('market_type', 'FUTURES') == 'FUTURES'
    endpoint = '/fapi/v1/order' if is_futures else '/api/v3/order'
    
    params = {
        'symbol': order.symbol.replace('/', ''),
        'side': order.side.upper(),
        'type': order.order_type.upper(),
        'quantity': order.quantity
    }
    
    if order.order_type.upper() == 'LIMIT':
        if not order.price:
            raise HTTPException(status_code=400, detail="Price required for LIMIT orders")
        params['price'] = order.price
        params['timeInForce'] = 'GTC'
    
    try:
        result = await binance_post_request(
            endpoint,
            params,
            api_key=keys['api_key'],
            api_secret=keys['api_secret'],
            is_futures=is_futures
        )
        
        return OrderResponse(
            success=True,
            order_id=result.get('orderId'),
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=order.price,
            status=result.get('status', 'NEW'),
            message="Order created successfully"
        )
        
    except HTTPException as e:
        return OrderResponse(
            success=False,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=order.price,
            status="ERROR",
            message=str(e.detail)
        )
    except Exception as e:
        return OrderResponse(
            success=False,
            symbol=order.symbol,
            side=order.side,
            quantity=order.quantity,
            price=order.price,
            status="ERROR",
            message=f"Failed to create order: {str(e)}"
        )


@router.get("/prices", summary="Получить текущие цены")
async def get_prices():
    """Получение текущих цен всех торговых пар"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BINANCE_FUTURES_URL}/fapi/v1/ticker/price") as response:
                if response.status != 200:
                    raise HTTPException(status_code=response.status, detail="Failed to fetch prices")
                data = await response.json()
                
                # Фильтруем только USDT пары
                prices = {
                    item['symbol']: float(item['price'])
                    for item in data
                    if item['symbol'].endswith('USDT')
                }
                
                return {"success": True, "prices": prices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch prices: {str(e)}")
