"""Auth router — register, login, refresh, logout, me. Rate limited."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token, UserOut
from services.auth_service import (
    register_user, login_user, verify_token,
    refresh_access_token, logout_user,
)
from security import check_rate_limit
from config import AUTH_RATE_LIMIT, AUTH_RATE_WINDOW

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user = verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


@router.post("/register", response_model=Token)
def register(request: Request, body: UserCreate, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else 'unknown'
    if not check_rate_limit(ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW):
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Max {AUTH_RATE_LIMIT} requests per {AUTH_RATE_WINDOW}s.")
    try:
        user, access, refresh = register_user(body.email, body.password, body.name, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    response = {"access_token": access, "token_type": "bearer", "user": UserOut.model_validate(user), "refresh_token": refresh}
    return response


@router.post("/login", response_model=Token)
def login(request: Request, body: UserLogin, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else 'unknown'
    if not check_rate_limit(ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW):
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Max {AUTH_RATE_LIMIT} requests per {AUTH_RATE_WINDOW}s.")
    try:
        user, access, refresh = login_user(body.email, body.password, db)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    response = {"access_token": access, "token_type": "bearer", "user": UserOut.model_validate(user), "refresh_token": refresh}
    return response


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    result = refresh_access_token(body.refresh_token, db)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    new_access, new_refresh = result
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}


@router.post("/logout")
def logout(
    token: str = Depends(oauth2_scheme),
    body: RefreshRequest | None = None,
    db: Session = Depends(get_db),
):
    """Invalidate the access token (and refresh token if provided) server-side."""
    logout_user(token, body.refresh_token if body else None)
    return {"ok": True, "detail": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
