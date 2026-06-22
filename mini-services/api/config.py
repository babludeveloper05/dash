"""
Database configuration.

Dev: SQLite (file: ./dev.db) — zero-config, works offline.
Prod: PostgreSQL — set DATABASE_URL=postgresql://user:pass@host:5432/dbname

The swap is automatic: if DATABASE_URL is set, use Postgres; otherwise SQLite.
SQLAlchemy handles the dialect difference — same models, same queries.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Postgres when online, SQLite for local dev/offline.
# Handle both SQLAlchemy format (sqlite:///path) and Prisma format (file:path).
_raw_db_url = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR}/dev.db")
if _raw_db_url.startswith("file:"):
    # Prisma format: file:/absolute/path → sqlite:////absolute/path
    _path = _raw_db_url[5:]  # strip "file:"
    _raw_db_url = f"sqlite:///{_path}"
DATABASE_URL = _raw_db_url

# Validate DATABASE_URL format — fail fast with a clear error.
if not DATABASE_URL.startswith(("sqlite:///", "postgresql://", "postgresql+psycopg://")):
    raise RuntimeError(
        f"DATABASE_URL must start with 'sqlite:///' or 'postgresql://'. "
        f"Got: {DATABASE_URL[:50]}..."
    )

# Is this a production environment?
IS_PRODUCTION = os.environ.get("NODE_ENV") == "production" or os.environ.get("ENV") == "production"

# JWT settings for auth tokens.
# In production, SECRET_KEY MUST be set via environment variable — no default.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if IS_PRODUCTION:
        raise RuntimeError("SECRET_KEY environment variable is required in production")
    SECRET_KEY = "delta-dev-secret-change-in-production"
ALGORITHM = "HS256"
# Access tokens are short-lived (15 min) — when they expire, the client
# transparently exchanges the refresh token for a new access+refresh pair.
# This limits the blast radius of a stolen access token.
ACCESS_TOKEN_EXPIRE_MINUTES = 15
# Refresh tokens are long-lived (30 days) — keep the user logged in across
# sessions without re-entering credentials. Rotated on each refresh.
REFRESH_TOKEN_EXPIRE_DAYS = 30

# CORS — only allow configured origins. NO wildcard in production.
_default_origins = "http://localhost:3000,http://localhost:81,http://127.0.0.1:3000,http://127.0.0.1:81"
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

# Rate limiting config
AUTH_RATE_LIMIT = int(os.environ.get("AUTH_RATE_LIMIT", "5"))  # 5 requests per window
AUTH_RATE_WINDOW = int(os.environ.get("AUTH_RATE_WINDOW", "60"))  # 60 seconds
AI_RATE_LIMIT = int(os.environ.get("AI_RATE_LIMIT", "20"))  # 20 requests per window
AI_RATE_WINDOW = int(os.environ.get("AI_RATE_WINDOW", "60"))  # 60 seconds

# Account lockout config
MAX_LOGIN_ATTEMPTS = int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5"))
LOCKOUT_DURATION_MINUTES = int(os.environ.get("LOCKOUT_DURATION_MINUTES", "15"))
