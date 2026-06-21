"""
Project Delta — FastAPI backend.
Entry point: python main.py (or uvicorn main:app --port 8000 --reload)

Offline-first architecture:
  - The Next.js client keeps a local copy in Zustand (localStorage).
  - When online, it POSTs its full state to /sync — the server writes to the
    DB and returns the merged state.
  - Real-time (live classes, leaderboard, doubt notifications) is handled by
    a separate socket.io mini-service on port 3003.

Dev: SQLite (./dev.db) — zero-config.
Prod: set DATABASE_URL=postgresql://... for Postgres.
"""
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from database import engine, Base
from routers import auth, sync, notes, community, content

# Create tables on startup (SQLite/Postgres compatible).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Project Delta API",
    description="Offline-first backend for the Delta learning platform.",
    version="1.0.0",
)

# CORS — the Next.js app (port 3000) and the gateway (port 81) call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # locked down — no wildcard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers.
app.include_router(auth.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(content.router, prefix="/api")


@app.get("/")
def health():
    return {"status": "ok", "service": "delta-api", "port": 8000}


@app.get("/api")
def api_root():
    return {
        "endpoints": [
            "POST /api/auth/register",
            "POST /api/auth/login",
            "GET  /api/auth/me",
            "POST /api/sync",
            "GET  /api/notes",
            "POST /api/notes",
            "PUT  /api/notes/{id}",
            "DELETE /api/notes/{id}",
            "GET  /api/community/leaderboard",
            "GET  /api/community/live",
        ]
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
