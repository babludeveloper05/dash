"""Auth service — registration, login, token verification.

Business logic lives here. Routers call these functions and handle HTTP concerns
(status codes, response models). This keeps the auth logic testable without
needing a FastAPI TestClient.
"""
from sqlalchemy.orm import Session
from sqlalchemy import select

from models import User
from auth import hash_password, verify_password, create_access_token, decode_access_token
from security import sanitize_text


def register_user(email: str, password: str, name: str, db: Session) -> tuple[User, str]:
    """Register a new user. Returns (user, access_token).

    Raises:
        ValueError: if email is already registered
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

    token = create_access_token({"sub": user.id})
    return user, token


def login_user(email: str, password: str, db: Session) -> tuple[User, str]:
    """Authenticate a user. Returns (user, access_token).

    Raises:
        ValueError: if credentials are invalid
    """
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    token = create_access_token({"sub": user.id})
    return user, token


def get_user_by_id(user_id: str, db: Session) -> User | None:
    """Get a user by ID. Returns None if not found."""
    return db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()


def verify_token(token: str, db: Session) -> User | None:
    """Verify a JWT token and return the user, or None if invalid."""
    user_id = decode_access_token(token)
    if not user_id:
        return None
    return get_user_by_id(user_id, db)
