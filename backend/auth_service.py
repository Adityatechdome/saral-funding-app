"""Firebase Phone Auth scaffolding with graceful fallback to mock OTP.

When FIREBASE_SERVICE_ACCOUNT_JSON env var is present, validates a Firebase
ID token sent from the mobile client (which performed phone auth natively).
Otherwise falls back to mock OTP (code=123456) so Expo Go preview works.
"""
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

FIREBASE_ENABLED = bool(os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"))

_firebase_app = None


def _init_firebase():
    global _firebase_app
    if _firebase_app is not None or not FIREBASE_ENABLED:
        return _firebase_app
    try:
        import json as _json
        import firebase_admin  # type: ignore
        from firebase_admin import credentials  # type: ignore

        raw = os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"]
        info = _json.loads(raw)
        cred = credentials.Certificate(info)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin initialised")
    except Exception as e:
        logger.warning(f"Firebase init failed (falling back to mock OTP): {e}")
        _firebase_app = None
    return _firebase_app


def verify_firebase_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """Returns decoded token dict on success, None on failure.
    When Firebase is disabled returns None so caller can decide to use mock flow.
    """
    if not FIREBASE_ENABLED:
        return None
    _init_firebase()
    if _firebase_app is None:
        return None
    try:
        from firebase_admin import auth as fb_auth  # type: ignore
        return fb_auth.verify_id_token(id_token)
    except Exception as e:
        logger.warning(f"Firebase verify_id_token failed: {e}")
        return None


def is_enabled() -> bool:
    return FIREBASE_ENABLED
