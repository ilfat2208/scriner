"""
API маршруты для работы с сигналами
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import json

from backend.db.database import get_db
from backend.db.models import SignalModel
from backend.api.schemas import (
    SignalCreate,
    SignalFilter,
    SignalUpdate,
    SignalResponse,
    SignalListResponse,
    SignalStatsResponse,
    WebSocketSignalMessage,
    WebSocketErrorMessage,
)

router = APIRouter(prefix="/signals", tags=["Signals"])


# === REST API ===

@router.get("", response_model=SignalListResponse)
async def get_signals(
    page: int = Query(1, ge=1, description="Номер страницы"),
    page_size: int = Query(50, ge=1, le=500, description="Размер страницы"),
    signal_type: Optional[str] = Query(None, description="Тип сигнала"),
    exchange: Optional[str] = Query(None, description="Биржа"),
    side: Optional[str] = Query(None, description="Сторона сделки"),
    min_volume: Optional[float] = Query(None, ge=0, description="Мин. объём"),
    pair_search: Optional[str] = Query(None, description="Поиск по паре"),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение списка сигналов с пагинацией и фильтрами
    """
    # Построение запроса
    query = select(SignalModel)
    conditions = []

    if signal_type:
        conditions.append(SignalModel.signal_type == signal_type.upper())
    if exchange:
        conditions.append(SignalModel.exchange == exchange.upper())
    if side:
        conditions.append(SignalModel.side == side.upper())
    if min_volume is not None:
        conditions.append(SignalModel.volume_usd >= min_volume)
    if pair_search:
        conditions.append(SignalModel.pair.ilike(f"%{pair_search}%"))

    if conditions:
        query = query.where(and_(*conditions))

    # Сортировка по времени (новые сначала)
    query = query.order_by(SignalModel.timestamp.desc())

    # Получение общего количества
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Пагинация
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    # Выполнение запроса
    result = await db.execute(query)
    signals = result.scalars().all()

    # Конвертация в response
    signals_data = [
        SignalResponse(
            id=s.id,
            signal_type=s.signal_type,
            exchange=s.exchange,
            pair=s.pair,
            side=s.side,
            volume_usd=s.volume_usd,
            amount=s.amount,
            price=s.price,
            timestamp=s.timestamp,
            tx_hash=s.tx_hash,
            is_read=s.is_read,
            metadata_json=s.metadata_json,
        )
        for s in signals
    ]

    return SignalListResponse(
        data=signals_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=SignalStatsResponse)
async def get_signal_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Получение статистики по сигналам
    """
    # Статистика за 24 часа
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)

    # Общие подсчёты
    total_query = select(func.count()).select_from(SignalModel)
    total_result = await db.execute(total_query)
    total_signals = total_result.scalar() or 0

    # Сигналы за 24 часа
    recent_query = select(func.count()).where(SignalModel.timestamp >= yesterday)
    recent_result = await db.execute(recent_query)
    recent_count = recent_result.scalar() or 0

    # Киты за 24 часа
    whale_query = select(func.count()).where(
        and_(
            SignalModel.signal_type == "WHALE",
            SignalModel.timestamp >= yesterday,
        )
    )
    whale_result = await db.execute(whale_query)
    whale_count = whale_result.scalar() or 0

    # Моментумы за 24 часа
    momentum_query = select(func.count()).where(
        and_(
            SignalModel.signal_type == "MOMENTUM",
            SignalModel.timestamp >= yesterday,
        )
    )
    momentum_result = await db.execute(momentum_query)
    momentum_count = momentum_result.scalar() or 0

    # Общий объём за 24 часа
    volume_query = select(func.sum(SignalModel.volume_usd)).where(
        SignalModel.timestamp >= yesterday
    )
    volume_result = await db.execute(volume_query)
    total_volume = volume_result.scalar() or 0

    # Уникальные пары
    pairs_query = select(func.count(func.distinct(SignalModel.pair)))
    pairs_result = await db.execute(pairs_query)
    active_tokens = pairs_result.scalar() or 0

    # Средняя цена сигнала
    avg_signal = total_volume / max(recent_count, 1)

    # Профиль (заглушка, нужно считать по реальным данным)
    profit_24h = 0.0

    return SignalStatsResponse(
        total_signals=total_signals,
        active_tokens=active_tokens,
        profit_24h=profit_24h,
        whale_count=whale_count,
        momentum_count=momentum_count,
        total_volume_24h=total_volume,
        avg_signal_size=avg_signal,
    )


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Получение сигнала по ID
    """
    result = await db.execute(
        select(SignalModel).where(SignalModel.id == signal_id)
    )
    signal = result.scalar_one_or_none()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    return SignalResponse(
        id=signal.id,
        signal_type=signal.signal_type,
        exchange=signal.exchange,
        pair=signal.pair,
        side=signal.side,
        volume_usd=signal.volume_usd,
        amount=signal.amount,
        price=signal.price,
        timestamp=signal.timestamp,
        tx_hash=signal.tx_hash,
        is_read=signal.is_read,
        metadata_json=signal.metadata_json,
    )


