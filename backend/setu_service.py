"""
Setu Account Aggregator (AA) integration.

Sandbox base URL : https://fiu-sandbox.setu.co
Production base URL: https://fiu.setu.co

Set in backend/.env:
  SETU_CLIENT_ID=<from Setu dashboard>
  SETU_CLIENT_SECRET=<from Setu dashboard>
  SETU_PRODUCT_INSTANCE_ID=<from Setu dashboard>
  SETU_BASE_URL=https://fiu-sandbox.setu.co   # change to prod URL when live
  APP_BASE_URL=https://your-app.com           # your backend URL for webhooks
"""

import os
import httpx
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional


SETU_BASE_URL = os.environ.get("SETU_BASE_URL", "https://fiu-sandbox.setu.co")
SETU_CLIENT_ID = os.environ.get("SETU_CLIENT_ID", "")
SETU_CLIENT_SECRET = os.environ.get("SETU_CLIENT_SECRET", "")
SETU_PRODUCT_INSTANCE_ID = os.environ.get("SETU_PRODUCT_INSTANCE_ID", "")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8000")

# FI (Financial Information) types we want to fetch from the bank
FI_TYPES = ["DEPOSIT", "RECURRING_DEPOSIT", "TERM_DEPOSIT"]  # Bank accounts + FDs

# How many months of data to request
DATA_RANGE_MONTHS = 12


def _headers() -> Dict[str, str]:
    return {
        "x-client-id": SETU_CLIENT_ID,
        "x-client-secret": SETU_CLIENT_SECRET,
        "x-product-instance-id": SETU_PRODUCT_INSTANCE_ID,
        "Content-Type": "application/json",
    }


def _date_range() -> Dict[str, str]:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=30 * DATA_RANGE_MONTHS)
    return {
        "from": start.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "to": end.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
    }


