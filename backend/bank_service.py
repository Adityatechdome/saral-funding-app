"""Bank recommendation engine — pure rule-based scoring, deterministic & fast."""
from typing import Dict, List, Any

# Estimated processing days per bank type
_PROCESSING_DAYS: Dict[str, int] = {
    "Public": 21,
    "Private": 10,
    "NBFC": 7,
    "MFI": 5,
}


def score_bank(bank: Dict[str, Any], user: Dict, bp: Dict, fa: Dict) -> Dict[str, Any]:
    score = 60
    reasons = []
    match_breakdown: List[Dict[str, Any]] = []

    funding_req = int(fa.get("funding_requirement") or bp.get("funding_required") or 0)
    industry = (bp.get("industry") or "").strip()
    turnover = int(bp.get("annual_turnover") or 0)
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")
    state = user.get("state")
    category = (user.get("category") or "").lower()
    gender = (user.get("gender") or "").lower()

    # Funding fit (+12 / -20)
    if funding_req > 0 and funding_req <= bank["max_funding"]:
        score += 12
        reasons.append(f"Funding need ₹{funding_req:,} is within {bank['short_name']} max of ₹{bank['max_funding']:,}")
        match_breakdown.append({"factor": "Funding fit", "delta": 12, "note": f"Your need ₹{funding_req:,} is within limit"})
    elif funding_req > bank["max_funding"]:
        score -= 20
        reasons.append(f"Funding need exceeds {bank['short_name']} ceiling")
        match_breakdown.append({"factor": "Funding fit", "delta": -20, "note": "Funding requirement exceeds bank limit"})
    else:
        match_breakdown.append({"factor": "Funding fit", "delta": 0, "note": "No funding requirement specified"})

    # Industry fit (+8)
    if industry and industry in bank["industries"]:
        score += 8
        reasons.append(f"{industry} is supported by {bank['short_name']}")
        match_breakdown.append({"factor": "Industry match", "delta": 8, "note": f"{industry} is a supported sector"})
    else:
        match_breakdown.append({"factor": "Industry match", "delta": 0, "note": "Industry not in priority list"})

    # State applicability (+5)
    if state and ("All India" in bank["states"] or state in bank["states"]):
        score += 5
        match_breakdown.append({"factor": "Geographic reach", "delta": 5, "note": "Bank operates in your state"})

    # GST & Udyam — private banks prefer these
    if bank["type"] == "Private":
        if has_gst and has_udyam:
            score += 10
            reasons.append("GST + Udyam registered — preferred by private banks")
            match_breakdown.append({"factor": "Registration status", "delta": 10, "note": "GST + Udyam both present"})
        elif not has_gst and turnover < bank["min_turnover"]:
            score -= 25
            reasons.append(f"Turnover < ₹{bank['min_turnover']:,} and no GST — not eligible at {bank['short_name']}")
            match_breakdown.append({"factor": "Eligibility", "delta": -25, "note": "Below turnover threshold and no GST"})
        elif not has_gst:
            score -= 8
            match_breakdown.append({"factor": "Registration status", "delta": -8, "note": "GST not registered"})
        else:
            match_breakdown.append({"factor": "Registration status", "delta": 0, "note": "Partial registration"})

    # Public banks favour scheme-backed lending
    if bank["type"] == "Public":
        if not existing:
            score += 5
            reasons.append("New business — public banks support scheme-backed lending (PMEGP/Mudra)")
            match_breakdown.append({"factor": "Business stage", "delta": 5, "note": "New business eligible for govt schemes"})
        if has_udyam:
            score += 4
            match_breakdown.append({"factor": "Udyam registration", "delta": 4, "note": "Udyam registered — preferred"})

    # Women / SC-ST bonuses (public banks have dedicated programs)
    if bank["type"] == "Public" and (gender == "female" or category in ("sc", "st")):
        if "Stand-Up India" in bank["supports"]:
            score += 8
            reasons.append("Stand-Up India eligibility for woman/SC/ST entrepreneurs")
            match_breakdown.append({"factor": "Priority category", "delta": 8, "note": "Stand-Up India eligible"})

    # Collateral compatibility
    if bank["collateral_required"] and not existing:
        score -= 4
        match_breakdown.append({"factor": "Collateral", "delta": -4, "note": "Collateral required but new business"})
    elif not bank["collateral_required"] and turnover >= bank["min_turnover"]:
        score += 6
        if bank["type"] == "Private":
            reasons.append("Collateral-free business loan available")
        match_breakdown.append({"factor": "Collateral", "delta": 6, "note": "Collateral-free loan available"})
    else:
        match_breakdown.append({"factor": "Collateral", "delta": 0, "note": "Standard collateral terms apply"})

    # Existing business with turnover (private bank fit)
    if existing and turnover >= bank["min_turnover"] and bank["type"] == "Private":
        score += 8
        match_breakdown.append({"factor": "Business vintage", "delta": 8, "note": "Established business meets private bank criteria"})

    score = max(35, min(99, int(score)))

    # Estimate likely loan amount
    suggested_amount = min(funding_req or bank["max_funding"], bank["max_funding"])
    if not existing and bank["type"] == "Private" and turnover < bank["min_turnover"]:
        suggested_amount = 0  # ineligible

    # Refine interest range based on profile strength
    interest_min = bank["interest_min"]
    interest_max = bank["interest_max"]
    if has_gst and has_udyam and existing:
        # Strong profile — offer lower band
        interest_max = round(interest_min + (interest_max - interest_min) * 0.6, 1)
    elif not has_gst and not has_udyam:
        # Weak profile — upper band
        interest_min = round(interest_min + (interest_max - interest_min) * 0.4, 1)

    processing_days = _PROCESSING_DAYS.get(bank["type"], 14)

    return {
        "bank_id": bank["id"],
        "name": bank["name"],
        "short_name": bank["short_name"],
        "type": bank["type"],
        "score": score,
        "interest_range": f"{interest_min}%–{interest_max}%",
        "interest_min": interest_min,
        "interest_max": interest_max,
        "max_funding": bank["max_funding"],
        "suggested_amount": suggested_amount,
        "processing_fee_percent": bank["processing_fee_percent"],
        "collateral_required": bank["collateral_required"],
        "processing_time_days": processing_days,
        "supports": bank["supports"],
        "description": bank["description"],
        "why": bank["why"] + (" " + reasons[0] if reasons else ""),
        "why_reasons": reasons[:4],
        "reasons": reasons[:3],
        "match_breakdown": match_breakdown,
    }


def recommend_banks(banks: List[Dict], user: Dict, bp: Dict, fa: Dict, limit: int = 5) -> List[Dict]:
    scored = [score_bank(b, user, bp, fa) for b in banks]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
