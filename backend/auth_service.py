"""
OTP service using MSG91 DLT Flow API.

USE_MOCK_OTP=true  → always accept 123456, no real SMS (dev/testing)
USE_MOCK_OTP=false → real SMS via MSG91 (production)
"""
import os
import time
import secrets
import logging
import httpx
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)

MSG91_API_KEY     = os.environ.get("MSG91_API_KEY", "")
MSG91_TEMPLATE_ID = os.environ.get("MSG91_TEMPLATE_ID", "")
MSG91_SENDER_ID   = os.environ.get("MSG91_SENDER_ID", "FAIFLL")
MSG91_ENTITY_ID   = os.environ.get("MSG91_ENTITY_ID", "")

USE_MOCK_OTP = os.environ.get("USE_MOCK_OTP", "true").strip().lower() == "true"
MSG91_ENABLED = bool(MSG91_API_KEY and MSG91_TEMPLATE_ID) and not USE_MOCK_OTP

MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow"

# In-memory OTP store: mobile -> (otp, expiry_timestamp)
_otp_store: Dict[str, Tuple[str, float]] = {}


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)  # 6-digit OTP


def _to_msg91_mobile(mobile: str) -> str:
    mobile = mobile.strip().lstrip("+")
    if mobile.startswith("91") and len(mobile) == 12:
        return mobile
    if len(mobile) == 10:
        return f"91{mobile}"
    return mobile


def send_otp(mobile: str) -> Dict[str, Any]:
    if USE_MOCK_OTP or not MSG91_ENABLED:
        logger.info(f"Mock OTP → {mobile} (USE_MOCK_OTP={USE_MOCK_OTP})")
        return {"success": True, "mode": "mock", "message": "OTP sent (use 123456 in dev mode)"}

    otp = _generate_otp()
    expiry = time.time() + 300  # 5 minutes
    _otp_store[mobile] = (otp, expiry)

    msg91_mobile = _to_msg91_mobile(mobile)
    try:
        resp = httpx.post(
            MSG91_FLOW_URL,
            headers={"authkey": MSG91_API_KEY, "content-type": "application/json"},
            json={
                "template_id":       MSG91_TEMPLATE_ID,
                "sender":            MSG91_SENDER_ID,
                "short_url":         "0",
                "realTimeResponse":  "1",
                "pe_id":             MSG91_ENTITY_ID,
                "recipients": [
                    {"mobiles": msg91_mobile, "var": otp}
                ],
            },
            timeout=10,
        )
        data = resp.json()
        logger.info(f"MSG91 send OTP → {msg91_mobile}: {data}")
        if data.get("type") == "success" or resp.status_code == 200:
            return {"success": True, "mode": "msg91", "message": "OTP sent via SMS"}
        # Clean up if failed
        _otp_store.pop(mobile, None)
        raise ValueError(data.get("message", "MSG91 error"))
    except httpx.RequestError as e:
        _otp_store.pop(mobile, None)
        logger.error(f"MSG91 network error for {mobile}: {e}")
        raise ValueError("Could not send OTP. Please try again.")


def verify_otp(mobile: str, code: str) -> bool:
    if USE_MOCK_OTP or not MSG91_ENABLED:
        return code == "123456"

    entry = _otp_store.get(mobile)
    if not entry:
        logger.warning(f"No OTP found for {mobile}")
        return False

    otp, expiry = entry
    if time.time() > expiry:
        _otp_store.pop(mobile, None)
        logger.warning(f"OTP expired for {mobile}")
        return False

    if otp == code:
        _otp_store.pop(mobile, None)  # one-time use
        logger.info(f"OTP verified for {mobile}")
        return True

    logger.warning(f"OTP mismatch for {mobile}")
    return False


def is_enabled() -> bool:
    return MSG91_ENABLED


def firebase_enabled() -> bool:
    return MSG91_ENABLED
