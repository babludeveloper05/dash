#!/bin/bash
# Start all Delta backend services (FastAPI + Socket.io) persistently.
# Run this from the project root: bash mini-services/start-all.sh

set -e
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$PROJECT_DIR/mini-services/api"
RT_DIR="$PROJECT_DIR/mini-services/realtime"

echo "Starting Delta backend services..."

# Kill any existing instances (match both relative and absolute path patterns)
pkill -f "api/main.py" 2>/dev/null || true
pkill -f "venv/bin/python main.py" 2>/dev/null || true
pkill -f "realtime/index.ts" 2>/dev/null || true
sleep 2

# Start FastAPI (port 8000)
echo "  FastAPI on :8000..."
cd "$API_DIR"
nohup setsid ./venv/bin/python main.py > server.log 2>&1 &
echo "  FastAPI PID: $!"

# Start Socket.io (port 3003)
echo "  Socket.io on :3003..."
cd "$RT_DIR"
nohup setsid bun --hot index.ts > server.log 2>&1 &
echo "  Socket.io PID: $!"

sleep 3

# Verify
echo ""
echo "Health checks:"
curl -s http://localhost:8000/ && echo " ✓ FastAPI"
curl -s http://localhost:3003/health && echo " ✓ Socket.io"

echo ""
echo "Both services started. Logs:"
echo "  FastAPI:   $API_DIR/server.log"
echo "  Socket.io: $RT_DIR/server.log"
