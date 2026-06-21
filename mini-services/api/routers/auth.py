"""Auth router — thin handlers calling auth_service."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserCreate, UserLogin, Token, UserOut
from services.auth_service import register_user, login_user, verify_token

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    user = verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


@router.post("/register", response_model=Token)
def register(body: UserCreate, db: Session = Depends(get_db)):
    try:
        user, token = register_user(body.email, body.password, body.name, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(body: UserLogin, db: Session = Depends(get_db)):
    try:
        user, token = login_user(body.email, body.password, db)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
