from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, io, csv, logging, uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from schemes_seed import SCHEMES_SEED
from banks_seed import BANKS_SEED
from ai_service import advisor_chat, match_schemes_with_llm, advisor_structured
from bank_service import recommend_banks
from readiness_service import compute_readiness
from alerts_service import evaluate_alerts
from analytics_service import compute_overview, popular_schemes, state_distribution, consultation_status, lead_pipeline, daily_user_trend, consultation_trend
from auth_service import send_otp as twilio_send_otp, verify_otp as twilio_verify_otp, is_enabled as firebase_enabled

# ---- DB ----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Saral Funding API", version="1.0.0")
api_router = APIRouter(prefix="/api")


# ---- helpers ----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


ROLES = ["user", "super_admin", "manager", "expert", "sales_executive", "support_executive"]
ADMIN_ROLES = {"super_admin", "manager", "expert", "sales_executive", "support_executive"}
LEAD_STAGES = ["new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"]
CONSULTATION_STATUSES = ["new", "called", "follow_up", "interested", "submitted", "approved", "closed"]


# ---- models ----
class OtpRequest(BaseModel):
    mobile: str
    language: Optional[str] = "en"


class OtpVerify(BaseModel):
    mobile: str
    code: str
    language: Optional[str] = "en"


class FirebaseVerify(BaseModel):
    id_token: str
    language: Optional[str] = "en"


class UserOut(BaseModel):
    id: str
    mobile: str
    language: str
    full_name: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    category: Optional[str] = None
    onboarding_step: str = "profile"
    role: str = "user"


class ProfileIn(BaseModel):
    full_name: str
    state: str
    district: str
    gender: str
    age: int
    category: str


class BusinessProfileIn(BaseModel):
    business_stage: str
    industry: str
    funding_required: int
    annual_turnover: int
    employees: int
    gst_available: bool
    udyam_available: bool


class AssessmentIn(BaseModel):
    business_type: str
    funding_requirement: int
    business_location: str
    existing_business: bool
    woman_entrepreneur: bool
    gst_registration: bool
    udyam_registration: bool
    existing_loans: bool


class ConsultationIn(BaseModel):
    consultation_type: str
    date: str
    time_slot: str
    notes: Optional[str] = ""


class AdvisorMessageIn(BaseModel):
    message: str
    language: Optional[str] = "en"


class AdvisorStructuredIn(BaseModel):
    query: str
    language: Optional[str] = "en"


