from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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
from security import (
    create_token, verify_token,
    create_access_token, create_refresh_token,
    verify_refresh_token, hash_token,
    check_rate_limit,
    validate_upload,
    sanitise_mobile, sanitise_search,
)
from audit_service import log as audit_log, AuditAction, check_admin_abuse

# ---- DB ----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Saral Funding API", version="1.0.0", docs_url=None, redoc_url=None)
api_router = APIRouter(prefix="/api")


@app.get("/")
async def root():
    return {
        "service": "Saral Funding API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/health for full health check"
    }


@app.get("/health")
async def health_check():
    # Check MongoDB
    try:
        await db.command("ping")
        mongo_status = "connected"
        collections = await db.list_collection_names()
        counts = {
            "users": await db.users.count_documents({}),
            "schemes": await db.schemes.count_documents({}),
            "banks": await db.banks.count_documents({}),
            "leads": await db.leads.count_documents({}),
            "consultations": await db.consultations.count_documents({}),
        }
    except Exception as e:
        mongo_status = f"error: {str(e)}"
        collections = []
        counts = {}

    # Check optional services
    twilio_configured = bool(os.environ.get("TWILIO_ACCOUNT_SID"))
    openai_configured = bool(os.environ.get("OPENAI_API_KEY"))
    azure_configured = bool(os.environ.get("AZURE_STORAGE_CONNECTION_STRING"))
    ghl_configured = bool(os.environ.get("GHL_API_KEY"))
    setu_configured = bool(os.environ.get("SETU_CLIENT_ID"))

    return {
        "status": "ok" if mongo_status == "connected" else "degraded",
        "database": {
            "mongodb": mongo_status,
            "collections": len(collections),
            "counts": counts,
        },
        "services": {
            "twilio_otp": "configured" if twilio_configured else "mock_mode (OTP=123456)",
            "openai": "configured" if openai_configured else "not configured (fallback active)",
            "azure_storage": "configured" if azure_configured else "not configured",
            "ghl_crm": "configured" if ghl_configured else "not configured",
            "setu_aa": "configured" if setu_configured else "not configured",
        },
        "environment": os.environ.get("DB_NAME", "saral_funding"),
    }

# ---- Security middleware ----
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:8081,http://localhost:19006,exp://localhost:8081"
).split(",")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["*"],   # * kept for Expo Go / mobile clients
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ---- helpers ----
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_ip(request: Request) -> str:
    """Extract real client IP, respecting Cloudflare / reverse proxy headers."""
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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
    # Try JWT first, fall back to legacy UUID token for backwards compatibility
    user_id = verify_token(token)
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    else:
        # Legacy: token == user id (remove after all clients have updated)
        user = await db.users.find_one({"id": token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
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
async def send_otp(req: OtpRequest, request: Request):
    mobile = sanitise_mobile(req.mobile or "")
    if not mobile:
        raise HTTPException(status_code=400, detail="Invalid mobile number. Enter a valid 10-digit Indian number.")
    allowed, retry_after = check_rate_limit(f"otp_send:{mobile}", max_calls=5, window_seconds=600)
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Too many OTP requests. Try again in {retry_after} seconds.")
    try:
        result = twilio_send_otp(mobile)
        await audit_log(db, AuditAction.OTP_SEND, resource=mobile, ip=get_ip(request))
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
async def verify_otp(req: OtpVerify, request: Request):
    mobile = sanitise_mobile(req.mobile or "")
    if not mobile:
        raise HTTPException(status_code=400, detail="Invalid mobile number.")
    allowed, retry_after = check_rate_limit(f"otp_verify:{mobile}", max_calls=10, window_seconds=600)
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {retry_after} seconds.")
    approved = twilio_verify_otp(mobile, req.code)
    if not approved:
        await audit_log(db, AuditAction.OTP_VERIFY_FAIL, resource=mobile, ip=get_ip(request))
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")
    user = await _create_or_get_user(mobile, req.language or "en")

    access_token  = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])

    # Store only the hash of the refresh token — never the raw token
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"refresh_token_hash": hash_token(refresh_token), "updated_at": now_iso()}}
    )

    await audit_log(db, AuditAction.LOGIN, user_id=user["id"], role=user.get("role", "user"), ip=get_ip(request))
    return {
        "token":         access_token,
        "refresh_token": refresh_token,
        "user":          UserOut(**user).dict(),
    }


