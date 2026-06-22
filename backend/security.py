"""
Security utilities:
  - JWT token generation and validation
  - In-memory rate limiter for OTP endpoints
  - File upload validation
  - Input sanitisation helpers
"""
import os
import re
import time
import logging
from collections import defaultdict
from typing import Optional, Tuple
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
import hashlib
import secrets

JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"

ACCESS_TOKEN_MINUTES  = int(os.environ.get("ACCESS_TOKEN_MINUTES", "15"))
REFRESH_TOKEN_DAYS    = int(os.environ.get("REFRESH_TOKEN_DAYS", "30"))

if not JWT_SECRET:
    logger.warning("JWT_SECRET is not set — using insecure fallback. Set JWT_SECRET in env!")
    JWT_SECRET = "CHANGE_ME_SET_JWT_SECRET_IN_ENV_BEFORE_DEPLOY"


def create_access_token(user_id: str) -> str:
    """Short-lived access token — 15 minutes."""
    payload = {
        "sub":  user_id,
        "type": "access",
        "iat":  int(time.time()),
        "exp":  int(time.time()) + ACCESS_TOKEN_MINUTES * 60,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token — 30 days."""
    payload = {
        "sub":  user_id,
        "type": "refresh",
        "iat":  int(time.time()),
        "exp":  int(time.time()) + REFRESH_TOKEN_DAYS * 86400,
        "jti":  secrets.token_hex(16),   # unique ID to allow revocation
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Keep old name as alias so existing callers don't break
def create_token(user_id: str) -> str:
    return create_access_token(user_id)


def verify_token(token: str) -> Optional[str]:
    """Returns user_id if valid access token, None otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") == "refresh":
            return None  # refresh tokens must not be used as access tokens
        return payload.get("sub")
    except JWTError as e:
        logger.debug(f"JWT access token verification failed: {e}")
        return None


def verify_refresh_token(token: str) -> Optional[dict]:
    """Returns full payload if valid refresh token, None otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError as e:
        logger.debug(f"JWT refresh token verification failed: {e}")
        return None


def hash_token(token: str) -> str:
    """Store only the hash of refresh tokens in DB — never the raw token."""
    return hashlib.sha256(token.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Rate limiter (in-memory, single-process safe for Render free tier)
# ---------------------------------------------------------------------------
_rate_store: dict = defaultdict(list)  # key → list of unix timestamps

def check_rate_limit(key: str, max_calls: int, window_seconds: int) -> Tuple[bool, int]:
    """
    Returns (allowed, retry_after_seconds).
    Cleans up old entries on each call.
    """
    now = time.time()
    calls = _rate_store[key]
    # Remove entries outside the window
    calls[:] = [t for t in calls if now - t < window_seconds]
    if len(calls) >= max_calls:
        oldest = calls[0]
        retry_after = int(window_seconds - (now - oldest)) + 1
        return False, retry_after
    calls.append(now)
    return True, 0


# ---------------------------------------------------------------------------
# File validation
# ---------------------------------------------------------------------------
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/heic",
    "image/heif",
}

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif"}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_upload(filename: str, content_type: str, size: int) -> Tuple[bool, str]:
    """Returns (ok, error_message)."""
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '{ext}' not allowed. Use PDF, JPG, or PNG."
    if content_type not in ALLOWED_MIME_TYPES:
        return False, f"MIME type '{content_type}' not allowed."
    if size > MAX_FILE_SIZE_BYTES:
        return False, f"File too large ({size // (1024*1024)} MB). Max 10 MB."
    return True, ""


# ---------------------------------------------------------------------------
# Input sanitisation
# ---------------------------------------------------------------------------
_MOBILE_RE = re.compile(r"^\+?[0-9]{10,15}$")


def sanitise_mobile(mobile: str) -> Optional[str]:
    """Returns normalised E.164 mobile or None if invalid."""
    m = mobile.strip().replace(" ", "").replace("-", "")
    if not _MOBILE_RE.match(m):
        return None
    if not m.startswith("+"):
        m = "+91" + m.lstrip("0")
    # Must be 10 digits after +91
    digits = m.lstrip("+")
    if digits.startswith("91") and len(digits) != 12:
        return None
    return m


def sanitise_search(q: str, max_len: int = 100) -> str:
    """Strip regex special chars from user search input to prevent ReDoS."""
    q = q.strip()[:max_len]
    # Escape all regex metacharacters
    return re.escape(q)
