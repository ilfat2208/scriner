"""
API маршруты
"""

from .signals import router as signals_router
from .tickers import router as tickers_router
from .thresholds import router as thresholds_router

api_router = signals_router
api_router.include_router(tickers_router)
api_router.include_router(thresholds_router)

__all__ = ["api_router"]
