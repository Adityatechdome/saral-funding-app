"""Analytics aggregations for admin dashboard."""
from typing import Dict, Any
from datetime import datetime, timedelta, timezone


async def compute_overview(db) -> Dict[str, Any]:
    total_users = await db.users.count_documents({"role": "user"})
    total_admins = await db.users.count_documents({"role": {"$ne": "user"}})
    total_schemes = await db.schemes.count_documents({})
    total_consultations = await db.consultations.count_documents({})
    total_leads = await db.leads.count_documents({})
    total_chats = await db.ai_conversations.count_documents({})

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    dau = await db.users.count_documents({"updated_at": {"$gte": yesterday}})

    # Conversion rate: leads that reached approved/disbursed out of total leads
    converted = await db.leads.count_documents({"stage": {"$in": ["approved", "disbursed"]}})
    conversion_rate = round((converted / total_leads * 100) if total_leads > 0 else 0, 1)

    # Scheme views: count of scheme_matches documents (each represents a user who got matches)
    scheme_views = await db.scheme_matches.count_documents({})

    # Bank recommendation views: count users who have bank recommendations
    bank_rec_views = await db.users.count_documents({"role": "user", "onboarding_step": "done"})

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_schemes": total_schemes,
        "total_consultations": total_consultations,
        "total_leads": total_leads,
        "total_chats": total_chats,
        "daily_active_users": dau,
        "conversion_rate": conversion_rate,
        "scheme_views": scheme_views,
        "bank_recommendation_views": bank_rec_views,
    }


async def popular_schemes(db, limit: int = 10):
    pipeline = [
        {"$unwind": "$matches"},
        {"$group": {"_id": "$matches.scheme_id", "name": {"$first": "$matches.name"}, "count": {"$sum": 1}, "avg_score": {"$avg": "$matches.score"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    rows = await db.scheme_matches.aggregate(pipeline).to_list(limit)
    return [{"scheme_id": r["_id"], "name": r.get("name"), "matches": r["count"], "avg_score": int(r.get("avg_score") or 0)} for r in rows]


async def state_distribution(db):
    pipeline = [
        {"$match": {"role": "user", "state": {"$ne": None}}},
        {"$group": {"_id": "$state", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15},
    ]
    rows = await db.users.aggregate(pipeline).to_list(15)
    return [{"state": r["_id"], "count": r["count"]} for r in rows]


async def consultation_status(db):
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    rows = await db.consultations.aggregate(pipeline).to_list(20)
    return [{"status": r["_id"], "count": r["count"]} for r in rows]


async def lead_pipeline(db):
    pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
    ]
    rows = await db.leads.aggregate(pipeline).to_list(20)
    return {r["_id"]: r["count"] for r in rows}


async def daily_user_trend(db, days: int = 14):
    """Return signups per day for the last `days` days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"role": "user", "created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    rows = await db.users.aggregate(pipeline).to_list(days)
    return [{"date": r["_id"], "count": r["count"]} for r in rows]


async def consultation_trend(db, days: int = 14):
    """Return consultations booked per day for the last `days` days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    rows = await db.consultations.aggregate(pipeline).to_list(days)
    return [{"date": r["_id"], "count": r["count"]} for r in rows]
