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

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_schemes": total_schemes,
        "total_consultations": total_consultations,
        "total_leads": total_leads,
        "total_chats": total_chats,
        "daily_active_users": dau,
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
