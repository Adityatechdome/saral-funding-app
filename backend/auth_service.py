"""
Twilio Verify for OTP login.

When TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID are set,
real SMS OTPs are sent via Twilio Verify.
Falls back to mock OTP (123456) when env vars are missing — safe for local dev.
"""
import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_VERIFY_SERVICE_SID = os.environ.get("TWILIO_VERIFY_SERVICE_SID", "")

TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not TWILIO_ENABLED:
        return None
    try:
        from twilio.rest import Client
        _client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialised")
    except Exception as e:
        logger.warning(f"Twilio init failed: {e}")
        _client = None
    return _client


def send_otp(mobile: str) -> Dict[str, Any]:
    """
    Send OTP to mobile number via Twilio Verify.
    Mobile should be E.164 format e.g. +919876543210
    Returns {"success": True, "mode": "twilio"} or {"success": True, "mode": "mock"}
    Raises ValueError on Twilio error.
    """
    if not TWILIO_ENABLED:
        logger.info(f"Mock OTP sent to {mobile} (Twilio not configured)")
        return {"success": True, "mode": "mock", "message": "OTP sent (use 123456 in dev mode)"}

    client = _get_client()
    if client is None:
        return {"success": True, "mode": "mock", "message": "OTP sent (use 123456 — Twilio init failed)"}

    try:
        verification = client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verifications.create(to=mobile, channel="sms")
        logger.info(f"Twilio OTP sent to {mobile}, status={verification.status}")
        return {"success": True, "mode": "twilio", "message": "OTP sent via SMS"}
    except Exception as e:
        logger.error(f"Twilio send_otp failed for {mobile}: {e}")
        raise ValueError(f"Could not send OTP: {str(e)}")


def verify_otp(mobile: str, code: str) -> bool:
    """
    Verify OTP code for mobile number.
    Returns True if approved, False otherwise.
    In mock mode, accepts 123456.
    """
    if not TWILIO_ENABLED:
        return code == "123456"

    client = _get_client()
    if client is None:
        return code == "123456"

    try:
        check = client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID) \
            .verification_checks.create(to=mobile, code=code)
        logger.info(f"Twilio OTP check for {mobile}: status={check.status}")
        return check.status == "approved"
    except Exception as e:
        logger.error(f"Twilio verify_otp failed for {mobile}: {e}")
        return False


def is_enabled() -> bool:
    return TWILIO_ENABLED


# Keep firebase_enabled as alias so existing imports don't break
def firebase_enabled() -> bool:
    return TWILIO_ENABLED