class RefreshRequest(BaseModel):
    refresh_token: str


@api_router.post("/auth/refresh")
async def refresh_token(req: RefreshRequest, request: Request):
    """Exchange a valid refresh token for a new access token + rotated refresh token."""
    payload = verify_refresh_token(req.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    user_id = payload["sub"]
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    # Verify the stored hash matches — prevents replay of old/stolen tokens
    stored_hash = user.get("refresh_token_hash")
    if not stored_hash or stored_hash != hash_token(req.refresh_token):
        raise HTTPException(status_code=401, detail="Refresh token has been revoked.")

    # Rotate: issue new pair, invalidate old refresh token
    new_access  = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"refresh_token_hash": hash_token(new_refresh), "updated_at": now_iso()}}
    )
    await audit_log(db, AuditAction.TOKEN_REFRESH, user_id=user_id, role=user.get("role"), ip=get_ip(request))
    return {"token": new_access, "refresh_token": new_refresh}


@api_router.post("/auth/logout")
async def logout(request: Request, user=Depends(get_current_user)):
    """Invalidate the refresh token — forces re-login on all devices."""
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"refresh_token_hash": ""}, "$set": {"updated_at": now_iso()}}
    )
    await audit_log(db, AuditAction.LOGIN + "_logout", user_id=user["id"],
                    role=user.get("role"), ip=get_ip(request))
    return {"ok": True}


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


