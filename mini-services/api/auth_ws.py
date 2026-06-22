"""
WebSocket authentication utilities for Project Delta.
Separate from HTTP auth due to WebSocket handshake constraints.
"""
from fastapi import WebSocket, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional
from models import User
from auth import decode_access_token
from database import get_db

async def get_current_user_from_ws(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Authenticate WebSocket connection using token from query params.
    
    Usage in client:
    const ws = new WebSocket(`ws://localhost:8000/ws/room/physics-101?token=${accessToken}`);
    
    For HTTP endpoints, use as a dependency:
    @router.post("/endpoint")
    def endpoint(current_user: User = Depends(get_current_user_from_ws)):
        ...
    """
    if not token:
        return None
    
    # Decode and validate token
    user_id = decode_access_token(token)
    if not user_id:
        return None
    
    # Fetch user from database
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None

async def get_current_user_from_ws_direct(
    websocket: WebSocket,
    db: Session
) -> Optional[User]:
    """
    Direct WebSocket authentication (for use inside WebSocket handlers).
    """
    token = websocket.query_params.get("token")
    
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