@router.post("", response_model=SignalResponse, status_code=201)
async def create_signal(
    signal_data: SignalCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Создание нового сигнала
    
    Используется для приёма данных от детектора китов
    """
    signal = SignalModel(
        signal_type=signal_data.signal_type.value,
        exchange=signal_data.exchange.value,
        pair=signal_data.pair,
        side=signal_data.side.value,
        volume_usd=signal_data.volume_usd,
        amount=signal_data.amount,
        price=signal_data.price,
        tx_hash=signal_data.tx_hash,
        metadata_json=json.dumps(signal_data.metadata_json) if signal_data.metadata_json else None,
    )

    db.add(signal)
    await db.commit()
    await db.refresh(signal)

    # Отправка через WebSocket (если есть подключенные клиенты)
    await broadcast_signal(signal)

    return SignalResponse(
        id=signal.id,
        signal_type=signal.signal_type,
        exchange=signal.exchange,
        pair=signal.pair,
        side=signal.side,
        volume_usd=signal.volume_usd,
        amount=signal.amount,
        price=signal.price,
        timestamp=signal.timestamp,
        tx_hash=signal.tx_hash,
        is_read=signal.is_read,
        metadata_json=signal.metadata_json,
    )


@router.patch("/{signal_id}", response_model=SignalResponse)
async def update_signal(
    signal_id: int,
    update_data: SignalUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Обновление сигнала (например, отметка как прочитанный)
    """
    result = await db.execute(
        select(SignalModel).where(SignalModel.id == signal_id)
    )
    signal = result.scalar_one_or_none()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    # Обновление полей
    if update_data.is_read is not None:
        signal.is_read = update_data.is_read

    await db.commit()
    await db.refresh(signal)

    return SignalResponse(
        id=signal.id,
        signal_type=signal.signal_type,
        exchange=signal.exchange,
        pair=signal.pair,
        side=signal.side,
        volume_usd=signal.volume_usd,
        amount=signal.amount,
        price=signal.price,
        timestamp=signal.timestamp,
        tx_hash=signal.tx_hash,
        is_read=signal.is_read,
        metadata_json=signal.metadata_json,
    )


@router.delete("/{signal_id}", status_code=204)
async def delete_signal(
    signal_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Удаление сигнала
    """
    result = await db.execute(
        select(SignalModel).where(SignalModel.id == signal_id)
    )
    signal = result.scalar_one_or_none()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    await db.delete(signal)
    await db.commit()


# === WebSocket ===

# Хранилище активных WebSocket подключений
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Отправка сообщения всем подключенным клиентам"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Удаление отключенных
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_signal(self, signal: SignalModel):
        """Отправка нового сигнала всем клиентам"""
        message = WebSocketSignalMessage(
            data=SignalResponse(
                id=signal.id,
                signal_type=signal.signal_type,
                exchange=signal.exchange,
                pair=signal.pair,
                side=signal.side,
                volume_usd=signal.volume_usd,
                amount=signal.amount,
                price=signal.price,
                timestamp=signal.timestamp,
                tx_hash=signal.tx_hash,
                is_read=signal.is_read,
                metadata_json=signal.metadata_json,
            )
        )
        await self.broadcast(message.dict())


manager = ConnectionManager()


async def broadcast_signal(signal: SignalModel):
    """Глобальная функция для отправки сигнала"""
    await manager.broadcast_signal(signal)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint для получения сигналов в реальном времени
    
    Подключение: ws://localhost:8000/api/signals/ws
    """
    await manager.connect(websocket)
    try:
        # Ожидание сообщений от клиента (например, heartbeat)
        while True:
            try:
                data = await websocket.receive_text()
                # Можно обработать команды от клиента
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        manager.disconnect(websocket)
