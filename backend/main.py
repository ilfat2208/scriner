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
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️  Database init failed (continuing): {e}")

    yield

    # Shutdown
    print("⏹️ Shutting down Whale Screener API...")
    try:
        await close_db()
    except Exception:
        pass


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


# Health check (должен быть ДО catch-all роута!)
@app.get("/health", tags=["Health"])
async def health_check():
    """Проверка здоровья API"""
    print("🏥 Healthcheck called!")
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": "2024-04-04T12:00:00Z",
    }


# Раздача статических файлов Next.js (production mode)
if STATIC_DIR.exists():
    print(f"📦 Serving static files from {STATIC_DIR}")

    # Проверяем что директории существуют перед монтированием
    next_dir = STATIC_DIR / "_next"
    assets_dir = STATIC_DIR / "assets"

    if next_dir.exists():
        app.mount("/_next", StaticFiles(directory=str(next_dir)), name="_next")
        print("✅ Mounted /_next")

    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir), check_dir=False), name="assets")
        print("✅ Mounted /assets")

    def serve_index():
        """Отдаём index.html"""
        index_file = STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend not built"}

    @app.get("/", tags=["Root"])
    async def root():
        """Главная страница - фронтенд"""
        return serve_index()

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """
        Отдаём соответствующий HTML для SPA роутинга
        """
        # Не перехватываем /api и /docs
        if full_path.startswith("api/") or full_path.startswith("docs"):
            return {"error": "Not found"}
        
        # Пробуем {path}/index.html (для /signals → signals/index.html)
        dir_index = STATIC_DIR / full_path / "index.html"
        if dir_index.exists():
            return FileResponse(dir_index)
        
        # Пробуем {path}.html
        html_file = STATIC_DIR / f"{full_path}.html"
        if html_file.exists():
            return FileResponse(html_file)
        
        # Fallback на корневой index.html
        return serve_index()
else:
    print("⚠️  Static files not found. Frontend will not be served.")

    @app.get("/", tags=["Root"])
    async def root():
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
