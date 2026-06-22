"""
WhatsApp notifications via Twilio Messages API (no SDK — plain HTTP).

Requires env vars:
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
  TWILIO_WHATSAPP_FROM  — your approved WA number, e.g. whatsapp:+14155238886
                          (Twilio sandbox default is whatsapp:+14155238886)

If any var is missing the call is silently skipped.
"""
import os
import logging
import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN  = os.environ.get("TWILIO_AUTH_TOKEN", "")
WA_FROM     = os.environ.get("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

ENABLED = bool(ACCOUNT_SID and AUTH_TOKEN)


def send_whatsapp(to_mobile: str, message: str) -> bool:
    """
    Send a WhatsApp message to a mobile number (with or without +91 prefix).
    Returns True if the API call succeeded (202 accepted).
    """
    if not ENABLED:
        logger.info(f"[WhatsApp MOCK] to={to_mobile}: {message}")
        return False

    # Normalise to E.164
    mobile = to_mobile.strip()
    if not mobile.startswith("+"):
        mobile = "+91" + mobile.lstrip("0")

    try:
        resp = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json",
            auth=HTTPBasicAuth(ACCOUNT_SID, AUTH_TOKEN),
            data={
                "From": WA_FROM,
                "To":   f"whatsapp:{mobile}",
                "Body": message,
            },
            timeout=10,
        )
        if resp.status_code in (200, 201):
            logger.info(f"WhatsApp sent to {mobile}")
            return True
        else:
            logger.warning(f"WhatsApp API {resp.status_code}: {resp.text[:200]}")
            return False
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        return False
