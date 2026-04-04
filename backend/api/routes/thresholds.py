"""
API маршруты для управления порогами китов
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from backend.db.database import get_db
from backend.db.models import WhaleThresholdModel
from backend.api.schemas import (
    WhaleThresholdResponse,
    WhaleThresholdUpdate,
)

router = APIRouter(prefix="/thresholds", tags=["Thresholds"])


@router.get("", response_model=List[WhaleThresholdResponse])
async def get_thresholds(
    db: AsyncSession = Depends(get_db),
):
    """
    Получение всех порогов детекции китов
    """
    result = await db.execute(select(WhaleThresholdModel))
    thresholds = result.scalars().all()

    return [
        WhaleThresholdResponse(
            pair=t.pair,
            min_volume_usd=t.min_volume_usd,
            is_active=t.is_active,
            updated_at=t.updated_at,
        )
        for t in thresholds
    ]


@router.get("/{pair}", response_model=WhaleThresholdResponse)
async def get_threshold(
    pair: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Получение порога для конкретной пары
    """
    result = await db.execute(
        select(WhaleThresholdModel).where(WhaleThresholdModel.pair == pair.upper())
    )
    threshold = result.scalar_one_or_none()

    if not threshold:
        # Создание порога по умолчанию
        threshold = WhaleThresholdModel(
            pair=pair.upper(),
            min_volume_usd=50000.0,
            is_active=True,
        )
        db.add(threshold)
        await db.commit()
        await db.refresh(threshold)

    return WhaleThresholdResponse(
        pair=threshold.pair,
        min_volume_usd=threshold.min_volume_usd,
        is_active=threshold.is_active,
        updated_at=threshold.updated_at,
    )


@router.put("/{pair}", response_model=WhaleThresholdResponse)
async def update_threshold(
    pair: str,
    update_data: WhaleThresholdUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Обновление порога для пары
    """
    result = await db.execute(
        select(WhaleThresholdModel).where(WhaleThresholdModel.pair == pair.upper())
    )
    threshold = result.scalar_one_or_none()

    if not threshold:
        # Создание нового порога
        threshold = WhaleThresholdModel(
            pair=pair.upper(),
            min_volume_usd=update_data.min_volume_usd,
            is_active=update_data.is_active if update_data.is_active is not None else True,
        )
        db.add(threshold)
    else:
        # Обновление существующего
        threshold.min_volume_usd = update_data.min_volume_usd
        if update_data.is_active is not None:
            threshold.is_active = update_data.is_active

    await db.commit()
    await db.refresh(threshold)

    return WhaleThresholdResponse(
        pair=threshold.pair,
        min_volume_usd=threshold.min_volume_usd,
        is_active=threshold.is_active,
        updated_at=threshold.updated_at,
    )


@router.delete("/{pair}", status_code=204)
async def delete_threshold(
    pair: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Удаление порога для пары
    """
    result = await db.execute(
        select(WhaleThresholdModel).where(WhaleThresholdModel.pair == pair.upper())
    )
    threshold = result.scalar_one_or_none()

    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold not found")

    await db.delete(threshold)
    await db.commit()
