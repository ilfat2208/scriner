#!/usr/bin/env python3
"""
Simple startup script for Railway
Handles PORT environment variable and starts uvicorn
"""

import os
import sys
import subprocess

# Get PORT from environment, default to 8000
port = os.environ.get("PORT", "8000")

print("=" * 60)
print("🐋 Whale Screener - Starting...")
print("=" * 60)
print(f"📊 Port: {port}")
print(f"📊 Environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'development')}")
print(f"📊 Working directory: {os.getcwd()}")
print(f"📊 Python: {sys.version}")
print("=" * 60)

# Check if backend/main.py exists
if not os.path.exists("backend/main.py"):
    print("❌ Error: backend/main.py not found!")
    print("Files in current directory:")
    for f in os.listdir("."):
        print(f"  {f}")
    sys.exit(1)

# Check if out/ directory exists
if os.path.exists("out"):
    print("✅ Frontend files found in 'out/'")
else:
    print("⚠️  Warning: 'out' directory not found. Frontend not built.")

print("=" * 60)
print(f"✅ Starting uvicorn on 0.0.0.0:{port}")
print("=" * 60)

# Start uvicorn
os.execvp("python", [
    "python", "-m", "uvicorn",
    "backend.main:app",
    "--host", "0.0.0.0",
    "--port", port,
    "--log-level", "info"
])
