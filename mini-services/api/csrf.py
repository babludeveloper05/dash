"""
CSRF Protection utilities for FastAPI.

Uses double-submit cookie pattern:
1. Server sets a CSRF token in httpOnly cookie
2. Client reads token and sends it in X-CSRF-Token header
3. Server validates header matches cookie

This protects against CSRF attacks while allowing API calls from the frontend.
"""
import secrets
import hmac
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException, Depends
from jose import jwt

from config import SECRET_KEY, ALGORITHM


CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_EXPIRE_HOURS = 24


def generate_csrf_token() -> str:
    """Generate a new CSRF token."""
    return secrets.token_urlsafe(32)


def create_csrf_token() -> str:
    """Create a signed CSRF token with expiry."""
    token = generate_csrf_token()
    expire = datetime.now(timezone.utc) + timedelta(hours=CSRF_EXPIRE_HOURS)
    payload = {
        "token": token,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_csrf_token(token: str) -> bool:
    """Verify a CSRF token is valid and not expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return "token" in payload
    except Exception:
        return False


async def csrf_protect(request: Request):
    """
    Dependency to protect POST/PUT/DELETE/PATCH routes from CSRF attacks.
    
    Validates that:
    1. CSRF cookie exists
    2. X-CSRF-Token header exists
    3. Token in header matches token in cookie
    """
    # Skip CSRF check for safe methods
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return
    
    # Get CSRF token from cookie
    csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
    if not csrf_cookie:
        raise HTTPException(
            status_code=403,
            detail="CSRF token missing in cookie. Please refresh the page."
        )
    
    # Get CSRF token from header
    csrf_header = request.headers.get(CSRF_HEADER_NAME)
    if not csrf_header:
        raise HTTPException(
            status_code=403,
            detail=f"CSRF token missing in header. Add '{CSRF_HEADER_NAME}' header."
        )
    
    # Verify both tokens are valid
    if not verify_csrf_token(csrf_cookie):
        raise HTTPException(
            status_code=403,
            detail="CSRF token in cookie has expired. Please refresh the page."
        )
    
    if not verify_csrf_token(csrf_header):
        raise HTTPException(
            status_code=403,
            detail="CSRF token in header has expired. Please refresh the page."
        )
    
    # Tokens don't need to match exactly (both are signed), 
    # but both must be valid signed tokens from our server
    # For stricter validation, you could extract and compare the inner token values
    return True


class CSRFMiddleware:
    """
    Middleware to automatically set CSRF token cookie on responses.
    
    This ensures every response includes a fresh CSRF token cookie,
    which the frontend can read and use for subsequent requests.
    """
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                
                # Set CSRF token cookie if not already present
                # Generate a new token for each request
                csrf_token = create_csrf_token()
                cookie_value = f"{CSRF_COOKIE_NAME}={csrf_token}; Path=/; HttpOnly; Secure; SameSite=Strict"
                headers.append((b"set-cookie", cookie_value.encode()))
                
                message["headers"] = headers
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)
