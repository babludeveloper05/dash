"""Auth router — register, login, refresh, logout, me, password reset, email verification. Rate limited + CSRF protected."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token, UserOut
from services.auth_service import (
    register_user, login_user, verify_token,
    refresh_access_token, logout_user,
    verify_email, request_password_reset, reset_password,
)
from security import check_rate_limit
from csrf import csrf_protect
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


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/register", response_model=Token)
def register(request: Request, body: UserCreate, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
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
def login(request: Request, body: UserLogin, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
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
def refresh(body: RefreshRequest, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
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
    _ = Depends(csrf_protect),
):
    """Invalidate the access token (and refresh token if provided) server-side."""
    logout_user(token, body.refresh_token if body else None)
    return {"ok": True, "detail": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/verify-email")
def verify_email_endpoint(body: VerifyEmailRequest, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    """Verify email address with token."""
    success = verify_email(body.token, db)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    return {"ok": True, "detail": "Email verified successfully"}


@router.post("/forgot-password")
def forgot_password(request: Request, body: PasswordResetRequest, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    """Request password reset email."""
    ip = request.client.host if request.client else 'unknown'
    if not check_rate_limit(ip, AUTH_RATE_LIMIT, AUTH_RATE_WINDOW):
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded. Max {AUTH_RATE_LIMIT} requests per {AUTH_RATE_WINDOW}s.")
    
    # Always return success to prevent email enumeration
    request_password_reset(body.email, db)
    return {"ok": True, "detail": "If the email exists, a reset link has been sent"}


@router.post("/reset-password")
def reset_password_endpoint(body: PasswordResetConfirm, db: Session = Depends(get_db), _ = Depends(csrf_protect)):
    """Reset password with token."""
    try:
        success = reset_password(body.token, body.new_password, db)
        if not success:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        return {"ok": True, "detail": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
