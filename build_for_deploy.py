"""
Скрипт для локальной сборки фронтенда перед деплоем.

NOTE: В production Railway использует Dockerfile, который выполняет
все шаги сборки автоматически. Этот скрипт предназначен только для
локальной проверки перед коммитом.
"""

import subprocess
import sys
import os
from pathlib import Path


def run_command(command: list[str], cwd: str = None) -> bool:
    """Запускает команду и выводит вывод"""
    print(f"🔄 Running: {' '.join(command)}")
    try:
        subprocess.run(
            command,
            cwd=cwd,
            check=True,
            capture_output=False,
            text=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        return False


def main():
    print("🚀 Building Whale Screener locally...")
    print("=" * 60)
    print("ℹ️  On Railway, the Dockerfile handles all build steps.")

    root_dir = Path(__file__).parent
    os.chdir(root_dir)

    # Step 1: Node.js dependencies
    print("\n📦 Step 1: Installing Node.js dependencies...")
    if not run_command(["npm", "ci"]):
        print("❌ Failed to install Node.js dependencies")
        sys.exit(1)

    # Step 2: Build Next.js static export
    print("\n🔨 Step 2: Building Next.js frontend...")
    if not run_command(["npm", "run", "build"]):
        print("❌ Failed to build frontend")
        sys.exit(1)

    # Step 3: Verify output directory
    out_dir = root_dir / "out"
    if not out_dir.exists():
        print("❌ Build failed: 'out' directory not found")
        sys.exit(1)

    size_mb = sum(f.stat().st_size for f in out_dir.rglob("*") if f.is_file()) / 1024 / 1024
    print(f"\n✅ Frontend built successfully!")
    print(f"📁 Static files in: {out_dir}")
    print(f"📊 Size: {size_mb:.2f} MB")

    print("\n" + "=" * 60)
    print("✅ Local build complete!")
    print("\n📝 To deploy: git add . && git commit && git push")


if __name__ == "__main__":
    main()
