"""
Auth utilities — password hashing + JWT (access + refresh tokens) + token blocklist.

Token strategy:
  - Access token: short-lived (15 min), used for API requests
  - Refresh token: long-lived (30 days), used to get new access tokens
  - Blocklist: invalidated tokens (on logout/refresh) are rejected until expiry
  - Each token has a unique jti (JWT ID) so the blocklist can target individual tokens
"""
import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext

from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

# Use pbkdf2_sha256 — no bcrypt version-compatibility issues, built into passlib.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# In-memory token blocklist: { jti: expiry_datetime }
# For multi-process, use Redis. For single-process, this is fine.
_token_blocklist: dict[str, datetime] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """Create a short-lived access token (15 min)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a long-lived refresh token (30 days)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh", "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    """Returns the user_id from an access token, or None if invalid/expired/blocklisted."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        jti = payload.get("jti")
        if jti and jti in _token_blocklist:
            return None
        return payload.get("sub")
    except JWTError:
        return None


def decode_refresh_token(token: str) -> str | None:
    """Returns the user_id from a refresh token, or None if invalid/expired/blocklisted."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        jti = payload.get("jti")
        if jti and jti in _token_blocklist:
            return None
        return payload.get("sub")
    except JWTError:
        return None


def blocklist_token(token: str) -> None:
    """Add a token to the blocklist (used on logout/refresh rotation)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        jti = payload.get("jti")
        if not jti:
            return  # Can't blocklist without a jti
        exp = payload.get("exp")
        if exp:
            _token_blocklist[jti] = datetime.fromtimestamp(exp, tz=timezone.utc)
        else:
            _token_blocklist[jti] = datetime.now(timezone.utc) + timedelta(days=7)
    except JWTError:
        pass  # Can't decode — nothing to blocklist


def cleanup_blocklist() -> None:
    """Remove expired entries from the blocklist."""
    now = datetime.now(timezone.utc)
    expired = [k for k, v in _token_blocklist.items() if v < now]
    for k in expired:
        del _token_blocklist[k]
