"""
Expo Push Notifications service.
Sends push notifications to users via Expo's push API.
No SDK needed — plain HTTP requests.
"""
import logging
import requests
from typing import List, Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> bool:
    """
    Send push notification to one or more Expo push tokens.
    Returns True if at least one message was accepted.
    """
    if not tokens:
        return False

    valid_tokens = [t for t in tokens if t and t.startswith("ExponentPushToken[")]
    if not valid_tokens:
        logger.warning(f"No valid Expo push tokens in: {tokens}")
        return False

    messages = [
        {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data or {},
            "priority": "high",
        }
        for token in valid_tokens
    ]

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        result = response.json()
        logger.info(f"Push sent to {len(valid_tokens)} tokens: {result}")
        return True
    except Exception as e:
        logger.error(f"Push notification failed: {e}")
        return False


def send_push_to_user(user: dict, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Send push to a single user dict (must have push_token field)."""
    token = user.get("push_token")
    if not token:
        return False
    return send_push([token], title, body, data)
