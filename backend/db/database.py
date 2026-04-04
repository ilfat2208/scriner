"""
База данных для Whale Screener
SQLite + SQLAlchemy (Async)
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from pathlib import Path

# Создание директории для БД
db_path = Path("data")
db_path.mkdir(exist_ok=True)

DATABASE_URL = "sqlite+aiosqlite:///data/whale_screener.db"

# Движок БД
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Логирование SQL запросов
    future=True,
)

# Сессия
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Базовый класс для моделей
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Зависимость для получения сессии БД"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Инициализация БД (создание таблиц)"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Закрытие подключения к БД"""
    await engine.dispose()
