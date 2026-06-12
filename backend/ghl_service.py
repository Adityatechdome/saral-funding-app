"""
GoHighLevel (GHL) integration via Private Integration token (v2 API).

Syncs:
  - User signup/profile update  → create/update GHL contact
  - Document uploaded            → add note to contact
  - Consultation booked          → create opportunity in pipeline
  - Lead stage changed           → update opportunity stage

Env vars required:
  GHL_API_KEY      — Private Integration token (pit-...)
  GHL_LOCATION_ID  — Sub-account location ID
  GHL_PIPELINE_NAME — Pipeline name (default: "Saral Funding Prospects")
"""
import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

GHL_API_KEY       = os.environ.get("GHL_API_KEY", "")
GHL_LOCATION_ID   = os.environ.get("GHL_LOCATION_ID", "")
GHL_PIPELINE_NAME = os.environ.get("GHL_PIPELINE_NAME", "Saral Funding Prospects")

BASE_URL = "https://services.leadconnectorhq.com"

HEADERS = {
    "Authorization": f"Bearer {GHL_API_KEY}",
    "Content-Type": "application/json",
    "Version": "2021-07-28",
}

ENABLED = bool(GHL_API_KEY and GHL_LOCATION_ID)

# Cache pipeline/stage IDs so we don't fetch them on every call
_pipeline_id: Optional[str] = None
_stage_map: dict = {}   # our stage name → GHL stage id


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get(path: str, params: dict = None) -> Optional[dict]:
    if not ENABLED:
        return None
    try:
        r = requests.get(f"{BASE_URL}{path}", headers=HEADERS, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"GHL GET {path} failed: {e}")
        return None


def _post(path: str, body: dict) -> Optional[dict]:
    if not ENABLED:
        logger.info(f"[GHL MOCK] POST {path}: {body}")
        return None
    try:
        r = requests.post(f"{BASE_URL}{path}", headers=HEADERS, json=body, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"GHL POST {path} failed: {e}")
        return None


def _put(path: str, body: dict) -> Optional[dict]:
    if not ENABLED:
        return None
    try:
        r = requests.put(f"{BASE_URL}{path}", headers=HEADERS, json=body, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"GHL PUT {path} failed: {e}")
        return None


def _load_pipeline() -> None:
    """Fetch pipeline ID and stage map once and cache them."""
    global _pipeline_id, _stage_map
    if _pipeline_id:
        return
    data = _get("/opportunities/pipelines", {"locationId": GHL_LOCATION_ID})
    if not data:
        return
    pipelines = data.get("pipelines", [])
    for p in pipelines:
        if p.get("name", "").strip().lower() == GHL_PIPELINE_NAME.strip().lower():
            _pipeline_id = p["id"]
            for stage in p.get("stages", []):
                # map both our stage names and the GHL stage name → stage id
                _stage_map[stage["name"].lower()] = stage["id"]
            logger.info(f"GHL pipeline loaded: {_pipeline_id}, stages: {list(_stage_map.keys())}")
            return
    logger.warning(f"GHL pipeline '{GHL_PIPELINE_NAME}' not found in account")


# Map our lead stages → GHL stage names (adjust if your GHL stage names differ)
OUR_STAGE_TO_GHL: dict = {
    "new":           "New",
    "contacted":     "Contacted",
    "interested":    "Interested",
    "documentation": "Documentation",
    "submitted":     "Submitted",
    "approved":      "Approved",
    "disbursed":     "Disbursed",
    "closed":        "Closed",
}


