"""Backend integration tests for Saral Funding MVP - full flow + edge cases."""
import os
import requests
import pytest

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://saral-schemes.preview.emergentagent.com"
).rstrip("/")


# ----------------- Health -----------------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("message") == "Saral Funding API"


# ----------------- Auth -----------------
class TestAuth:
    def test_send_otp_returns_mock_code(self, api_client, test_mobile):
        r = api_client.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"mobile": test_mobile, "language": "en"},
            timeout=15,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("success") is True
        assert body.get("mock_code") == "123456"

    def test_send_otp_invalid_mobile(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/auth/send-otp",
            json={"mobile": "123", "language": "en"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_verify_otp_wrong_code(self, api_client, test_mobile):
        r = api_client.post(
            f"{BASE_URL}/api/auth/verify-otp",
            json={"mobile": test_mobile, "code": "999999"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_verify_otp_success_creates_user(self, auth):
        token, user = auth
        assert token
        assert user["mobile"]
        assert user["onboarding_step"] == "profile"
        assert "_id" not in user

    def test_me_with_token(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        user = r.json()
        assert user["id"]
        assert "_id" not in user

    def test_me_without_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid_token(self, api_client):
        r = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer not-a-real-token"},
            timeout=15,
        )
        assert r.status_code == 401


# ----------------- Onboarding flow -----------------
class TestOnboarding:
    def test_save_personal_profile_advances_step(self, api_client, auth_headers):
        payload = {
            "full_name": "TEST_Ravi Kumar",
            "state": "Gujarat",
            "district": "Ahmedabad",
            "gender": "male",
            "age": 32,
            "category": "OBC",
        }
        r = api_client.post(f"{BASE_URL}/api/profile", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["full_name"] == "TEST_Ravi Kumar"
        assert data["state"] == "Gujarat"
        assert data["onboarding_step"] == "business"
        assert "_id" not in data

        # Verify via /auth/me
        me = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15).json()
        assert me["onboarding_step"] == "business"
        assert me["state"] == "Gujarat"

    def test_save_business_profile_advances_step(self, api_client, auth_headers):
        payload = {
            "business_stage": "existing",
            "industry": "Manufacturing",
            "funding_required": 1500000,
            "annual_turnover": 5000000,
            "employees": 10,
            "gst_available": True,
            "udyam_available": True,
        }
        r = api_client.post(f"{BASE_URL}/api/business-profile", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["business_profile"]["industry"] == "Manufacturing"
        assert "_id" not in data and "_id" not in data["business_profile"]

        me = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15).json()
        assert me["onboarding_step"] == "assessment"

        # GET business-profile reflects persistence
        g = api_client.get(f"{BASE_URL}/api/business-profile", headers=auth_headers, timeout=15)
        assert g.status_code == 200
        bp = g.json()
        assert bp["funding_required"] == 1500000
        assert "_id" not in bp

    def test_save_funding_assessment_advances_and_triggers_match(self, api_client, auth_headers):
        payload = {
            "business_type": "Manufacturing",
            "funding_requirement": 1500000,
            "business_location": "Gujarat",
            "existing_business": True,
            "woman_entrepreneur": False,
            "gst_registration": True,
            "udyam_registration": True,
            "existing_loans": False,
        }
        r = api_client.post(
            f"{BASE_URL}/api/funding-assessment",
            json=payload,
            headers=auth_headers,
            timeout=30,  # match compute may call LLM
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        me = api_client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15).json()
        assert me["onboarding_step"] == "done"


# ----------------- Matches & Dashboard -----------------
class TestMatches:
    def test_match_me_returns_dashboard(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/match/me", headers=auth_headers, timeout=45)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "matches" in data
        assert "funding_estimate" in data
        assert "subsidy_estimate" in data
        assert "readiness_score" in data
        assert isinstance(data["matches"], list)
        assert len(data["matches"]) >= 3
        first = data["matches"][0]
        for k in ("scheme_id", "name", "score", "funding_estimate", "subsidy_estimate", "reason"):
            assert k in first, f"missing key {k} in match"
        assert isinstance(first["score"], int)
        assert 0 <= data["readiness_score"] <= 100
        # no mongo id leak
        for m in data["matches"]:
            assert "_id" not in m


# ----------------- Schemes -----------------
class TestSchemes:
    def test_list_all_schemes_seeded(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes", timeout=15)
        assert r.status_code == 200
        schemes = r.json()
        assert isinstance(schemes, list)
        assert len(schemes) >= 11, f"expected >=11 seeded schemes, got {len(schemes)}"
        ids = {s["id"] for s in schemes}
        # spot-check key seeded IDs
        for must in ("pmegp", "mudra", "standupindia", "cgtmse", "vishwakarma", "svanidhi",
                     "startupindia", "sidbi-make-in-india", "gujarat-msme", "mp-msme", "maharashtra-msme"):
            assert must in ids, f"missing seeded scheme {must}"
        for s in schemes:
            assert "_id" not in s

    def test_filter_by_category_women(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes", params={"category": "Women"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for s in items:
            assert "Women" in s["categories"]

    def test_filter_by_category_manufacturing(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes", params={"category": "Manufacturing"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 3
        for s in items:
            assert "Manufacturing" in s["categories"]

    def test_filter_by_category_startup_and_msme(self, api_client):
        for cat in ("Startup", "MSME"):
            r = api_client.get(f"{BASE_URL}/api/schemes", params={"category": cat}, timeout=15)
            assert r.status_code == 200, cat
            items = r.json()
            assert len(items) >= 1, cat
            for s in items:
                assert cat in s["categories"]

    def test_search_query(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes", params={"q": "mudra"}, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        assert any("mudra" in s["name"].lower() or "mudra" in s["description"].lower() for s in items)

    def test_scheme_detail(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes/pmegp", timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ("id", "name", "full_name", "description", "eligibility", "benefits",
                  "documents", "process", "states", "categories"):
            assert k in s, f"missing key {k}"
        assert s["id"] == "pmegp"
        assert isinstance(s["eligibility"], list) and len(s["eligibility"]) > 0
        assert "_id" not in s

    def test_scheme_detail_not_found(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/schemes/no-such-scheme", timeout=15)
        assert r.status_code == 404


# ----------------- Advisor (GPT-4o) -----------------
class TestAdvisor:
    def test_advisor_chat_and_history(self, api_client, auth_headers):
        # Clear first
        api_client.delete(f"{BASE_URL}/api/advisor/history", headers=auth_headers, timeout=15)

        r = api_client.post(
            f"{BASE_URL}/api/advisor/chat",
            json={"message": "Which scheme is best for an existing manufacturing MSME in Gujarat?",
                  "language": "en"},
            headers=auth_headers,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 5
        assert "messages" in data and len(data["messages"]) == 2

        # history
        h = api_client.get(f"{BASE_URL}/api/advisor/history", headers=auth_headers, timeout=15)
        assert h.status_code == 200
        msgs = h.json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"

        # clear
        d = api_client.delete(f"{BASE_URL}/api/advisor/history", headers=auth_headers, timeout=15)
        assert d.status_code == 200
        h2 = api_client.get(f"{BASE_URL}/api/advisor/history", headers=auth_headers, timeout=15).json()
        assert h2["messages"] == []


# ----------------- Consultations -----------------
class TestConsultations:
    def test_book_and_list_consultation(self, api_client, auth_headers):
        payload = {
            "consultation_type": "Funding Guidance",
            "date": "2026-02-15",
            "time_slot": "10:00 AM - 11:00 AM",
            "notes": "TEST_consultation",
        }
        r = api_client.post(f"{BASE_URL}/api/consultations", json=payload, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        booking = r.json()
        assert booking["status"] in ("new", "confirmed")  # V1: defaults to "new" in CRM pipeline
        assert booking["consultation_type"] == "Funding Guidance"
        assert "id" in booking
        assert "_id" not in booking

        lst = api_client.get(f"{BASE_URL}/api/consultations/me", headers=auth_headers, timeout=15)
        assert lst.status_code == 200
        items = lst.json()
        assert any(c["id"] == booking["id"] for c in items)
        for c in items:
            assert "_id" not in c


# ----------------- Notifications -----------------
class TestNotifications:
    def test_notifications_list_and_mark_read(self, api_client, auth_headers):
        r = api_client.get(f"{BASE_URL}/api/notifications/me", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1  # at least welcome notification
        for n in items:
            assert "_id" not in n
            assert "id" in n and "title" in n and "read" in n

        nid = items[0]["id"]
        m = api_client.post(f"{BASE_URL}/api/notifications/{nid}/read", headers=auth_headers, timeout=15)
        assert m.status_code == 200
        assert m.json().get("ok") is True

        items2 = api_client.get(f"{BASE_URL}/api/notifications/me", headers=auth_headers, timeout=15).json()
        target = next((n for n in items2 if n["id"] == nid), None)
        assert target is not None
        assert target["read"] is True


# ----------------- Auth Protection -----------------
class TestAuthProtection:
    """Ensure 401 is returned for missing Authorization header on protected endpoints."""
    @pytest.mark.parametrize("method,path,body", [
        ("get", "/api/auth/me", None),
        ("post", "/api/profile", {"full_name": "x", "state": "Gujarat", "district": "X",
                                   "gender": "male", "age": 30, "category": "General"}),
        ("post", "/api/business-profile", {"business_stage": "new", "industry": "Service",
                                            "funding_required": 100000, "annual_turnover": 0,
                                            "employees": 1, "gst_available": False, "udyam_available": False}),
        ("get", "/api/business-profile", None),
        ("post", "/api/funding-assessment", {"business_type": "Service", "funding_requirement": 100000,
                                              "business_location": "Gujarat", "existing_business": False,
                                              "woman_entrepreneur": False, "gst_registration": False,
                                              "udyam_registration": False, "existing_loans": False}),
        ("get", "/api/funding-assessment", None),
        ("get", "/api/match/me", None),
        ("post", "/api/match/recompute", {}),
        ("post", "/api/advisor/chat", {"message": "hi"}),
        ("get", "/api/advisor/history", None),
        ("delete", "/api/advisor/history", None),
        ("post", "/api/consultations", {"consultation_type": "Funding Guidance",
                                         "date": "2026-02-15", "time_slot": "10AM"}),
        ("get", "/api/consultations/me", None),
        ("get", "/api/notifications/me", None),
    ])
    def test_protected_endpoint_requires_auth(self, api_client, method, path, body):
        url = f"{BASE_URL}{path}"
        fn = getattr(api_client, method)
        r = fn(url, json=body, timeout=15) if body is not None else fn(url, timeout=15)
        assert r.status_code == 401, f"{method.upper()} {path} expected 401, got {r.status_code}"
