"""AI service for Saral Funding — GPT-4o via emergentintegrations universal key.

Provides:
- match_schemes_with_llm: scheme matching with LLM-generated reasons
- advisor_chat: free-form advisor conversation (with full history in system prompt)
- advisor_structured: Phase-A advanced advisor that returns a structured roadmap
  (recommended schemes, recommended banks, documents, next steps, why)
"""
import os
import json
import logging
from typing import List, Dict, Any
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi (हिन्दी)", "gu": "Gujarati (ગુજરાતી)",
    "mr": "Marathi (मराठी)", "bn": "Bengali (বাংলা)", "ta": "Tamil (தமிழ்)",
    "te": "Telugu (తెలుగు)", "kn": "Kannada (ಕನ್ನಡ)", "pa": "Punjabi (ਪੰਜਾਬੀ)",
}


def _brief_schemes(schemes: List[Dict]) -> List[Dict]:
    return [
        {
            "id": s["id"], "name": s["name"],
            "description": s.get("description", "")[:200],
            "max_funding": s.get("max_funding", 0),
            "max_subsidy_percent": s.get("max_subsidy_percent", 0),
            "categories": s.get("categories", []),
            "states": s.get("states", []),
            "tags": s.get("tags", []),
        } for s in schemes
    ]


def _brief_banks(banks: List[Dict]) -> List[Dict]:
    return [
        {
            "id": b["id"], "name": b["name"], "type": b["type"],
            "interest_min": b["interest_min"], "interest_max": b["interest_max"],
            "max_funding": b["max_funding"], "supports": b["supports"],
            "min_turnover": b["min_turnover"], "collateral_required": b["collateral_required"],
        } for b in banks
    ]


async def match_schemes_with_llm(user: Dict, bp: Dict, fa: Dict, schemes: List[Dict]) -> List[Dict[str, Any]]:
    user_state = (user.get("state") or "").lower()
    is_woman = user.get("gender", "").lower() == "female" or fa.get("woman_entrepreneur") is True
    is_sc_st = (user.get("category", "").lower() in ("sc", "st"))
    funding_req = int(fa.get("funding_requirement") or bp.get("funding_required") or 0)
    industry = (bp.get("industry") or "").lower()
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))

    matches = []
    for s in schemes:
        score = 50
        if "All India" in s.get("states", []) or (user_state and user_state.capitalize() in s.get("states", [])):
            score += 15
        elif user_state and "All India" not in s.get("states", []) and not any(user_state.capitalize() == st for st in s.get("states", [])):
            score -= 30
        max_f = s.get("max_funding", 0)
        if funding_req and max_f:
            score += 15 if funding_req <= max_f else -10
        cats_l = [c.lower() for c in s.get("categories", [])]
        if industry and industry in cats_l: score += 10
        tags = s.get("tags", [])
        if is_woman and "women" in s.get("categories", []): score += 10
        if is_woman and s["id"] == "standupindia": score += 10
        if is_sc_st and s["id"] == "standupindia": score += 15
        if has_udyam and "udyam" in tags: score += 5
        if existing and "existing_business" in tags: score += 5
        if not existing and "new_business" in tags: score += 5
        if has_gst: score += 2

        score = max(40, min(99, score))
        funding_est = min(int(funding_req or max_f), int(max_f))
        if funding_est <= 0: funding_est = int(max_f * 0.4)
        subsidy_pct = s.get("max_subsidy_percent", 0)
        subsidy_est = int(funding_est * subsidy_pct / 100)

        matches.append({
            "scheme_id": s["id"], "name": s["name"], "score": score,
            "funding_estimate": funding_est, "subsidy_estimate": subsidy_est,
            "reason": "",
        })

    matches.sort(key=lambda x: x["score"], reverse=True)
    top = matches[:8]

    if EMERGENT_LLM_KEY and user.get("state"):
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"match_{user.get('id', 'anon')}",
                system_message=(
                    "You are an expert Indian government funding advisor. Given a user profile and a candidate scheme, "
                    "write ONE short sentence (max 25 words) explaining why this scheme is a fit. Be concrete."
                ),
            ).with_model("openai", "gpt-4o")
            top_ids = [m["scheme_id"] for m in top]
            ctx = json.dumps({
                "user": {k: user.get(k) for k in ("state", "district", "gender", "age", "category")},
                "business_profile": bp, "assessment": fa,
                "schemes": [s for s in _brief_schemes(schemes) if s["id"] in top_ids],
            }, ensure_ascii=False)
            text = (await chat.send_message(UserMessage(text=f"Context JSON:\n{ctx}\n\nReturn a JSON object mapping scheme_id -> reason sentence. Only JSON."))).strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.startswith("json"): text = text[4:]
            reasons = json.loads(text)
            for m in top:
                if m["scheme_id"] in reasons:
                    m["reason"] = reasons[m["scheme_id"]]
        except Exception as e:
            logger.warning(f"LLM reasoning failed: {e}")
    for m in top:
        if not m["reason"]:
            m["reason"] = "Matches your profile based on industry, location and funding need."
    return top


