"""
Rate limiting + input sanitization utilities.

Rate limiting: simple in-memory sliding window (no external deps needed for
single-process deployment). For multi-process, use Redis-backed limiter.

Sanitization: uses Python's built-in html module to escape user content,
preventing stored XSS. Strips script tags and event handlers.
"""
import time
import re
import html
from collections import defaultdict
from fastapi import HTTPException, Request, status

# --- Rate limiting (in-memory) ---

# { ip: [(timestamp, ...)] }
_rate_store: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(ip: str, max_requests: int, window_seconds: int) -> bool:
    """Check if the IP is within the rate limit. Returns True if allowed.

    Call this at the start of a route handler:
        if not check_rate_limit(request.client.host, 5, 60):
            raise HTTPException(429, "Rate limit exceeded")
    """
    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < window_seconds]

    if len(_rate_store[ip]) >= max_requests:
        return False

    _rate_store[ip].append(now)
    return True


# --- Input sanitization ---

# Patterns that indicate dangerous content
_SCRIPT_PATTERN = re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)
_EVENT_HANDLER_PATTERN = re.compile(r'on\w+\s*=', re.IGNORECASE)
_DANGEROUS_TAGS = re.compile(
    r'<\s*(script|iframe|object|embed|svg|math|form|style|link|meta|base)[^>]*>.*?</\1\s*>',
    re.IGNORECASE | re.DOTALL,
)


def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Sanitize user-generated text to prevent stored XSS.

    1. Strips script/iframe/object/embed/svg/style tags
    2. Strips event handlers (onclick=, onload=, etc.)
    3. Escapes remaining HTML entities
    4. Truncates to max_length
    """
    if not text or not isinstance(text, str):
        return ''

    # Strip dangerous tags
    result = _DANGEROUS_TAGS.sub('', text)
    result = _SCRIPT_PATTERN.sub('', result)

    # Strip event handlers
    result = _EVENT_HANDLER_PATTERN.sub('', result)

    # Escape HTML entities (converts < to &lt;, > to &gt;, etc.)
    result = html.escape(result, quote=True)

    # Truncate
    if len(result) > max_length:
        result = result[:max_length]

    return result


def sanitize_dict(data: dict, fields: list[str], max_length: int = 10000) -> dict:
    """Sanitize specific string fields in a dict.
    Usage: sanitize_dict(body, ['title', 'content', 'bio'])
    """
    sanitized = {**data }
    for field in fields:
        if field in sanitized and isinstance(sanitized[field], str):
            sanitized[field] = sanitize_text(sanitized[field], max_length)
    return sanitized
