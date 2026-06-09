"""Funding Readiness Score — dynamic 0-100 score with action items."""
from typing import Dict, Any, List, Tuple


def _user_complete(user: Dict) -> bool:
    return all(user.get(k) for k in ("full_name", "state", "district", "gender", "age", "category"))


def _funding_capacity(score: int, bp: Dict, fa: Dict) -> Dict[str, Any]:
    """Estimate fundable range based on profile signals."""
    turnover = int(bp.get("annual_turnover") or 0)
    funding_req = int(fa.get("funding_requirement") or bp.get("funding_required") or 0)
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")

    # Base multiplier on turnover
    if turnover >= 10_000_000:   # 1 Cr+
        base_min, base_max = 5_000_000, 25_000_000
    elif turnover >= 5_000_000:  # 50L+
        base_min, base_max = 2_500_000, 10_000_000
    elif turnover >= 1_000_000:  # 10L+
        base_min, base_max = 500_000, 3_000_000
    elif turnover >= 500_000:    # 5L+
        base_min, base_max = 100_000, 1_000_000
    elif existing:
        base_min, base_max = 50_000, 500_000
    else:
        # New business — mostly subsidy/grant eligible
        base_min, base_max = 50_000, 2_500_000  # PMEGP etc.

    # Boost for registrations
    if has_gst and has_udyam:
        base_max = int(base_max * 1.5)
    elif has_gst or has_udyam:
        base_max = int(base_max * 1.2)

    # Cap at funding requirement if specified
    if funding_req > 0:
        base_max = min(base_max, funding_req * 2)
        base_min = min(base_min, funding_req)

    return {"min": base_min, "max": base_max}


def _approval_probability(score: int, bp: Dict, fa: Dict) -> int:
    """Return a rough approval probability % (0-95)."""
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")

    # Base from score
    base = int(score * 0.7)  # max 70 from score

    # Bonuses
    if has_gst: base += 10
    if has_udyam: base += 8
    if existing: base += 7

    return min(95, base)


def compute_readiness(user: Dict, bp: Dict, fa: Dict) -> Dict[str, Any]:
    breakdown: List[Tuple[str, int, int]] = []  # (label, scored, max)
    actions: List[Dict[str, str]] = []

    # 1. Profile completion (15)
    profile_score = 0
    if _user_complete(user):
        profile_score = 15
    else:
        missing = [k for k in ("full_name", "state", "district", "gender", "age", "category") if not user.get(k)]
        profile_score = max(0, 15 - len(missing) * 3)
        actions.append({
            "title": "Complete personal profile",
            "detail": f"Add {', '.join(missing)} to improve eligibility",
            "weight": "+3 each",
            "cta": "profile",
            "priority": "high",
        })
    breakdown.append(("Profile completion", profile_score, 15))

    # 2. Business profile (15)
    if bp and bp.get("industry"):
        business_score = 15
    else:
        business_score = 0
        actions.append({
            "title": "Add business profile",
            "detail": "Industry, turnover and stage are required by every bank.",
            "weight": "+15",
            "cta": "business",
            "priority": "high",
        })
    breakdown.append(("Business profile", business_score, 15))

    # 3. GST registration (15)
    has_gst = bool(fa.get("gst_registration") or bp.get("gst_available"))
    gst_score = 15 if has_gst else 0
    if not has_gst:
        actions.append({
            "title": "Register for GST",
            "detail": "Unlocks private bank loans and several state subsidies. Apply at gst.gov.in.",
            "weight": "+15",
            "cta": "gst",
            "priority": "high",
        })
    breakdown.append(("GST registration", gst_score, 15))

    # 4. Udyam registration (15)
    has_udyam = bool(fa.get("udyam_registration") or bp.get("udyam_available"))
    udyam_score = 15 if has_udyam else 0
    if not has_udyam:
        actions.append({
            "title": "Get Udyam Registration",
            "detail": "Free, takes 10 minutes at udyamregistration.gov.in. Required for CGTMSE and most MSME subsidies.",
            "weight": "+15",
            "cta": "udyam",
            "priority": "high",
        })
    breakdown.append(("Udyam registration", udyam_score, 15))

    # 5. Existing business + turnover (20)
    existing = bool(fa.get("existing_business") or bp.get("business_stage") == "existing")
    turnover = int(bp.get("annual_turnover") or 0)
    if existing and turnover >= 1000000:
        turn_score = 20
    elif existing and turnover >= 500000:
        turn_score = 14
    elif existing:
        turn_score = 8
    else:
        turn_score = 4
        actions.append({
            "title": "Build turnover history",
            "detail": "₹10L+ annual turnover unlocks unsecured loans from private banks.",
            "weight": "+12",
            "cta": "business",
            "priority": "medium",
        })
    breakdown.append(("Business vintage & turnover", turn_score, 20))

    # 6. Funding assessment completed (10)
    fa_score = 10 if fa and fa.get("business_type") else 0
    if not fa_score:
        actions.append({
            "title": "Complete funding assessment",
            "detail": "Tell us your funding need and we'll compute personalised matches.",
            "weight": "+10",
            "cta": "assessment",
            "priority": "high",
        })
    breakdown.append(("Assessment complete", fa_score, 10))

    # 7. Documentation readiness (10)
    has_funding_req = bool(fa.get("funding_requirement") or bp.get("funding_required"))
    doc_score = 0
    if has_gst: doc_score += 3
    if has_udyam: doc_score += 3
    if existing: doc_score += 2
    if has_funding_req: doc_score += 2
    if doc_score < 10:
        actions.append({
            "title": "Prepare core documents",
            "detail": "PAN, Aadhaar, GST/Udyam certificate, last 6 months bank statements, ITR.",
            "weight": f"+{10 - doc_score}",
            "cta": "documents",
            "priority": "medium",
        })
    breakdown.append(("Documentation readiness", doc_score, 10))

    total = sum(s for _, s, _ in breakdown)
    capacity = _funding_capacity(total, bp, fa)
    approval_prob = _approval_probability(total, bp, fa)

    # Score label
    if total >= 80:
        score_label = "Excellent"
    elif total >= 60:
        score_label = "Good"
    elif total >= 40:
        score_label = "Fair"
    else:
        score_label = "Getting Started"

    return {
        "score": total,
        "max": 100,
        "score_label": score_label,
        "funding_capacity": capacity,
        "approval_probability": approval_prob,
        "breakdown": [{"label": l, "score": s, "max": m} for l, s, m in breakdown],
        "actions": actions[:6],
    }
