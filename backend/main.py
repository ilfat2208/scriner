"""
FastAPI приложение для Whale Screener
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from pathlib import Path

from backend.db.database import init_db, close_db
from backend.api.routes import api_router


# Путь к статическим файлам Next.js
STATIC_DIR = Path(__file__).parent.parent / "out"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Управление жизненным циклом приложения
    """
    # Startup
    print("🚀 Starting Whale Screener API...")
    await init_db()
    print("✅ Database initialized")

    yield

    # Shutdown
    print("⏹️ Shutting down Whale Screener API...")
    await close_db()


# Создание приложения
app = FastAPI(
    title="🐋 Whale Screener API",
    description="API для системы детекции китовых сделок",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware (только для dev, в production раздаём статику)
is_production = os.getenv("RAILWAY_ENVIRONMENT") == "production" or os.getenv("NODE_ENV") == "production"

if not is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # Next.js dev
            "http://127.0.0.1:3000",
            "http://localhost:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Подключение роутов
app.include_router(api_router, prefix="/api")


# Раздача статических файлов Next.js (production mode)
if STATIC_DIR.exists():
    print(f"📦 Serving static files from {STATIC_DIR}")
    
    # Монтируем статические файлы
    app.mount("/_next", StaticFiles(directory=str(STATIC_DIR / "_next")), name="_next")
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets"), check_dir=False), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Отдаём index.html для всех не-API роутов (SPA routing)
        """
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend not built. Run 'npm run build' first."}


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    """Проверка здоровья API"""
    return {
        "status": "healthy",
        "version": "2.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    """Корневая страница API"""
    return {
        "message": "🐋 Whale Screener API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
