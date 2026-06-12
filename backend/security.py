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
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = int(os.environ.get("JWT_EXPIRY_DAYS", "30"))

if not JWT_SECRET:
    # Warn loudly — operator must set this in production
    logger.warning("JWT_SECRET is not set — using insecure fallback. Set JWT_SECRET in env!")
    JWT_SECRET = "CHANGE_ME_SET_JWT_SECRET_IN_ENV_BEFORE_DEPLOY"


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRY_DAYS * 86400,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[str]:
    """Returns user_id if valid, None otherwise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError as e:
        logger.debug(f"JWT verification failed: {e}")
        return None


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
