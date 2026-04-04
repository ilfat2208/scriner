#!/usr/bin/env python3
"""
🐋 Whale Screener - Backend Launcher

Запуск FastAPI сервера для Whale Screener API

Использование:
    python launch_backend.py
    
Или с настройками:
    python launch_backend.py --host 0.0.0.0 --port 8000 --reload
"""

import argparse
import uvicorn
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Whale Screener Backend")
    
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind (default: 0.0.0.0)"
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind (default: 8000)"
    )
    
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1)"
    )
    
    args = parser.parse_args()
    
    print("🐋 Whale Screener Backend")
    print("=" * 40)
    print(f"📍 Host: {args.host}")
    print(f"🔌 Port: {args.port}")
    print(f"🔄 Reload: {args.reload}")
    print(f"👷 Workers: {args.workers}")
    print("=" * 40)
    print()
    print("📚 API Documentation:")
    print(f"   http://localhost:{args.port}/docs")
    print(f"   http://localhost:{args.port}/health")
    print()
    print("⏹️  Press Ctrl+C to stop")
    print()
    
    try:
        uvicorn.run(
            "backend.main:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
            workers=args.workers if not args.reload else 1,
        )
    except KeyboardInterrupt:
        print("\n⏹️  Backend stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