@api_router.post("/auth/bootstrap-admin")
async def bootstrap_admin(user=Depends(get_current_user)):
    """Promote the calling user to super_admin IF no super_admin exists yet."""
    existing_admin = await db.users.find_one({"role": "super_admin"})
    if existing_admin and existing_admin["id"] != user["id"]:
        raise HTTPException(status_code=403, detail="A super_admin already exists. Use /admin/users/{uid}/role to manage roles.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"role": "super_admin"}})
    return {"message": "You are now super_admin", "user_id": user["id"]}


# ===========================================================================
# ONBOARDING
# ===========================================================================
@api_router.post("/profile")
async def save_profile(body: ProfileIn, request: Request, user=Depends(get_current_user)):
    update = body.dict()
    update["onboarding_step"] = "business"
    update["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    await audit_log(db, AuditAction.PROFILE_UPDATE, user_id=user["id"], role=user.get("role"), ip=get_ip(request))
    try:
        contact_id = upsert_contact({**user, **update})
        if contact_id:
            await db.users.update_one({"id": user["id"]}, {"$set": {"ghl_contact_id": contact_id}})
    except Exception as e:
        logging.warning(f"GHL sync failed for user {user['id']}: {e}")
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
        safe_q = sanitise_search(q)
        ands.append({"$or": [{"name": {"$regex": safe_q, "$options": "i"}}, {"description": {"$regex": safe_q, "$options": "i"}}]})
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

    # --- GHL opportunity ---
    try:
        bp = await db.business_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
        ghl_cid = user.get("ghl_contact_id")
        if not ghl_cid:
            ghl_cid = upsert_contact(user)
            if ghl_cid:
                await db.users.update_one({"id": user["id"]}, {"$set": {"ghl_contact_id": ghl_cid}})
        if ghl_cid:
            opp_id = create_opportunity(ghl_cid, user, doc["consultation_type"], bp.get("funding_required", 0))
            if opp_id:
                await db.leads.update_one({"consultation_id": cid}, {"$set": {"ghl_opportunity_id": opp_id}})
    except Exception as e:
        logging.warning(f"GHL opportunity creation failed: {e}")

    # --- push confirmation to the user ---
    send_push_to_user(
        user,
        "Consultation Booked ✅",
        f"Your {doc['consultation_type']} on {doc['date']} at {doc['time_slot']} is confirmed. We'll be in touch soon!",
        {"screen": "consultations"},
    )

    # --- notify all admin users via push ---
    admin_users = await db.users.find(
        {"role": {"$in": list(ADMIN_ROLES)}},
        {"_id": 0, "push_token": 1}
    ).to_list(200)
    admin_tokens = [u["push_token"] for u in admin_users if u.get("push_token")]
    if admin_tokens:
        user_name = user.get("full_name") or user.get("mobile", "Someone")
        send_push(
            admin_tokens,
            "New Consultation Booked 📅",
            f"{user_name} booked a {doc['consultation_type']} on {doc['date']} at {doc['time_slot']}.",
            {"screen": "admin-consultations", "consultation_id": cid},
        )

    # --- WhatsApp alert to team number ---
    cfg = await db.admin_config.find_one({}, {"_id": 0}) or {}
    team_wa = cfg.get("whatsapp_number")
    if team_wa:
        user_name = user.get("full_name") or user.get("mobile", "A user")
        user_mobile = user.get("mobile", "")
        send_whatsapp(
            team_wa,
            f"📅 *New Consultation Booked*\n"
            f"Name: {user_name}\n"
            f"Mobile: {user_mobile}\n"
            f"Type: {doc['consultation_type']}\n"
            f"Date: {doc['date']} at {doc['time_slot']}\n"
            f"Notes: {doc.get('notes') or '—'}"
        )

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
    if q:
        safe_q = sanitise_search(q)
        query["$or"] = [{"full_name": {"$regex": safe_q, "$options": "i"}}, {"mobile": {"$regex": safe_q, "$options": "i"}}]
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
async def admin_update_role(uid: str, body: RoleUpdate, request: Request, admin=Depends(require_super_admin)):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    prev = await db.users.find_one({"id": uid}, {"role": 1})
    await db.users.update_one({"id": uid}, {"$set": {"role": body.role}})
    await audit_log(db, AuditAction.ADMIN_ROLE_CHANGE, user_id=admin["id"], role=admin.get("role"),
                    resource=uid, ip=get_ip(request),
                    metadata={"from_role": (prev or {}).get("role"), "to_role": body.role, "target_user": uid})
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
    if q:
        safe_q = sanitise_search(q)
        query["$or"] = [{"full_name": {"$regex": safe_q, "$options": "i"}}, {"mobile": {"$regex": safe_q, "$options": "i"}}]
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

    # Sync stage change to GHL + audit log
    if "stage" in update:
        try:
            lead_full = await db.leads.find_one({"id": lid}, {"_id": 0, "ghl_opportunity_id": 1, "user_id": 1})
            opp_id = (lead_full or {}).get("ghl_opportunity_id")
            if opp_id:
                update_opportunity_stage(opp_id, update["stage"])
        except Exception as e:
            logging.warning(f"GHL stage sync failed for lead {lid}: {e}")
        await audit_log(db, AuditAction.LEAD_STAGE_CHANGE, user_id=admin["id"], role=admin.get("role"),
                        resource=lid, metadata={"stage": update["stage"], "lead_id": lid})

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
# SCHEME APPLICATIONS  (admin assigns schemes/banks to a user; user tracks)
# ===========================================================================

APPLICATION_STAGES = [
    "documents_submitted",
    "call_done",
    "scheme_identified",
    "application_filed",
    "under_review",
    "approved",
    "disbursed",
    "rejected",
]

STAGE_LABELS = {
    "documents_submitted": "Documents Submitted",
    "call_done":           "Call Done",
    "scheme_identified":   "Scheme Identified",
    "application_filed":   "Application Filed",
    "under_review":        "Under Review",
    "approved":            "Approved",
    "disbursed":           "Disbursed",
    "rejected":            "Rejected",
}


class AssignSchemeRequest(BaseModel):
    scheme_id:   str
    scheme_name: str
    bank_id:     Optional[str] = None
    bank_name:   Optional[str] = None
    notes:       Optional[str] = None


class UpdateAppStageRequest(BaseModel):
    stage: str
    note:  Optional[str] = None


@api_router.post("/admin/users/{uid}/scheme-applications")
async def admin_assign_scheme(uid: str, req: AssignSchemeRequest,
                               request: Request, admin=Depends(require_admin)):
    """Admin assigns a scheme (+ optional bank) to a user, creating a tracker."""
    if req.scheme_id and await db.scheme_applications.find_one(
        {"user_id": uid, "scheme_id": req.scheme_id}
    ):
        raise HTTPException(status_code=409, detail="Scheme already assigned to this user.")

    now = now_iso()
    app_id = str(uuid.uuid4())
    doc = {
        "id":          app_id,
        "user_id":     uid,
        "scheme_id":   req.scheme_id,
        "scheme_name": req.scheme_name,
        "bank_id":     req.bank_id,
        "bank_name":   req.bank_name,
        "stage":       "scheme_identified",
        "stage_history": [{
            "stage":      "scheme_identified",
            "note":       req.notes or "Scheme assigned by advisor",
            "updated_by": admin["full_name"],
            "updated_at": now,
        }],
        "assigned_by":  admin["id"],
        "assigned_at":  now,
        "notes":        req.notes or "",
        "created_at":   now,
        "updated_at":   now,
    }
    await db.scheme_applications.insert_one(doc)
    await audit_log(db, "scheme_application_assign", user_id=admin["id"],
                    role=admin.get("role"), resource=uid,
                    metadata={"scheme": req.scheme_name, "bank": req.bank_name},
                    ip=get_ip(request))
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.get("/admin/users/{uid}/scheme-applications")
async def admin_list_user_applications(uid: str, admin=Depends(require_admin)):
    """Admin views all scheme applications for a specific user."""
    apps = await db.scheme_applications.find({"user_id": uid}, {"_id": 0}).to_list(100)
    return apps


@api_router.patch("/admin/scheme-applications/{app_id}/stage")
async def admin_update_app_stage(app_id: str, req: UpdateAppStageRequest,
                                  request: Request, admin=Depends(require_admin)):
    """Admin updates the stage of a scheme application."""
    if req.stage not in APPLICATION_STAGES:
        raise HTTPException(status_code=400,
                            detail=f"Invalid stage. Must be one of: {APPLICATION_STAGES}")
    app = await db.scheme_applications.find_one({"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    now = now_iso()
    history_entry = {
        "stage":      req.stage,
        "note":       req.note or "",
        "updated_by": admin["full_name"],
        "updated_at": now,
    }
    await db.scheme_applications.update_one(
        {"id": app_id},
        {
            "$set":  {"stage": req.stage, "updated_at": now},
            "$push": {"stage_history": history_entry},
        }
    )
    await audit_log(db, "scheme_application_stage_update", user_id=admin["id"],
                    role=admin.get("role"), resource=app_id,
                    metadata={"stage": req.stage, "scheme": app.get("scheme_name")},
                    ip=get_ip(request))

    # Notify the user
    user = await db.users.find_one({"id": app["user_id"]}, {"_id": 0})
    if user and user.get("expo_push_token"):
        label = STAGE_LABELS.get(req.stage, req.stage)
        await send_push(
            user["expo_push_token"],
            "Application Update 🎉" if req.stage not in ("rejected",) else "Application Update",
            f"{app.get('scheme_name')}: {label}",
        )
    return {"ok": True, "stage": req.stage}


@api_router.delete("/admin/scheme-applications/{app_id}")
async def admin_delete_application(app_id: str, admin=Depends(require_admin)):
    """Admin removes a scheme assignment."""
    result = await db.scheme_applications.delete_one({"id": app_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found.")
    return {"ok": True}


@api_router.get("/my/scheme-applications")
async def my_scheme_applications(user=Depends(get_current_user)):
    """User fetches all their scheme application trackers."""
    apps = await db.scheme_applications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    # Attach stage label and index for progress display
    for app in apps:
        app["stage_label"] = STAGE_LABELS.get(app["stage"], app["stage"])
        try:
            app["stage_index"] = APPLICATION_STAGES.index(app["stage"])
        except ValueError:
            app["stage_index"] = 0
        app["total_stages"] = len(APPLICATION_STAGES) - 1  # exclude rejected
    return apps


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

        # scheme_applications — per-user scheme trackers
        await db.scheme_applications.create_index("user_id", background=True)
        await db.scheme_applications.create_index(
            [("user_id", 1), ("scheme_id", 1)], unique=True, background=True
        )
        await db.leads.create_index("assigned_to", background=True)

        # notifications — user inbox (unread filter)
        await db.notifications.create_index([("user_id", 1), ("read", 1), ("created_at", -1)], background=True)

        # ai_conversations — chat history lookup
        await db.ai_conversations.create_index("user_id", unique=True, background=True)

        # audit_logs — queried by user_id, action, timestamp
        await db.audit_logs.create_index("user_id", background=True)
        await db.audit_logs.create_index("action", background=True)
        await db.audit_logs.create_index([("timestamp", -1)], background=True)
        await db.audit_logs.create_index([("user_id", 1), ("action", 1), ("timestamp", -1)], background=True)
        # archive mirrors same indexes
        await db.audit_logs_archive.create_index("user_id", background=True)
        await db.audit_logs_archive.create_index([("timestamp", -1)], background=True)

        logging.info("MongoDB indexes ensured")
    except Exception as e:
        logging.warning(f"Index creation warning (non-fatal): {e}")


@app.on_event("startup")
async def seed_db():
    # Ensure indexes first (non-blocking, background=True)
    await _ensure_indexes()

    # Upsert all seed data so new entries are added on every deploy
    for s in SCHEMES_SEED:
        doc = {**s, "disabled": s.get("disabled", False)}
        await db.schemes.update_one({"id": doc["id"]}, {"$setOnInsert": doc}, upsert=True)
    logging.info(f"Upserted {len(SCHEMES_SEED)} schemes")
    for b in BANKS_SEED:
        await db.banks.update_one({"id": b["id"]}, {"$setOnInsert": b.copy()}, upsert=True)
    logging.info(f"Upserted {len(BANKS_SEED)} banks")
    # seed super admin (idempotent)
    # Must use E.164 format (+91...) to match what sanitise_mobile() produces at login
    admin_mobile = os.environ.get("SUPER_ADMIN_MOBILE", "9000000000").strip()
    if not admin_mobile.startswith("+"):
        admin_mobile = "+91" + admin_mobile
    # Fix any existing record that was stored without +91
    await db.users.update_many(
        {"mobile": admin_mobile.lstrip("+91"), "role": "super_admin"},
        {"$set": {"mobile": admin_mobile, "role": "super_admin"}}
    )
    existing_admin = await db.users.find_one({"mobile": admin_mobile})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "mobile": admin_mobile, "language": "en",
            "full_name": "Super Admin", "onboarding_step": "done", "role": "super_admin",
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        logging.info(f"Seeded super admin (mobile={admin_mobile})")
    else:
        # ensure role is always super_admin even if accidentally demoted
        await db.users.update_one({"mobile": admin_mobile}, {"$set": {"role": "super_admin"}})
        logging.info(f"Super admin verified (mobile={admin_mobile})")



# ── Setu Account Aggregator ─────────────────────────────────────────────────

from setu_service import create_consent, get_consent_status, fetch_fi_data, extract_financial_profile, enrich_business_profile_from_aa
from azure_storage import upload_to_azure, delete_from_azure, get_sas_url
from notifications_service import send_push_to_user, send_push
from whatsapp_service import send_whatsapp
from ghl_service import upsert_contact, add_document_note, create_opportunity, update_opportunity_stage


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
    reject_reason: Optional[str] = None

class AdminRecommendationIn(BaseModel):
    schemes: List[str] = []
    banks: List[str] = []
    note: Optional[str] = ""


@api_router.post("/documents/upload")
async def upload_document(
    doc_type: str = Form(...),
    file: UploadFile = File(...),
    request: Request = None,
    user=Depends(get_current_user),
):
    file_bytes = await file.read()

    ok, err = validate_upload(
        filename=file.filename or "",
        content_type=file.content_type or "",
        size=len(file_bytes),
    )
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    result = await upload_to_azure(file_bytes, doc_type, user["id"], file.filename or "upload")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "doc_type": doc_type,
        "status": "pending",
        "created_at": now_iso(),
        "file_name": file.filename or (doc_type.replace(" ", "_").lower() + ".pdf"),
        "blob_name": result["blob_name"],
        # blob_url intentionally NOT stored — generated on demand with short TTL
    }
    await db.documents.insert_one({**doc, "_id": doc["id"]})
    await audit_log(db, AuditAction.DOCUMENT_UPLOAD, user_id=user["id"], role=user.get("role"),
                    resource=doc["file_name"], ip=get_ip(request) if request else None,
                    metadata={"doc_type": doc_type, "doc_id": doc["id"]})
    return {k: v for k, v in doc.items() if k != "blob_name"}


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
async def get_document_download_url(doc_id: str, request: Request, user=Depends(get_current_user)):
    """Return a 5-minute SAS URL so the user can download their own document."""
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("blob_name"):
        raise HTTPException(status_code=404, detail="No file attached to this document")
    sas_url = get_sas_url(doc["blob_name"], expiry_hours=0.083)  # 5 minutes
    await audit_log(db, AuditAction.DOCUMENT_DOWNLOAD, user_id=user["id"], role=user.get("role"),
                    resource=doc.get("file_name"), ip=get_ip(request),
                    metadata={"doc_id": doc_id, "doc_type": doc.get("doc_type")})
    return {"url": sas_url, "expires_in": 300}


@api_router.get("/admin/documents")
async def admin_list_all_documents(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 30,
    admin=Depends(require_admin),
):
    query: dict = {}
    if status and status in ("pending", "verified", "rejected"):
        query["status"] = status
    skip = (max(page, 1) - 1) * limit
    total = await db.documents.count_documents(query)
    docs = await db.documents.find(query, {"_id": 0, "blob_name": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    # Attach user names
    user_ids = list({d["user_id"] for d in docs if d.get("user_id")})
    users_map = {}
    if user_ids:
        async for u in db.users.find({"id": {"$in": user_ids}}, {"id": 1, "full_name": 1, "mobile": 1}):
            users_map[u["id"]] = {"full_name": u.get("full_name", "—"), "mobile": u.get("mobile", "")}
    for d in docs:
        d["user"] = users_map.get(d.get("user_id"), {})
    return {"items": docs, "total": total, "page": page, "limit": limit, "pages": max(1, (total + limit - 1) // limit)}


@api_router.get("/admin/users/{user_id}/documents")
async def admin_list_user_documents(user_id: str, admin=Depends(require_admin)):
    docs = await db.documents.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return docs


@api_router.post("/admin/documents/{doc_id}/status")
async def admin_update_doc_status(doc_id: str, payload: DocumentStatusIn, admin=Depends(require_admin)):
    if payload.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="status must be verified or rejected")
    update_fields: dict = {"status": payload.status, "updated_at": now_iso()}
    if payload.status == "rejected" and payload.reject_reason:
        update_fields["reject_reason"] = payload.reject_reason.strip()
    elif payload.status == "verified":
        update_fields["reject_reason"] = None
    result = await db.documents.find_one_and_update(
        {"id": doc_id},
        {"$set": update_fields},
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
            reason_suffix = f" Reason: {payload.reject_reason}" if payload.reject_reason else " Please re-upload a clearer copy."
            send_push_to_user(doc_owner, "Document Rejected ❌", f"Your {result.get('doc_type')} was rejected.{reason_suffix}")
        # Audit log
        action = AuditAction.DOCUMENT_VERIFY if payload.status == "verified" else AuditAction.DOCUMENT_REJECT
        await audit_log(db, action, user_id=admin["id"], role=admin.get("role"),
                        resource=result.get("file_name"), metadata={"doc_id": doc_id, "doc_owner": result.get("user_id")})
        # GHL note
        try:
            ghl_cid = doc_owner.get("ghl_contact_id")
            if ghl_cid:
                add_document_note(ghl_cid, result.get("doc_type", "Document"), payload.status, doc_owner.get("full_name", ""))
        except Exception as e:
            logging.warning(f"GHL doc note failed: {e}")

    return result


@api_router.get("/admin/documents/{doc_id}/download")
async def admin_get_document_download_url(doc_id: str, request: Request, admin=Depends(require_admin)):
    """Admin: return a 5-minute SAS URL to download any user's document. Every download is audited."""
    doc = await db.documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("blob_name"):
        raise HTTPException(status_code=404, detail="No file attached to this document")

    # Anomaly check: alert if admin downloads >20 docs in 1 hour
    abuse = await check_admin_abuse(db, admin["id"], AuditAction.DOCUMENT_DOWNLOAD, threshold=20, window_minutes=60)
    if abuse:
        logging.warning(f"ANOMALY: Admin {admin.get('full_name')} ({admin['id']}) exceeded 20 document downloads in 1 hour")

    sas_url = get_sas_url(doc["blob_name"], expiry_hours=0.083)  # 5 minutes
    await audit_log(db, AuditAction.DOCUMENT_DOWNLOAD, user_id=admin["id"], role=admin.get("role"),
                    resource=doc.get("file_name"), ip=get_ip(request),
                    metadata={"doc_id": doc_id, "doc_owner": doc.get("user_id"), "doc_type": doc.get("doc_type")})
    return {"url": sas_url, "expires_in": 300}


@api_router.get("/admin/audit-logs")
async def admin_list_audit_logs(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    admin=Depends(require_super_admin),
):
    """Super admin only: view audit logs. Read from archive (tamper-resistant)."""
    q: Dict[str, Any] = {}
    if user_id: q["user_id"] = user_id
    if action: q["action"] = action
    logs = await db.audit_logs_archive.find(q, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return logs


@api_router.post("/account/deactivate")
async def deactivate_account(request: Request, user=Depends(get_current_user)):
    """
    DPDP Phase 1: Deactivate account and anonymize personal data.
    Audit logs and financial records are retained for regulatory compliance.
    Full deletion requires legal review.
    """
    uid = user["id"]
    # Anonymize personal fields — replace with placeholder
    anon = {
        "full_name": "Deleted User",
        "state": None, "district": None, "gender": None,
        "age": None, "category": None,
        "deactivated": True, "deactivated_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.users.update_one({"id": uid}, {"$set": anon})
    # Anonymize business profile
    await db.business_profiles.update_one({"user_id": uid}, {"$set": {"anonymized": True}})
    await audit_log(db, AuditAction.ACCOUNT_ANONYMIZE, user_id=uid, role=user.get("role"),
                    ip=get_ip(request), metadata={"reason": "user_requested"})
    return {"ok": True, "message": "Account deactivated. Personal data has been anonymized."}


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
