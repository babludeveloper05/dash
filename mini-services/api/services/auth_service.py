"""Auth service — registration, login, token verification, account lockout.

Business logic lives here. Routers call these functions and handle HTTP concerns
(status codes, response models). This keeps the auth logic testable without
needing a FastAPI TestClient.
"""
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select

from models import User
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_access_token, decode_refresh_token,
    blocklist_token,
)
from security import sanitize_text
from config import MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES

# In-memory failed login tracking: { email: { count, locked_until } }
# For multi-process, use Redis. For single-process (our deployment), this is fine.
_login_attempts: dict[str, dict] = {}


def register_user(email: str, password: str, name: str, db: Session) -> tuple[User, str, str]:
    """Register a new user. Returns (user, access_token, refresh_token).

    Raises:
        ValueError: if email is already registered or password too short
    """
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise ValueError("Email already registered")

    # Validate password (minimum 8 chars)
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    user = User(
        email=email,
        password_hash=hash_password(password),
        name=sanitize_text(name, 100),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    return user, access, refresh


def login_user(email: str, password: str, db: Session) -> tuple[User, str, str]:
    """Authenticate a user. Returns (user, access_token, refresh_token).

    Raises:
        ValueError: if credentials are invalid or account is locked
    """
    # Check account lockout
    attempts = _login_attempts.get(email, {})
    locked_until = attempts.get("locked_until")
    if locked_until and datetime.now(timezone.utc) < locked_until:
        remaining = int((locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
        raise ValueError(f"Account locked. Try again in {remaining} minutes.")

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        # Track failed attempt
        _login_attempts.setdefault(email, {"count": 0, "locked_until": None})
        _login_attempts[email]["count"] += 1

        if _login_attempts[email]["count"] >= MAX_LOGIN_ATTEMPTS:
            _login_attempts[email]["locked_until"] = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            raise ValueError(f"Too many failed attempts. Account locked for {LOCKOUT_DURATION_MINUTES} minutes.")

        remaining_attempts = MAX_LOGIN_ATTEMPTS - _login_attempts[email]["count"]
        raise ValueError(f"Invalid email or password. {remaining_attempts} attempts remaining.")

    # Successful login — clear attempts
    _login_attempts.pop(email, None)

    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    return user, access, refresh


def refresh_access_token(refresh_token: str, db: Session) -> tuple[str, str] | None:
    """Exchange a refresh token for a new access + refresh token pair.

    Returns (new_access, new_refresh) or None if the refresh token is invalid.
    """
    user_id = decode_refresh_token(refresh_token)
    if not user_id:
        return None
    user = get_user_by_id(user_id, db)
    if not user:
        return None
    # Blocklist the old refresh token (rotation)
    blocklist_token(refresh_token)
    new_access = create_access_token({"sub": user.id})
    new_refresh = create_refresh_token({"sub": user.id})
    return new_access, new_refresh


def logout_user(access_token: str, refresh_token: str | None = None) -> None:
    """Invalidate tokens by adding them to the blocklist."""
    blocklist_token(access_token)
    if refresh_token:
        blocklist_token(refresh_token)


def get_user_by_id(user_id: str, db: Session) -> User | None:
    """Get a user by ID. Returns None if not found."""
    return db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()


def verify_token(token: str, db: Session) -> User | None:
    """Verify a JWT access token and return the user, or None if invalid/blocklisted."""
    user_id = decode_access_token(token)
    if not user_id:
        return None
    return get_user_by_id(user_id, db)
