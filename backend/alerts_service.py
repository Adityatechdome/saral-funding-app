"""Smart Funding Alerts — rule engine generating personalised alert notifications."""
from datetime import datetime, timezone
from typing import Dict, List, Any
import uuid


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def evaluate_alerts(user: Dict, bp: Dict, fa: Dict, matches: List[Dict], consultations: List[Dict]) -> List[Dict[str, Any]]:
    """Return list of new alerts. Caller dedupes against existing notifications."""
    alerts: List[Dict[str, Any]] = []
    uid = user.get("id")

    # 1. High-match scheme alert
    high_match = next((m for m in matches if m.get("score", 0) >= 90), None)
    if high_match:
        alerts.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "high_match",
            "key": f"high_match:{high_match['scheme_id']}",
            "title": f"You may qualify for {high_match['name']}",
            "body": f"Eligibility score {high_match['score']}%. Estimated funding ₹{high_match['funding_estimate']:,}.",
            "read": False,
            "created_at": _now(),
        })

    # 2. State-specific subsidy alert
    state = user.get("state")
    state_match = next((m for m in matches if state and state.lower() in m.get("name", "").lower()), None)
    if state_match:
        alerts.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "state_scheme",
            "key": f"state:{state_match['scheme_id']}",
            "title": f"New {state} subsidy available",
            "body": f"{state_match['name']} matches your business — score {state_match['score']}%.",
            "read": False,
            "created_at": _now(),
        })

    # 3. GST nudge
    if not (fa.get("gst_registration") or bp.get("gst_available")):
        alerts.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "readiness",
            "key": "gst_nudge",
            "title": "Register GST to unlock more schemes",
            "body": "+15 points on Funding Readiness. Apply at gst.gov.in.",
            "read": False,
            "created_at": _now(),
        })

    # 4. Udyam nudge
    if not (fa.get("udyam_registration") or bp.get("udyam_available")):
        alerts.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "readiness",
            "key": "udyam_nudge",
            "title": "Get Udyam registration in 10 minutes",
            "body": "Free at udyamregistration.gov.in — required for CGTMSE & MSME subsidies.",
            "read": False,
            "created_at": _now(),
        })

    # 5. Upcoming consultation reminder
    pending = [c for c in consultations if c.get("status") in ("confirmed", "new")]
    if pending:
        c = pending[0]
        alerts.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "type": "consultation_reminder",
            "key": f"reminder:{c['id']}",
            "title": "Consultation reminder",
            "body": f"{c.get('consultation_type', 'Call')} on {c.get('date')} at {c.get('time_slot')}",
            "read": False,
            "created_at": _now(),
        })

    return alerts