def _ghl_stage_id(our_stage: str) -> Optional[str]:
    _load_pipeline()
    ghl_name = OUR_STAGE_TO_GHL.get(our_stage, our_stage)
    # Try exact match first, then case-insensitive
    sid = _stage_map.get(ghl_name) or _stage_map.get(ghl_name.lower())
    if not sid and _stage_map:
        # Fall back to first stage
        sid = list(_stage_map.values())[0]
    return sid


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upsert_contact(user: dict) -> Optional[str]:
    """
    Create or update a GHL contact from a user dict.
    Returns the GHL contact ID (or None on failure).
    """
    if not ENABLED:
        logger.info(f"[GHL MOCK] upsert_contact: {user.get('mobile')}")
        return None

    mobile = user.get("mobile", "")
    # Normalise to E.164
    if mobile and not mobile.startswith("+"):
        mobile = "+91" + mobile.lstrip("0")

    # Search for existing contact by phone
    existing = _get("/contacts/search", {
        "locationId": GHL_LOCATION_ID,
        "query": mobile,
    })
    contacts = (existing or {}).get("contacts", [])
    contact_id = contacts[0]["id"] if contacts else None

    tags = ["saral-funding-app"]
    if user.get("gender") == "Female":
        tags.append("woman-entrepreneur")
    if user.get("category") in ("SC", "ST"):
        tags.append(user["category"].lower())

    payload = {
        "locationId": GHL_LOCATION_ID,
        "phone":      mobile,
        "firstName":  (user.get("full_name") or "").split()[0] if user.get("full_name") else "",
        "lastName":   " ".join((user.get("full_name") or "").split()[1:]) or "",
        "name":       user.get("full_name") or mobile,
        "tags":       tags,
        "customFields": [
            {"key": "state",    "field_value": user.get("state", "")},
            {"key": "district", "field_value": user.get("district", "")},
            {"key": "gender",   "field_value": user.get("gender", "")},
            {"key": "category", "field_value": user.get("category", "")},
            {"key": "app_user_id", "field_value": user.get("id", "")},
        ],
    }

    if contact_id:
        result = _put(f"/contacts/{contact_id}", payload)
        logger.info(f"GHL contact updated: {contact_id}")
        return contact_id
    else:
        result = _post("/contacts/", payload)
        new_id = (result or {}).get("contact", {}).get("id")
        logger.info(f"GHL contact created: {new_id}")
        return new_id


def add_document_note(contact_id: str, doc_type: str, status: str, user_name: str = "") -> None:
    """Add a note to a GHL contact when a document is uploaded or verified."""
    if not contact_id:
        return
    body = f"📄 Document Update — {doc_type}\nStatus: {status.upper()}\nUser: {user_name}"
    _post(f"/contacts/{contact_id}/notes", {
        "userId":    contact_id,
        "body":      body,
    })


def create_opportunity(contact_id: str, user: dict, consultation_type: str = "", funding_required: int = 0) -> Optional[str]:
    """
    Create a GHL opportunity (lead) linked to a contact.
    Returns the opportunity ID or None.
    """
    _load_pipeline()
    if not _pipeline_id or not contact_id:
        return None

    stage_id = _ghl_stage_id("new")
    name = f"{user.get('full_name') or user.get('mobile', 'Lead')} — {consultation_type or 'Funding'}"

    result = _post("/opportunities/", {
        "pipelineId": _pipeline_id,
        "locationId": GHL_LOCATION_ID,
        "name":        name,
        "pipelineStageId": stage_id,
        "contactId":  contact_id,
        "monetaryValue": funding_required,
        "status":     "open",
    })
    opp_id = (result or {}).get("opportunity", {}).get("id")
    logger.info(f"GHL opportunity created: {opp_id}")
    return opp_id


def update_opportunity_stage(opportunity_id: str, our_stage: str) -> None:
    """Move a GHL opportunity to the stage matching our lead stage."""
    if not opportunity_id:
        return
    stage_id = _ghl_stage_id(our_stage)
    if not stage_id:
        return
    status = "won" if our_stage in ("approved", "disbursed") else "lost" if our_stage == "closed" else "open"
    _put(f"/opportunities/{opportunity_id}", {
        "pipelineStageId": stage_id,
        "status": status,
    })
    logger.info(f"GHL opportunity {opportunity_id} moved to stage '{our_stage}'")
