"""
Конфигурация pytest
"""

import pytest
import pytest_asyncio
import asyncio
import sys
from pathlib import Path

# Добавляем корень проекта в path
root_dir = Path(__file__).parent.parent
sys.path.insert(0, str(root_dir))

# Настройка event loop для async тестов
@pytest.fixture(scope="session")
def event_loop():
    """Создание event loop для сессии тестов"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Async fixture для БД
@pytest_asyncio.fixture(scope="function")
async def test_db_engine():
    """Фикстура для тестовой базы данных"""
    from sqlalchemy.ext.asyncio import create_async_engine
    from backend.db.database import Base
    
    TEST_DATABASE_URL = "sqlite+aiosqlite:///test_whale_screener.db"
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Создание таблиц
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Удаление таблиц
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


# Режим asyncio
pytestmark = pytest.mark.asyncio(scope="function")