async def create_consent(user_mobile: str, user_id: str) -> Dict[str, Any]:
    """
    Step 1: Create a consent request on Setu.
    Returns { id, url, status } — send `url` to frontend for WebView.
    """
    date_range = _date_range()
    payload = {
        "Detail": {
            "consentStart": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "consentExpiry": (datetime.now(timezone.utc) + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "consentMode": "STORE",
            "fetchType": "PERIODIC",
            "consentTypes": ["TRANSACTIONS", "SUMMARY", "PROFILE"],
            "fiTypes": FI_TYPES,
            "DataConsumer": {"id": SETU_CLIENT_ID},
            "Customer": {"id": f"{user_mobile}@onemoney"},  # AA user VPA format
            "Purpose": {
                "code": "101",  # 101 = Wealth management
                "refUri": "https://api.rebit.org.in/aa/purpose/101.xml",
                "text": "Loan eligibility assessment for MSME funding",
                "Category": {"type": "string"}
            },
            "FIDataRange": date_range,
            "DataLife": {"unit": "YEAR", "value": 1},
            "Frequency": {"unit": "MONTH", "value": 1},
        },
        "redirectUrl": f"{APP_BASE_URL}/api/setu/aa/redirect?user_id={user_id}",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{SETU_BASE_URL}/v2/consents",
            json=payload,
            headers=_headers(),
        )
        r.raise_for_status()
        data = r.json()

    return {
        "consent_id": data.get("id") or data.get("consentId"),
        "consent_url": data.get("url") or data.get("redirectUrl"),
        "status": data.get("status", "PENDING"),
    }


async def get_consent_status(consent_id: str) -> Dict[str, Any]:
    """
    Step 2: Poll consent status — PENDING → ACTIVE (user approved) / REJECTED.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            f"{SETU_BASE_URL}/v2/consents/{consent_id}",
            headers=_headers(),
        )
        r.raise_for_status()
        data = r.json()

    return {
        "consent_id": consent_id,
        "status": data.get("status", "PENDING"),  # PENDING | ACTIVE | REJECTED | REVOKED | EXPIRED
        "detail": data,
    }


async def fetch_fi_data(consent_id: str) -> Dict[str, Any]:
    """
    Step 3: Once consent is ACTIVE, create a data session and fetch FI data.
    Returns raw account + transaction data.
    """
    date_range = _date_range()

    # Create data session
    async with httpx.AsyncClient(timeout=30) as client:
        session_r = await client.post(
            f"{SETU_BASE_URL}/v2/consents/{consent_id}/fetch",
            json={"DataRange": date_range, "format": "json", "version": "1.1.2"},
            headers=_headers(),
        )
        session_r.raise_for_status()
        session_data = session_r.json()

    session_id = session_data.get("id") or session_data.get("sessionId")

    # Fetch the actual data
    async with httpx.AsyncClient(timeout=30) as client:
        data_r = await client.get(
            f"{SETU_BASE_URL}/v2/sessions/{session_id}",
            headers=_headers(),
        )
        data_r.raise_for_status()
        fi_data = data_r.json()

    return fi_data


def extract_financial_profile(fi_data: Dict) -> Dict[str, Any]:
    """
    Parse Setu FI data response → structured profile for readiness scoring.
    Returns: { monthly_avg_balance, avg_monthly_credits, avg_monthly_debits,
               estimated_annual_turnover, num_accounts, has_salary, has_business_credits }
    """
    accounts = fi_data.get("FI", []) or fi_data.get("accounts", [])
    if not accounts:
        return {}

    total_credits = 0.0
    total_debits = 0.0
    total_balance = 0.0
    num_accounts = len(accounts)
    txn_months = set()

    for account in accounts:
        # Summary data
        summary = account.get("Summary", {}) or {}
        total_balance += float(summary.get("currentBalance") or summary.get("balance") or 0)

        # Transaction data
        transactions = (
            account.get("Transactions", {}).get("Transaction", [])
            or account.get("transactions", [])
        )
        for txn in transactions:
            amount = float(txn.get("amount") or txn.get("txnAmount") or 0)
            txn_type = (txn.get("type") or txn.get("transactionType") or "").upper()
            date_str = txn.get("transactionTimestamp") or txn.get("valueDate") or ""
            if date_str:
                try:
                    txn_months.add(date_str[:7])  # YYYY-MM
                except Exception:
                    pass
            if txn_type == "CREDIT":
                total_credits += amount
            elif txn_type == "DEBIT":
                total_debits += amount

    months = max(len(txn_months), 1)
    avg_monthly_credits = total_credits / months
    avg_monthly_debits = total_debits / months

    # Estimate annual turnover from credit flow
    estimated_annual_turnover = avg_monthly_credits * 12

    # Detect business vs salary pattern
    has_salary = avg_monthly_credits > 0 and (total_credits / months) < 200000  # < 2L/month typical salary
    has_business_credits = avg_monthly_credits > 50000  # 50k+ monthly credits suggests business activity

    return {
        "monthly_avg_balance": round(total_balance / num_accounts, 2),
        "avg_monthly_credits": round(avg_monthly_credits, 2),
        "avg_monthly_debits": round(avg_monthly_debits, 2),
        "estimated_annual_turnover": round(estimated_annual_turnover, 2),
        "num_accounts": num_accounts,
        "has_salary": has_salary,
        "has_business_credits": has_business_credits,
        "data_months": months,
    }


def enrich_business_profile_from_aa(bp: Dict, financial_profile: Dict) -> Dict:
    """
    Auto-fill / improve business profile fields using AA data.
    Only overwrites if existing value is missing/zero.
    """
    enriched = dict(bp)
    fp = financial_profile

    # Auto-set turnover if not already set
    if not enriched.get("annual_turnover") or int(enriched.get("annual_turnover") or 0) == 0:
        if fp.get("estimated_annual_turnover", 0) > 0:
            enriched["annual_turnover"] = int(fp["estimated_annual_turnover"])
            enriched["turnover_source"] = "account_aggregator"

    # Mark as existing business if there's business credit history
    if fp.get("has_business_credits") and not enriched.get("business_stage"):
        enriched["business_stage"] = "existing"

    enriched["aa_linked"] = True
    enriched["aa_monthly_avg_balance"] = fp.get("monthly_avg_balance", 0)
    enriched["aa_avg_monthly_credits"] = fp.get("avg_monthly_credits", 0)

    return enriched
