"""
Audit logging service.

Every sensitive action is written to:
  audit_logs        — queryable, indexed, kept 12 months
  audit_logs_archive — append-only shadow copy; normal admins cannot modify this

Indexes created at startup (see server.py seed_db):
  user_id, timestamp, action
"""
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Actions
class AuditAction:
    # Auth
    OTP_SEND            = "otp_send"
    OTP_VERIFY_SUCCESS  = "otp_verify_success"
    OTP_VERIFY_FAIL     = "otp_verify_fail"
    LOGIN               = "login"
    TOKEN_REFRESH       = "token_refresh"

    # Profile
    PROFILE_UPDATE      = "profile_update"
    ACCOUNT_DEACTIVATE  = "account_deactivate"
    ACCOUNT_ANONYMIZE   = "account_anonymize"

    # Documents
    DOCUMENT_UPLOAD     = "document_upload"
    DOCUMENT_DOWNLOAD   = "document_download"
    DOCUMENT_VERIFY     = "document_verify"
    DOCUMENT_REJECT     = "document_reject"
    DOCUMENT_DELETE     = "document_delete"

    # Admin
    ADMIN_USER_VIEW     = "admin_user_view"
    ADMIN_ROLE_CHANGE   = "admin_role_change"
    ADMIN_TEAM_INVITE   = "admin_team_invite"
    ADMIN_TEAM_REMOVE   = "admin_team_remove"

    # Lead / Loan
    LEAD_STAGE_CHANGE   = "lead_stage_change"
    CONSULTATION_BOOK   = "consultation_book"
    RECOMMENDATION_SAVE = "recommendation_save"

    # Export
    DATA_EXPORT         = "data_export"


async def log(
    db,
    action: str,
    user_id: Optional[str] = None,
    role: Optional[str] = "user",
    resource: Optional[str] = None,
    ip: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    """
    Write one audit entry to both audit_logs and audit_logs_archive.
    Never raises — audit failures must not break the main request.
    """
    import uuid
    entry = {
        "id":        str(uuid.uuid4()),
        "user_id":   user_id,
        "role":      role,
        "action":    action,
        "resource":  resource,
        "ip":        ip,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "metadata":  metadata or {},
    }
    try:
        await db.audit_logs.insert_one({**entry})
        await db.audit_logs_archive.insert_one({**entry})
    except Exception as e:
        logger.error(f"Audit log write failed: {e}")


async def check_admin_abuse(db, admin_id: str, action: str, threshold: int, window_minutes: int) -> bool:
    """
    Returns True if the admin has exceeded `threshold` occurrences of `action`
    within the last `window_minutes`. Used for anomaly alerting.
    """
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=window_minutes)).isoformat()
    count = await db.audit_logs.count_documents({
        "user_id": admin_id,
        "action":  action,
        "timestamp": {"$gte": cutoff},
    })
    return count >= threshold