async def advisor_chat(
    user_id: str, user_profile: Dict, business_profile: Dict, assessment: Dict,
    schemes: List[Dict], banks: List[Dict], message: str, language: str, history: List[Dict],
) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    system_prompt = (
        f"You are Saral Funding Advisor — an expert on Indian government funding schemes, subsidies, MSME programmes and bank business loans. "
        f"You help Indian entrepreneurs, MSMEs, startups, shopkeepers, farmers and self-employed professionals. "
        f"ALWAYS reply in {lang_name}. Keep replies concise (max 200 words), bullet-friendly. "
        f"Use ONLY the schemes/banks provided below. "
        f"User profile: {json.dumps({k: user_profile.get(k) for k in ('full_name','state','district','gender','age','category')}, ensure_ascii=False)}. "
        f"Business: {json.dumps(business_profile, ensure_ascii=False, default=str)}. "
        f"Assessment: {json.dumps(assessment, ensure_ascii=False, default=str)}. "
        f"Schemes: {json.dumps(_brief_schemes(schemes), ensure_ascii=False)}. "
        f"Banks: {json.dumps(_brief_banks(banks), ensure_ascii=False)}."
    )
    if history:
        recent = history[-12:]
        convo = "\n".join([f"{'User' if h.get('role') == 'user' else 'Advisor'}: {h.get('content', '')}" for h in recent])
        system_prompt += "\n\nRecent conversation:\n" + convo

    if not EMERGENT_LLM_KEY:
        return "AI advisor is not configured. Please set EMERGENT_LLM_KEY."
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"advisor_{user_id}", system_message=system_prompt).with_model("openai", "gpt-4o")
        reply = await chat.send_message(UserMessage(text=message))
        return reply.strip()
    except Exception as e:
        logger.exception(f"advisor_chat failed: {e}")
        return "Sorry, I couldn't reach the advisor service right now. Please try again."


async def advisor_structured(
    user_profile: Dict, business_profile: Dict, assessment: Dict,
    matches: List[Dict], banks_recommended: List[Dict], schemes: List[Dict], banks: List[Dict],
    user_query: str, language: str,
) -> Dict[str, Any]:
    """Return structured advisor response: schemes + banks + docs + roadmap + next steps."""
    lang_name = LANGUAGE_NAMES.get(language, "English")
    if not EMERGENT_LLM_KEY:
        return _fallback_structured(user_query, matches, banks_recommended)
    try:
        top_schemes = matches[:3]
        top_banks = banks_recommended[:3]
        prompt_ctx = {
            "user": {k: user_profile.get(k) for k in ("state", "district", "gender", "age", "category")},
            "business_profile": business_profile,
            "assessment": assessment,
            "top_schemes": top_schemes,
            "top_banks": [{k: b.get(k) for k in ("bank_id", "name", "score", "interest_range", "supports", "why")} for b in top_banks],
            "available_schemes": _brief_schemes(schemes),
            "available_banks": _brief_banks(banks),
            "user_query": user_query,
        }
        system = (
            f"You are Saral Funding Advisor. Reply in {lang_name}. "
            f"Given the user's query and context, produce a STRICT JSON object with these keys:\n"
            f'  "summary": one paragraph (max 60 words) answering the user query,\n'
            f'  "schemes": array of up to 3 objects {{"name", "why", "estimated_funding", "estimated_subsidy"}},\n'
            f'  "banks": array of up to 3 objects {{"name", "why", "interest_range"}},\n'
            f'  "documents": array of 5–8 short strings,\n'
            f'  "roadmap": array of 4–6 short ordered steps,\n'
            f'  "next_steps": array of 2–3 actionable next steps,\n'
            f'  "why": short paragraph (max 40 words) explaining the overall recommendation rationale.\n'
            f"Use only the provided data. No prose outside JSON."
        )
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"advisor_struct", system_message=system).with_model("openai", "gpt-4o")
        text = (await chat.send_message(UserMessage(text=json.dumps(prompt_ctx, ensure_ascii=False)))).strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"): text = text[4:]
        return json.loads(text)
    except Exception as e:
        logger.exception(f"advisor_structured failed: {e}")
        return _fallback_structured(user_query, matches, banks_recommended)


def _fallback_structured(query: str, matches: List[Dict], banks: List[Dict]) -> Dict[str, Any]:
    return {
        "summary": f"Based on your profile, here's a starting plan for: {query}.",
        "schemes": [{"name": m["name"], "why": m.get("reason", ""), "estimated_funding": m.get("funding_estimate", 0), "estimated_subsidy": m.get("subsidy_estimate", 0)} for m in matches[:3]],
        "banks": [{"name": b["name"], "why": b.get("why", ""), "interest_range": b.get("interest_range", "")} for b in banks[:3]],
        "documents": ["PAN Card", "Aadhaar Card", "Udyam Certificate", "GST Returns (last 6 months)", "Bank Statements (last 6 months)", "Project Report", "ITR (last 2 years)"],
        "roadmap": ["Complete profile & business details", "Get GST + Udyam registration", "Prepare project report", "Apply to top-matched scheme", "Approach recommended bank", "Track application via dashboard"],
        "next_steps": ["Book a free consultation", "Open the top scheme in the app"],
        "why": "Recommendations are derived from your profile, business type, funding need and location.",
    }
