"""Bank recommendation engine — pure rule-based scoring, deterministic & fast."""
from typing import Dict, List, Any


def score_bank(bank: Dict[str, Any], user: Dict, bp: Dict, fa: Dict) -> Dict[str, Any]:
    score = 60
    reasons = []

    funding_req = int(fa.get("funding_requirement") or bp.get("funding_required") or 0)
    industry = (bp.get("industry") or "").strip()
    turnover = int(bp.get("annual_turnover") or 0)
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")
    state = user.get("state")
    category = (user.get("category") or "").lower()
    gender = (user.get("gender") or "").lower()

    # Funding fit
    if funding_req > 0 and funding_req <= bank["max_funding"]:
        score += 12
        reasons.append(f"Funding need ₹{funding_req:,} is within {bank['short_name']} max of ₹{bank['max_funding']:,}")
    elif funding_req > bank["max_funding"]:
        score -= 20
        reasons.append(f"Funding need exceeds {bank['short_name']} ceiling")

    # Industry fit
    if industry and industry in bank["industries"]:
        score += 8
        reasons.append(f"{industry} is supported by {bank['short_name']}")

    # State applicability (all banks here are All India, but extensible)
    if state and ("All India" in bank["states"] or state in bank["states"]):
        score += 5

    # GST & Udyam — private banks prefer these
    if bank["type"] == "Private":
        if has_gst and has_udyam:
            score += 10
            reasons.append("GST + Udyam registered — preferred by private banks")
        elif not has_gst and turnover < bank["min_turnover"]:
            score -= 25
            reasons.append(f"Turnover < ₹{bank['min_turnover']:,} and no GST — not eligible at {bank['short_name']}")
        elif not has_gst:
            score -= 8

    # Public banks favour scheme-backed lending
    if bank["type"] == "Public":
        if not existing:
            score += 5
            reasons.append("New business — public banks support scheme-backed lending (PMEGP/Mudra)")
        if has_udyam:
            score += 4

    # Women / SC-ST bonuses (public banks have dedicated programs)
    if bank["type"] == "Public" and (gender == "female" or category in ("sc", "st")):
        if "Stand-Up India" in bank["supports"]:
            score += 8
            reasons.append("Stand-Up India eligibility for woman/SC/ST entrepreneurs")

    # Collateral compatibility
    if bank["collateral_required"] and not existing:
        score -= 4
    if not bank["collateral_required"] and turnover >= bank["min_turnover"]:
        score += 6
        if bank["type"] == "Private":
            reasons.append("Collateral-free business loan available")

    # Existing business with turnover (private bank fit)
    if existing and turnover >= bank["min_turnover"] and bank["type"] == "Private":
        score += 8

    score = max(35, min(99, int(score)))

    # Estimate likely loan amount and tenure
    suggested_amount = min(funding_req or bank["max_funding"], bank["max_funding"])
    if not existing and bank["type"] == "Private" and turnover < bank["min_turnover"]:
        suggested_amount = 0  # ineligible

    return {
        "bank_id": bank["id"],
        "name": bank["name"],
        "short_name": bank["short_name"],
        "type": bank["type"],
        "score": score,
        "interest_range": f"{bank['interest_min']}%–{bank['interest_max']}%",
        "interest_min": bank["interest_min"],
        "interest_max": bank["interest_max"],
        "max_funding": bank["max_funding"],
        "suggested_amount": suggested_amount,
        "processing_fee_percent": bank["processing_fee_percent"],
        "collateral_required": bank["collateral_required"],
        "supports": bank["supports"],
        "description": bank["description"],
        "why": bank["why"] + (" " + reasons[0] if reasons else ""),
        "reasons": reasons[:3],
    }


def recommend_banks(banks: List[Dict], user: Dict, bp: Dict, fa: Dict, limit: int = 5) -> List[Dict]:
    scored = [score_bank(b, user, bp, fa) for b in banks]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
