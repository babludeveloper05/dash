#!/bin/bash
# Start the FastAPI backend service.
# Usage: ./start.sh
cd "$(dirname "$0")"
exec ./venv/bin/python main.py
