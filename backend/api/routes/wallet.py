"""
Wallet API маршруты
Работа с Binance API для получения балансов и создания ордеров
Каждый пользователь хранит свои API ключи в БД
"""

import os
import time
import hmac
import hashlib
import base64
import aiohttp
from typing import Optional, Dict, List
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi import Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from cryptography.fernet import Fernet

from backend.db.database import get_db
from backend.db.models import UserModel

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# Binance API Configuration
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
BINANCE_BASE_URL = "https://api.binance.com"
BINANCE_FUTURES_URL = "https://fapi.binance.com"

# Ключ шифрования (в production использовать из env)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def encrypt_key(key: str) -> str:
    """Шифрование API ключа"""
    if not key:
        return ""
    return fernet.encrypt(key.encode()).decode()


def decrypt_key(encrypted: str) -> str:
    """Расшифровка API ключа"""
    if not encrypted:
        return ""
    return fernet.decrypt(encrypted.encode()).decode()


class ApiKeyInput(BaseModel):
    api_key: str
    api_secret: str
    market_type: str = "FUTURES"  # SPOT или FUTURES


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


class UserProfile(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    has_api_keys: bool
    market_type: str


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


async def get_or_create_user(telegram_id: str, username: str = None, first_name: str = None, db=None):
    """Получить или создать пользователя"""
    if not telegram_id:
        raise HTTPException(status_code=400, detail="Telegram User ID required")
    
    # Ищем пользователя
    result = await db.execute(select(UserModel).where(UserModel.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # Создаём нового пользователя
        user = UserModel(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    return user


@router.get("/profile", response_model=UserProfile, summary="Профиль пользователя")
async def get_profile(
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID"),
    telegram_username: str = Header(None, alias="X-Telegram-Username"),
    telegram_first_name: str = Header(None, alias="X-Telegram-First-Name"),
    db=Depends(get_db)
):
    """Получение профиля пользователя"""
    user = await get_or_create_user(telegram_user_id, telegram_username, telegram_first_name, db)
    
    return UserProfile(
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        has_api_keys=bool(user.binance_api_key and user.binance_api_secret),
        market_type=user.binance_market_type or "FUTURES"
    )


@router.post("/api-keys", summary="Сохранить API ключи пользователя")
async def save_api_keys(
    input: ApiKeyInput,
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID"),
    db=Depends(get_db)
):
    """Сохранение API ключей пользователя в БД (зашифрованных)"""
    user = await get_or_create_user(telegram_user_id, db=db)
    
    # Шифруем ключи
    user.binance_api_key = encrypt_key(input.api_key)
    user.binance_api_secret = encrypt_key(input.api_secret)
    user.binance_market_type = input.market_type
    
    await db.commit()
    await db.refresh(user)
    
    return {"success": True, "message": "API keys saved successfully"}


@router.get("/balances", response_model=WalletBalanceResponse, summary="Получить балансы")
async def get_balances(
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID"),
    db=Depends(get_db)
):
    """Получение реальных балансов с Binance"""
    user = await get_or_create_user(telegram_user_id, db=db)
    
    # Получаем API ключи пользователя
    if not user.binance_api_key or not user.binance_api_secret:
        # Если нет ключей, используем глобальные (если есть)
        if not BINANCE_API_KEY or not BINANCE_API_SECRET:
            return WalletBalanceResponse(
                balances=[],
                total_usd=0,
                exchange="BINANCE",
                market_type="FUTURES"
            )
        api_key = BINANCE_API_KEY
        api_secret = BINANCE_API_SECRET
        is_futures = True
    else:
        api_key = decrypt_key(user.binance_api_key)
        api_secret = decrypt_key(user.binance_api_secret)
        is_futures = user.binance_market_type == "FUTURES"
    
    endpoint = '/fapi/v2/account' if is_futures else '/api/v3/account'
    
    try:
        account_data = await binance_request(
            endpoint,
            api_key=api_key,
            api_secret=api_secret,
            is_futures=is_futures
        )
        
        # Получаем цены для конвертации в USD
        prices_endpoint = '/fapi/v1/ticker/price' if is_futures else '/api/v3/ticker/price'
        prices_data = await binance_request(
            prices_endpoint,
            api_key=api_key,
            api_secret=api_secret,
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
            market_type=user.binance_market_type or "FUTURES"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch balances: {str(e)}")


@router.post("/order", response_model=OrderResponse, summary="Создать ордер")
async def create_order(
    order: OrderInput,
    telegram_user_id: str = Header(None, alias="X-Telegram-User-ID"),
    db=Depends(get_db)
):
    """Создание ордера на Binance"""
    user = await get_or_create_user(telegram_user_id, db=db)
    
    if not user.binance_api_key or not user.binance_api_secret:
        if not BINANCE_API_KEY or not BINANCE_API_SECRET:
            return OrderResponse(
                success=False,
                symbol=order.symbol,
                side=order.side,
                quantity=order.quantity,
                price=order.price,
                status="ERROR",
                message="API keys not configured"
            )
        api_key = BINANCE_API_KEY
        api_secret = BINANCE_API_SECRET
        is_futures = True
    else:
        api_key = decrypt_key(user.binance_api_key)
        api_secret = decrypt_key(user.binance_api_secret)
        is_futures = user.binance_market_type == "FUTURES"
    
    endpoint = '/fapi/v1/order' if is_futures else '/api/v3/order'
    
    params = {
        'symbol': order.symbol.replace('/', ''),
        'side': order.side.upper(),
        'type': order.order_type.upper(),
        'quantity': order.quantity
    }
    
    if order.order_type.upper() == 'LIMIT':
        if not order.price:
            return OrderResponse(
                success=False,
                symbol=order.symbol,
                side=order.side,
                quantity=order.quantity,
                price=order.price,
                status="ERROR",
                message="Price required for LIMIT orders"
            )
        params['price'] = order.price
        params['timeInForce'] = 'GTC'
    
    try:
        result = await binance_post_request(
            endpoint,
            params,
            api_key=api_key,
            api_secret=api_secret,
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