class LeadUpdate(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    follow_up_date: Optional[str] = None


class ConsultationStatusUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class AdminSchemeIn(BaseModel):
    id: Optional[str] = None
    name: str
    full_name: Optional[str] = ""
    description: str
    eligibility: List[str] = []
    benefits: List[str] = []
    max_funding: int = 0
    max_subsidy_percent: int = 0
    documents: List[str] = []
    process: str = ""
    categories: List[str] = []
    states: List[str] = ["All India"]
    tags: List[str] = []
    disabled: bool = False


class NotificationCreate(BaseModel):
    title: str
    body: str
    type: str = "platform"
    target_user_ids: Optional[List[str]] = None  # None = broadcast
    schedule_at: Optional[str] = None


class RoleUpdate(BaseModel):
    role: str


class PushTokenIn(BaseModel):
    token: str


# ---- auth dep ----
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.replace("Bearer ", "").strip()
    user = await db.users.find_one({"id": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


async def require_admin(user=Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin only")
    return user


async def require_super_admin(user=Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin only")
    return user


# ===========================================================================
# ROOT + AUTH
# ===========================================================================
@api_router.get("/")
async def root():
    return {"message": "Saral Funding API", "version": "1.0.0", "firebase": firebase_enabled()}


@api_router.post("/auth/send-otp")
async def send_otp(req: OtpRequest):
    if not req.mobile or len(req.mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")
    # Normalize to E.164 — add +91 if not already prefixed
    mobile = req.mobile.strip()
    if not mobile.startswith("+"):
        mobile = "+91" + mobile.lstrip("0")
    try:
        result = twilio_send_otp(mobile)
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))


async def _create_or_get_user(mobile: str, language: str) -> Dict[str, Any]:
    user = await db.users.find_one({"mobile": mobile}, {"_id": 0})
    if user:
        await db.users.update_one({"id": user["id"]}, {"$set": {"language": language, "updated_at": now_iso()}})
        user["language"] = language
        return user
    user = {
        "id": str(uuid.uuid4()), "mobile": mobile, "language": language,
        "full_name": None, "state": None, "district": None, "gender": None,
        "age": None, "category": None, "onboarding_step": "profile",
        "role": "user", "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.users.insert_one(user.copy())
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "title": "Welcome to Saral Funding",
        "body": "Complete your profile to see funding schemes you're eligible for.",
        "type": "platform", "read": False, "created_at": now_iso(),
    })
    return user


@api_router.post("/auth/verify-otp")
async def verify_otp(req: OtpVerify):
    mobile = req.mobile.strip()
    if not mobile.startswith("+"):
        mobile = "+91" + mobile.lstrip("0")
    approved = twilio_verify_otp(mobile, req.code)
    if not approved:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")
    user = await _create_or_get_user(req.mobile, req.language or "en")
    return {"token": user["id"], "user": UserOut(**user).dict()}


@api_router.post("/auth/firebase-verify")
async def firebase_verify(req: FirebaseVerify):
    decoded = verify_firebase_id_token(req.id_token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid Firebase id_token")
    phone = decoded.get("phone_number")
    if not phone:
        raise HTTPException(status_code=400, detail="No phone_number claim in token")
    raw_phone = phone.strip()
    digits = "".join(ch for ch in raw_phone if ch.isdigit())
    # If starts with country code 91, strip it
    if digits.startswith("91") and len(digits) > 10:
        digits = digits[2:]
    mobile = digits[-10:]
    user = await _create_or_get_user(mobile, req.language or "en")
    return {"token": user["id"], "user": UserOut(**user).dict()}


@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return UserOut(**user).dict()


# ===========================================================================
# ONBOARDING
# ===========================================================================
@api_router.post("/profile")
async def save_profile(body: ProfileIn, user=Depends(get_current_user)):
    update = body.dict()
    update["onboarding_step"] = "business"
    update["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserOut(**updated).dict()


@api_router.post("/business-profile")
async def save_business(body: BusinessProfileIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc["user_id"] = user["id"]; doc["updated_at"] = now_iso()
    await db.business_profiles.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_step": "assessment"}})
    return {"ok": True, "business_profile": doc}


@api_router.get("/business-profile")
async def get_business(user=Depends(get_current_user)):
    return await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}


@api_router.post("/funding-assessment")
async def save_assessment(body: AssessmentIn, user=Depends(get_current_user)):
    doc = body.dict()
    doc["user_id"] = user["id"]; doc["updated_at"] = now_iso()
    await db.funding_assessments.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_step": "done"}})
    await compute_and_store_matches(user["id"])
    return {"ok": True}


@api_router.get("/funding-assessment")
async def get_assessment(user=Depends(get_current_user)):
    return await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}


# ===========================================================================
# SCHEMES + MATCHING
# ===========================================================================
@api_router.get("/schemes")
async def list_schemes(category: Optional[str] = None, q: Optional[str] = None, state: Optional[str] = None):
    query: Dict[str, Any] = {"disabled": {"$ne": True}}
    ands: List[Dict[str, Any]] = []
    if category and category.lower() != "all":
        ands.append({"categories": category})
    if state and state.lower() != "all":
        ands.append({"$or": [{"states": "All India"}, {"states": state}]})
    if q:
        ands.append({"$or": [{"name": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]})
    if ands:
        query["$and"] = ands
    schemes = await db.schemes.find(query, {"_id": 0}).to_list(200)
    return schemes


@api_router.get("/schemes/{scheme_id}")
async def get_scheme(scheme_id: str):
    s = await db.schemes.find_one({"id": scheme_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return s


async def compute_and_store_matches(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    bp = await db.business_profiles.find_one({"user_id": user_id}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user_id}, {"_id": 0}) or {}
    schemes = await db.schemes.find({"disabled": {"$ne": True}}, {"_id": 0}).to_list(200)
    matches = await match_schemes_with_llm(user or {}, bp, fa, schemes)
    doc = {"user_id": user_id, "matches": matches, "computed_at": now_iso()}
    await db.scheme_matches.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return doc


@api_router.get("/match/me")
async def get_my_matches(user=Depends(get_current_user)):
    m = await db.scheme_matches.find_one({"user_id": user["id"]}, {"_id": 0})
    if not m:
        m = await compute_and_store_matches(user["id"])
    matches: List[Dict[str, Any]] = m.get("matches", [])
    funding_estimate = sum(int(x.get("funding_estimate", 0) or 0) for x in matches[:5])
    subsidy_estimate = sum(int(x.get("subsidy_estimate", 0) or 0) for x in matches[:5])

    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    readiness = compute_readiness(user, bp, fa)

    return {
        "matches": matches,
        "funding_estimate": funding_estimate,
        "subsidy_estimate": subsidy_estimate,
        "readiness_score": readiness["score"],
        "computed_at": m.get("computed_at"),
    }


@api_router.post("/match/recompute")
async def recompute(user=Depends(get_current_user)):
    return await compute_and_store_matches(user["id"])


# ===========================================================================
# BANKS
# ===========================================================================
@api_router.get("/banks")
async def list_banks():
    return await db.banks.find({}, {"_id": 0}).to_list(50)


@api_router.get("/banks/{bank_id}")
async def get_bank(bank_id: str):
    b = await db.banks.find_one({"id": bank_id}, {"_id": 0})
    if not b:
        raise HTTPException(status_code=404, detail="Bank not found")
    return b


@api_router.get("/banks/recommend/me")
async def recommend_my_banks(user=Depends(get_current_user)):
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    banks = await db.banks.find({}, {"_id": 0}).to_list(50)
    return {"recommendations": recommend_banks(banks, user, bp, fa, limit=5)}


@api_router.post("/banks/compare")
async def compare_banks(body: Dict[str, List[str]]):
    ids = body.get("ids", [])
    items = await db.banks.find({"id": {"$in": ids}}, {"_id": 0}).to_list(20)
    return {"banks": items}


# ===========================================================================
# READINESS + ALERTS
# ===========================================================================
@api_router.get("/readiness/me")
async def my_readiness(user=Depends(get_current_user)):
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    return compute_readiness(user, bp, fa)


@api_router.post("/alerts/evaluate")
async def evaluate_my_alerts(user=Depends(get_current_user)):
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    m = await db.scheme_matches.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    consultations = await db.consultations.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)
    candidates = evaluate_alerts(user, bp, fa, m.get("matches", []), consultations)
    # dedupe by key
    existing_keys = set([n.get("key") for n in await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)])
    inserted = []
    for a in candidates:
        if a.get("key") in existing_keys:
            continue
        await db.notifications.insert_one(a.copy())
        a.pop("_id", None)
        inserted.append(a)
    return {"new_alerts": inserted}


# ===========================================================================
# ADVISOR
# ===========================================================================
@api_router.post("/advisor/chat")
async def advisor_chat_endpoint(body: AdvisorMessageIn, user=Depends(get_current_user)):
    history_doc = await db.ai_conversations.find_one({"user_id": user["id"]}, {"_id": 0})
    history = history_doc.get("messages", []) if history_doc else []
    schemes = await db.schemes.find({"disabled": {"$ne": True}}, {"_id": 0}).to_list(200)
    banks = await db.banks.find({}, {"_id": 0}).to_list(50)
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    reply = await advisor_chat(
        user_id=user["id"], user_profile=user, business_profile=bp, assessment=fa,
        schemes=schemes, banks=banks, message=body.message,
        language=body.language or user.get("language", "en"), history=history,
    )
    new_history = history + [
        {"role": "user", "content": body.message, "ts": now_iso()},
        {"role": "assistant", "content": reply, "ts": now_iso()},
    ]
    await db.ai_conversations.update_one(
        {"user_id": user["id"]},
        {"$set": {"user_id": user["id"], "messages": new_history, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"reply": reply, "messages": new_history}


@api_router.post("/advisor/structured")
async def advisor_structured_endpoint(body: AdvisorStructuredIn, user=Depends(get_current_user)):
    bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    schemes = await db.schemes.find({"disabled": {"$ne": True}}, {"_id": 0}).to_list(200)
    banks = await db.banks.find({}, {"_id": 0}).to_list(50)
    m = await db.scheme_matches.find_one({"user_id": user["id"]}, {"_id": 0})
    matches = m.get("matches", []) if m else []
    bank_recs = recommend_banks(banks, user, bp, fa, limit=5)
    result = await advisor_structured(
        user_profile=user, business_profile=bp, assessment=fa,
        matches=matches, banks_recommended=bank_recs,
        schemes=schemes, banks=banks,
        user_query=body.query, language=body.language or user.get("language", "en"),
    )
    return result


@api_router.get("/advisor/history")
async def advisor_history(user=Depends(get_current_user)):
    doc = await db.ai_conversations.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"messages": doc.get("messages", []) if doc else []}


@api_router.delete("/advisor/history")
async def advisor_clear(user=Depends(get_current_user)):
    await db.ai_conversations.delete_one({"user_id": user["id"]})
    return {"ok": True}


# ===========================================================================
# CONSULTATIONS + CRM LEADS
# ===========================================================================
@api_router.post("/consultations")
async def book_consultation(body: ConsultationIn, user=Depends(get_current_user)):
    cid = str(uuid.uuid4())
    doc = body.dict()
    doc.update({
        "id": cid, "user_id": user["id"],
        "status": "new", "assigned_to": None, "notes": doc.get("notes", ""),
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    await db.consultations.insert_one(doc.copy())

    # auto-create lead
    lead = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "consultation_id": cid,
        "source": "consultation",
        "stage": "new",
        "consultation_type": doc["consultation_type"],
        "funding_required": (await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}).get("funding_required", 0),
        "state": user.get("state"),
        "mobile": user.get("mobile"),
        "full_name": user.get("full_name"),
        "assigned_to": None,
        "notes": "",
        "follow_up_date": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.leads.insert_one(lead.copy())

    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"],
        "title": "Consultation Booked",
        "body": f"Your {doc['consultation_type']} on {doc['date']} at {doc['time_slot']} is booked. Our advisor will reach out soon.",
        "type": "reminder", "read": False, "created_at": now_iso(),
    })
    doc.pop("_id", None)
    return doc


@api_router.get("/consultations/me")
async def my_consultations(user=Depends(get_current_user)):
    return await db.consultations.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


# ===========================================================================
# NOTIFICATIONS
# ===========================================================================
@api_router.post("/notifications/push-token")
async def register_push_token(body: PushTokenIn, user=Depends(get_current_user)):
    """Save Expo push token for this user so we can send them notifications."""
    await db.users.update_one({"id": user["id"]}, {"$set": {"push_token": body.token}})
    return {"success": True}


@api_router.get("/notifications/me")
async def my_notifications(user=Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/language")
async def update_language(body: Dict[str, Any], user=Depends(get_current_user)):
    lang = body.get("language", "en")
    await db.users.update_one({"id": user["id"]}, {"$set": {"language": lang}})
    return {"ok": True, "language": lang}


# ===========================================================================
# ADMIN — all under /admin/*
# ===========================================================================
@api_router.get("/admin/overview")
async def admin_overview(admin=Depends(require_admin)):
    return await compute_overview(db)


@api_router.get("/admin/users")
async def admin_list_users(
    q: Optional[str] = None, state: Optional[str] = None, role: Optional[str] = None,
    page: int = 1, limit: int = Query(default=50, le=200),
    admin=Depends(require_admin)
):
    query: Dict[str, Any] = {}
    if role: query["role"] = role
    if state: query["state"] = state
    if q: query["$or"] = [{"full_name": {"$regex": q, "$options": "i"}}, {"mobile": {"$regex": q, "$options": "i"}}]
    skip = (max(page, 1) - 1) * limit
    total = await db.users.count_documents(query)
    users = await db.users.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return {"items": users, "total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit)}


@api_router.get("/admin/users/{uid}")
async def admin_user_detail(uid: str, admin=Depends(require_admin)):
    user = await db.users.find_one({"id": uid}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    bp = await db.business_profiles.find_one({"user_id": uid}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": uid}, {"_id": 0}) or {}
    m = await db.scheme_matches.find_one({"user_id": uid}, {"_id": 0}) or {}
    return {"user": user, "business_profile": bp, "assessment": fa, "matches": m.get("matches", [])}


@api_router.post("/admin/users/{uid}/role")
async def admin_update_role(uid: str, body: RoleUpdate, admin=Depends(require_super_admin)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"id": uid}, {"$set": {"role": body.role}})
    return {"ok": True}


class TeamInvite(BaseModel):
    mobile: str
    full_name: str
    role: str


@api_router.get("/admin/team")
async def admin_list_team(admin=Depends(require_super_admin)):
    """Return all users with an admin role."""
    team = await db.users.find(
        {"role": {"$in": list(ADMIN_ROLES)}},
        {"_id": 0, "id": 1, "mobile": 1, "full_name": 1, "role": 1, "created_at": 1}
    ).to_list(200)
    return team


@api_router.post("/admin/team/invite")
async def admin_invite_team(body: TeamInvite, admin=Depends(require_super_admin)):
    """Create or update a user with an admin role.
    If the mobile already exists, just updates their role and name.
    If not, creates a new account they can log in to via OTP."""
    if body.role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Invalid admin role")

    mobile = body.mobile.strip()
    if not mobile.startswith("+"):
        mobile = "+91" + mobile.lstrip("0")

    existing = await db.users.find_one({"mobile": mobile})
    if existing:
        await db.users.update_one(
            {"mobile": mobile},
            {"$set": {"role": body.role, "full_name": body.full_name, "updated_at": now_iso()}}
        )
        return {"ok": True, "action": "updated", "id": existing["id"]}

    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "mobile": mobile,
        "full_name": body.full_name,
        "role": body.role,
        "language": "en",
        "onboarding_step": "complete",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return {"ok": True, "action": "created", "id": uid}


@api_router.get("/admin/schemes")
async def admin_list_schemes(admin=Depends(require_admin)):
    return await db.schemes.find({}, {"_id": 0}).to_list(500)


@api_router.post("/admin/schemes")
async def admin_create_scheme(body: AdminSchemeIn, admin=Depends(require_admin)):
    sid = body.id or body.name.lower().replace(" ", "-")
    doc = body.dict(); doc["id"] = sid; doc["updated_at"] = now_iso()
    await db.schemes.update_one({"id": sid}, {"$set": doc}, upsert=True)
    return doc


@api_router.post("/admin/schemes/{sid}/disable")
async def admin_disable_scheme(sid: str, admin=Depends(require_admin)):
    await db.schemes.update_one({"id": sid}, {"$set": {"disabled": True}})
    return {"ok": True}


@api_router.post("/admin/schemes/{sid}/enable")
async def admin_enable_scheme(sid: str, admin=Depends(require_admin)):
    await db.schemes.update_one({"id": sid}, {"$set": {"disabled": False}})
    return {"ok": True}


@api_router.delete("/admin/schemes/{sid}")
async def admin_delete_scheme(sid: str, admin=Depends(require_super_admin)):
    await db.schemes.delete_one({"id": sid})
    return {"ok": True}


@api_router.get("/admin/consultations")
async def admin_list_consultations(status: Optional[str] = None, limit: int = 200, admin=Depends(require_admin)):
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    items = await db.consultations.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # enrich with user info
    user_ids = list({i["user_id"] for i in items})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "full_name": 1, "mobile": 1, "state": 1}).to_list(500)
    by_id = {u["id"]: u for u in users}
    for it in items:
        it["user"] = by_id.get(it["user_id"], {})
    return items


@api_router.post("/admin/consultations/{cid}")
async def admin_update_consultation(cid: str, body: ConsultationStatusUpdate, admin=Depends(require_admin)):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = now_iso()
    if "status" in update and update["status"] not in CONSULTATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    await db.consultations.update_one({"id": cid}, {"$set": update})
    # mirror lead stage if status mapped
    map_status_to_stage = {"new": "new", "called": "contacted", "follow_up": "contacted", "interested": "interested", "submitted": "submitted", "approved": "approved", "closed": "closed"}
    if "status" in update and update["status"] in map_status_to_stage:
        await db.leads.update_one({"consultation_id": cid}, {"$set": {"stage": map_status_to_stage[update["status"]], "updated_at": now_iso()}})
    return {"ok": True}


@api_router.get("/admin/leads")
async def admin_list_leads(
    stage: Optional[str] = None, q: Optional[str] = None, assigned_to: Optional[str] = None,
    page: int = 1, limit: int = Query(default=50, le=200),
    admin=Depends(require_admin)
):
    query: Dict[str, Any] = {}
    if stage: query["stage"] = stage
    if assigned_to: query["assigned_to"] = assigned_to
    if q: query["$or"] = [{"full_name": {"$regex": q, "$options": "i"}}, {"mobile": {"$regex": q, "$options": "i"}}]
    skip = (max(page, 1) - 1) * limit
    items = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    return items  # return flat array for backwards compatibility with frontend


@api_router.get("/admin/leads/{lid}")
async def admin_get_lead(lid: str, admin=Depends(require_admin)):
    lead = await db.leads.find_one({"id": lid}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    # Enrich with user + business profile + consultations
    uid = lead.get("user_id")
    user = await db.users.find_one({"id": uid}, {"_id": 0}) or {}
    bp = await db.business_profiles.find_one({"user_id": uid}, {"_id": 0}) or {}
    fa = await db.funding_assessments.find_one({"user_id": uid}, {"_id": 0}) or {}
    matches = await db.scheme_matches.find_one({"user_id": uid}, {"_id": 0}) or {}
    consultations = await db.consultations.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {
        **lead,
        "user": user,
        "business_profile": bp,
        "assessment": fa,
        "scheme_matches": matches.get("matches", []),
        "consultations": consultations,
    }


@api_router.post("/admin/leads/{lid}")
async def admin_update_lead(lid: str, body: LeadUpdate, admin=Depends(require_admin)):
    lead = await db.leads.find_one({"id": lid}, {"_id": 0, "stage": 1, "activity_log": 1})
    update = {k: v for k, v in body.dict().items() if v is not None}
    if "stage" in update and update["stage"] not in LEAD_STAGES:
        raise HTTPException(status_code=400, detail="Invalid lead stage")
    update["updated_at"] = now_iso()

    # Build activity log entry
    activity_entry: Dict[str, Any] = {
        "ts": now_iso(),
        "actor": admin.get("full_name") or admin.get("mobile", "Admin"),
        "actor_id": admin.get("id"),
    }
    if "stage" in update and lead and lead.get("stage") != update["stage"]:
        activity_entry["action"] = "stage_changed"
        activity_entry["note"] = f"Stage changed from {lead.get('stage')} to {update['stage']}"
    elif "notes" in update:
        activity_entry["action"] = "note_added"
        activity_entry["note"] = update["notes"]
    elif "assigned_to" in update:
        activity_entry["action"] = "assigned"
        activity_entry["note"] = f"Assigned to {update['assigned_to']}"
    elif "follow_up_date" in update:
        activity_entry["action"] = "follow_up_set"
        activity_entry["note"] = f"Follow-up set for {update['follow_up_date']}"
    else:
        activity_entry["action"] = "updated"
        activity_entry["note"] = "Lead updated"

    await db.leads.update_one(
        {"id": lid},
        {
            "$set": update,
            "$push": {"activity_log": {"$each": [activity_entry], "$slice": -50}},
        }
    )
    return {"ok": True}


@api_router.get("/admin/config")
async def admin_get_config(admin=Depends(require_admin)):
    cfg = await db.admin_config.find_one({}, {"_id": 0}) or {}
    return cfg


@api_router.post("/admin/config")
async def admin_update_config(body: dict, admin=Depends(require_super_admin)):
    allowed = {"calendly_url", "whatsapp_number", "consultation_duration_min"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = now_iso()
    await db.admin_config.update_one({}, {"$set": update}, upsert=True)
    return {"ok": True}


@api_router.post("/admin/notifications")
async def admin_send_notification(body: NotificationCreate, admin=Depends(require_admin)):
    targets = body.target_user_ids
    if not targets:
        users = await db.users.find({"role": "user"}, {"_id": 0, "id": 1}).to_list(10000)
        targets = [u["id"] for u in users]
    docs = [{
        "id": str(uuid.uuid4()), "user_id": uid,
        "title": body.title, "body": body.body, "type": body.type,
        "read": False, "created_at": now_iso(),
    } for uid in targets]
    if docs:
        await db.notifications.insert_many([d.copy() for d in docs])
    return {"sent": len(docs)}


@api_router.get("/admin/analytics")
async def admin_analytics(admin=Depends(require_admin)):
    return {
        "popular_schemes": await popular_schemes(db),
        "state_distribution": await state_distribution(db),
        "consultation_status": await consultation_status(db),
        "lead_pipeline": await lead_pipeline(db),
        "daily_user_trend": await daily_user_trend(db),
        "consultation_trend": await consultation_trend(db),
    }


# ----- CSV Exports -----
def _csv_response(rows: List[Dict[str, Any]], filename: str) -> Response:
    if not rows:
        rows = [{}]
    fields = sorted({k for r in rows for k in r.keys()})
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields)
    w.writeheader()
    for r in rows:
        w.writerow({k: (",".join(map(str, v)) if isinstance(v, list) else v) for k, v in r.items()})
    return Response(content=buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@api_router.get("/admin/exports/users.csv")
async def export_users(admin=Depends(require_admin)):
    rows = await db.users.find({}, {"_id": 0}).to_list(50000)
    return _csv_response(rows, "saral-users.csv")


@api_router.get("/admin/exports/leads.csv")
async def export_leads(admin=Depends(require_admin)):
    rows = await db.leads.find({}, {"_id": 0}).to_list(50000)
    return _csv_response(rows, "saral-leads.csv")


@api_router.get("/admin/exports/consultations.csv")
async def export_consultations(admin=Depends(require_admin)):
    rows = await db.consultations.find({}, {"_id": 0}).to_list(50000)
    return _csv_response(rows, "saral-consultations.csv")


@api_router.get("/admin/exports/schemes.csv")
async def export_schemes(admin=Depends(require_admin)):
    rows = await db.schemes.find({}, {"_id": 0}).to_list(50000)
    return _csv_response(rows, "saral-schemes.csv")


# ===========================================================================
# STARTUP
# ===========================================================================
async def _ensure_indexes():
    """Create MongoDB indexes for all hot-path queries. Idempotent."""
    try:
        # users — looked up by mobile (auth) and id (every authenticated request)
        await db.users.create_index("mobile", unique=True, background=True)
        await db.users.create_index("id", unique=True, background=True)
        await db.users.create_index([("role", 1), ("state", 1)], background=True)

        # business_profiles — joined on every advisor/match call
        await db.business_profiles.create_index("user_id", unique=True, background=True)

        # funding_assessments — joined on every match/readiness call
        await db.funding_assessments.create_index("user_id", unique=True, background=True)

        # scheme_matches — fetched on dashboard load
        await db.scheme_matches.create_index("user_id", unique=True, background=True)

        # consultations — user inbox + admin list
        await db.consultations.create_index("user_id", background=True)
        await db.consultations.create_index([("status", 1), ("created_at", -1)], background=True)

        # leads — CRM pipeline queries
        await db.leads.create_index("user_id", background=True)
        await db.leads.create_index([("stage", 1), ("created_at", -1)], background=True)
        await db.leads.create_index("assigned_to", background=True)

        # notifications — user inbox (unread filter)
        await db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)], background=True)

        # ai_conversations — chat history lookup
        await db.ai_conversations.create_index("user_id", unique=True, background=True)

        logging.info("MongoDB indexes ensured")
    except Exception as e:
        logging.warning(f"Index creation warning (non-fatal): {e}")


@app.on_event("startup")
async def seed_db():
    # Ensure indexes first (non-blocking, background=True)
    await _ensure_indexes()

    if await db.schemes.count_documents({}) == 0:
        for s in SCHEMES_SEED:
            s = {**s, "disabled": False}
            await db.schemes.insert_one(s)
        logging.info(f"Seeded {len(SCHEMES_SEED)} schemes")
    if await db.banks.count_documents({}) == 0:
        for b in BANKS_SEED:
            await db.banks.insert_one(b.copy())
        logging.info(f"Seeded {len(BANKS_SEED)} banks")
    # seed super admin (idempotent)
    admin_mobile = "9000000000"
    existing_admin = await db.users.find_one({"mobile": admin_mobile})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "mobile": admin_mobile, "language": "en",
            "full_name": "Super Admin", "state": "Gujarat", "district": "Surat",
            "gender": "Male", "age": 30, "category": "General",
            "onboarding_step": "done", "role": "super_admin",
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        logging.info(f"Seeded super admin (mobile={admin_mobile}, OTP=123456)")
    else:
        # ensure role is super_admin
        await db.users.update_one({"mobile": admin_mobile}, {"$set": {"role": "super_admin"}})



# ── Setu Account Aggregator ─────────────────────────────────────────────────

from setu_service import create_consent, get_consent_status, fetch_fi_data, extract_financial_profile, enrich_business_profile_from_aa
from azure_storage import upload_to_azure, delete_from_azure, get_sas_url
from notifications_service import send_push_to_user, send_push


class SetuConsentIn(BaseModel):
    mobile: str


@api_router.post("/setu/aa/consent")
async def setu_create_consent(body: SetuConsentIn, user=Depends(get_current_user)):
    uid = user["id"]
    try:
        result = await create_consent(body.mobile, uid)
        await db.users.update_one({"id": uid}, {"$set": {"aa_consent_id": result["consent_id"], "aa_status": "PENDING"}})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/setu/aa/consent/{consent_id}/status")
async def setu_consent_status(consent_id: str, user=Depends(get_current_user)):
    uid = user["id"]
    try:
        result = await get_consent_status(consent_id)
        if result["status"] == "ACTIVE":
            await db.users.update_one({"id": uid}, {"$set": {"aa_status": "ACTIVE"}})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/setu/aa/data/{consent_id}")
async def setu_fetch_data(consent_id: str, user=Depends(get_current_user)):
    uid = user["id"]
    try:
        fi_data = await fetch_fi_data(consent_id)
        fp = extract_financial_profile(fi_data)
        bp_doc = await db.business_profiles.find_one({"user_id": uid}) or {}
        enriched = enrich_business_profile_from_aa(bp_doc, fp)
        await db.business_profiles.update_one({"user_id": uid}, {"$set": enriched}, upsert=True)
        return {"financial_profile": fp, "updated": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/setu/aa/status")
async def setu_aa_status(user=Depends(get_current_user)):
    uid = user["id"]
    u = await db.users.find_one({"id": uid})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "aa_linked": u.get("aa_status") == "ACTIVE",
        "aa_status": u.get("aa_status"),
        "aa_consent_id": u.get("aa_consent_id"),
    }


# ── Document endpoints ────────────────────────────────────────────────────────

class DocumentStatusIn(BaseModel):
    status: str  # "verified" | "rejected"

class AdminRecommendationIn(BaseModel):
    schemes: List[str] = []
    banks: List[str] = []
    note: Optional[str] = ""


@api_router.post("/documents/upload")
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    file_bytes = await file.read()

    # Validate size: max 10 MB
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    result = await upload_to_azure(file_bytes, doc_type, user["id"], file.filename or "upload")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "doc_type": doc_type,
        "status": "pending",
        "created_at": now_iso(),
        "file_name": file.filename or (doc_type.replace(" ", "_").lower() + ".pdf"),
        "blob_name": result["blob_name"],
        "blob_url": result["blob_url"],  # private URL, not for direct client use
    }
    await db.documents.insert_one({**doc, "_id": doc["id"]})
    # Never expose blob_name to the frontend
    return {k: v for k, v in doc.items() if k not in ("blob_name", "blob_url")}


@api_router.get("/documents/me")
async def list_my_documents(user=Depends(get_current_user)):
    docs = await db.documents.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return docs


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending documents can be deleted")
    # Also remove the blob from Azure if present
    if doc.get("blob_name"):
        await delete_from_azure(doc["blob_name"])
    await db.documents.delete_one({"id": doc_id})
    return {"ok": True}


@api_router.get("/documents/{doc_id}/download")
async def get_document_download_url(doc_id: str, user=Depends(get_current_user)):
    """Return a short-lived SAS URL so the user can download their own document."""
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("blob_name"):
        raise HTTPException(status_code=404, detail="No file attached to this document")
    sas_url = get_sas_url(doc["blob_name"])
    return {"url": sas_url, "expires_in": 3600}


@api_router.get("/admin/users/{user_id}/documents")
async def admin_list_user_documents(user_id: str, admin=Depends(require_admin)):
    docs = await db.documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.post("/admin/documents/{doc_id}/status")
async def admin_update_doc_status(doc_id: str, payload: DocumentStatusIn, admin=Depends(require_admin)):
    if payload.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="status must be verified or rejected")
    result = await db.documents.find_one_and_update(
        {"id": doc_id},
        {"$set": {"status": payload.status, "updated_at": now_iso()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    result.pop("_id", None)
    result.pop("blob_name", None)
    result.pop("blob_url", None)

    # Push notification to user
    doc_owner = await db.users.find_one({"id": result.get("user_id")})
    if doc_owner:
        if payload.status == "verified":
            send_push_to_user(doc_owner, "Document Verified ✅", f"Your {result.get('doc_type')} has been verified by our team.")
        else:
            send_push_to_user(doc_owner, "Document Rejected ❌", f"Your {result.get('doc_type')} was rejected. Please re-upload a clearer copy.")

    return result


@api_router.get("/admin/documents/{doc_id}/download")
async def admin_get_document_download_url(doc_id: str, admin=Depends(require_admin)):
    """Admin: return a short-lived SAS URL to download any user's document."""
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("blob_name"):
        raise HTTPException(status_code=404, detail="No file attached to this document")
    sas_url = get_sas_url(doc["blob_name"])
    return {"url": sas_url, "expires_in": 3600}


@api_router.post("/admin/users/{user_id}/recommendations")
async def save_admin_recommendations(user_id: str, payload: AdminRecommendationIn, admin=Depends(require_admin)):
    rec = {
        "user_id": user_id,
        "schemes": payload.schemes,
        "banks": payload.banks,
        "note": payload.note or "",
        "created_at": now_iso(),
    }
    await db.admin_recommendations.find_one_and_replace(
        {"user_id": user_id},
        {**rec, "_id": user_id},
        upsert=True,
    )

    # Push notification to user
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc:
        send_push_to_user(
            user_doc,
            "Your Funding Plan is Ready 🎉",
            "Our advisor has reviewed your profile and recommended the best schemes and banks for you.",
            {"screen": "funding-case"},
        )

    return rec


@api_router.get("/admin/users/{user_id}/recommendations")
async def get_admin_recommendations_for_user(user_id: str, admin=Depends(require_admin)):
    rec = await db.admin_recommendations.find_one({"user_id": user_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="No recommendations yet")
    return rec


@api_router.get("/recommendations/me")
async def get_my_recommendations(user=Depends(get_current_user)):
    rec = await db.admin_recommendations.find_one({"user_id": user["id"]}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="No recommendations yet")
    return rec


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
