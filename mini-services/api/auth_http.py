"""
HTTP authentication dependencies for Project Delta.
For use in regular HTTP endpoint dependencies.
"""
from fastapi import Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from models import User
from auth import decode_access_token
from database import get_db

async def get_current_user_from_query(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from token in query params.
    For HTTP endpoints that receive token via query string.
    """
    if not token:
        return None
    
    user_id = decode_access_token(token)
    if not user_id:
        return None
    
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None

async def require_auth(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> User:
    """
    Require authentication - raises 401 if not authenticated.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
