"""
Скрипт для сборки фронтенда и подготовки к деплою
Запускать перед деплоем на Railway
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(command: list[str], cwd: str = None) -> bool:
    """Запускает команду и выводит вывод"""
    print(f"🔄 Running: {' '.join(command)}")
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            check=True,
            capture_output=False,
            text=True
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        return False


def main():
    print("🚀 Building Whale Screener for deployment...")
    print("=" * 60)

    # Определяем корневую директорию
    root_dir = Path(__file__).parent
    os.chdir(root_dir)

    # Шаг 1: Установка Node.js зависимостей
    print("\n📦 Step 1: Installing Node.js dependencies...")
    if not run_command(["npm", "install"]):
        print("❌ Failed to install dependencies")
        sys.exit(1)

    # Шаг 2: Сборка Next.js
    print("\n🔨 Step 2: Building Next.js frontend...")
    if not run_command(["npm", "run", "build"]):
        print("❌ Failed to build frontend")
        sys.exit(1)

    # Шаг 3: Проверка что out директория существует
    out_dir = root_dir / "out"
    if not out_dir.exists():
        print("❌ Build failed: 'out' directory not found")
        sys.exit(1)

    print(f"\n✅ Frontend built successfully!")
    print(f"📁 Static files in: {out_dir}")
    print(f"📊 Size: {sum(f.stat().st_size for f in out_dir.rglob('*') if f.is_file()) / 1024 / 1024:.2f} MB")

    # Шаг 4: Установка Python зависимостей
    print("\n📦 Step 3: Installing Python dependencies...")
    if not run_command(["pip", "install", "-r", "requirements.txt", "-q"]):
        print("⚠️  Failed to install Python dependencies (continue anyway)")

    print("\n" + "=" * 60)
    print("✅ Build complete! Ready to deploy on Railway")
    print("\n📝 Next steps:")
    print("   1. Commit changes: git add . && git commit -m 'Build for deployment'")
    print("   2. Push to GitHub")
    print("   3. Connect to Railway")
    print("   4. Set environment variables")
    print("   5. Deploy!")


if __name__ == "__main__":
    main()
