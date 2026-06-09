"""Backend tests for Saral Funding V1 upgrade — banks, readiness, alerts,
advisor/structured, lead/CRM, admin RBAC, analytics, CSV exports, Firebase scaffolding."""
import os
import time
import requests
import pytest

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
).rstrip("/")

SUPER_ADMIN_MOBILE = "9000000000"
EXPECTED_BANKS = {"sbi", "bob", "canara", "pnb", "union", "indian-bank", "hdfc", "icici", "axis"}


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def super_admin_headers(http):
    http.post(f"{BASE_URL}/api/auth/send-otp", json={"mobile": SUPER_ADMIN_MOBILE, "language": "en"}, timeout=15)
    r = http.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"mobile": SUPER_ADMIN_MOBILE, "code": "123456", "language": "en"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"].get("role") == "super_admin", f"super admin not seeded: {data['user']}"
    return {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}, data["user"]


@pytest.fixture(scope="module")
def user_v1(http):
    """A fully-onboarded normal user (role=user) for personalised endpoints."""
    mobile = f"9{(int(time.time()) + 1) % 1000000000:09d}"
    http.post(f"{BASE_URL}/api/auth/send-otp", json={"mobile": mobile, "language": "en"}, timeout=15)
    r = http.post(f"{BASE_URL}/api/auth/verify-otp", json={"mobile": mobile, "code": "123456"}, timeout=15)
    assert r.status_code == 200
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # complete onboarding
    http.post(f"{BASE_URL}/api/profile", headers=h, timeout=15, json={
        "full_name": "TEST_V1_User", "state": "Gujarat", "district": "Surat",
        "gender": "male", "age": 32, "category": "OBC",
    })
    http.post(f"{BASE_URL}/api/business-profile", headers=h, timeout=15, json={
        "business_stage": "existing", "industry": "Manufacturing",
        "funding_required": 2000000, "annual_turnover": 6000000,
        "employees": 12, "gst_available": True, "udyam_available": True,
    })
    http.post(f"{BASE_URL}/api/funding-assessment", headers=h, timeout=45, json={
        "business_type": "Manufacturing", "funding_requirement": 2000000,
        "business_location": "Gujarat", "existing_business": True,
        "woman_entrepreneur": False, "gst_registration": True,
        "udyam_registration": True, "existing_loans": False,
    })
    return h, token


# ---------------- Firebase scaffolding ----------------
class TestFirebaseScaffold:
    def test_root_reports_firebase_disabled(self, http):
        r = http.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("firebase") is False

    def test_firebase_verify_disabled_returns_401(self, http):
        r = http.post(f"{BASE_URL}/api/auth/firebase-verify",
                      json={"id_token": "dummy", "language": "en"}, timeout=15)
        assert r.status_code == 401


# ---------------- Banks ----------------
class TestBanks:
    def test_list_banks_returns_9(self, http):
        r = http.get(f"{BASE_URL}/api/banks", timeout=15)
        assert r.status_code == 200
        banks = r.json()
        assert isinstance(banks, list)
        assert len(banks) == 9, f"expected 9 banks, got {len(banks)}"
        ids = {b["id"] for b in banks}
        assert ids == EXPECTED_BANKS, f"missing/extra banks: {ids ^ EXPECTED_BANKS}"
        for b in banks:
            assert "_id" not in b
            for k in ("id", "name", "interest_min", "interest_max", "supports"):
                assert k in b, f"bank missing {k}"

    def test_get_bank_detail(self, http):
        r = http.get(f"{BASE_URL}/api/banks/sbi", timeout=15)
        assert r.status_code == 200
        b = r.json()
        assert b["id"] == "sbi"
        assert "_id" not in b

    def test_get_bank_not_found(self, http):
        r = http.get(f"{BASE_URL}/api/banks/no-such-bank", timeout=15)
        assert r.status_code == 404

    def test_recommend_my_banks(self, http, user_v1):
        h, _ = user_v1
        r = http.get(f"{BASE_URL}/api/banks/recommend/me", headers=h, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        recs = data.get("recommendations")
        assert isinstance(recs, list)
        assert len(recs) == 5, f"expected 5 recs, got {len(recs)}"
        for rec in recs:
            # spec requires score / interest_range / why; bank identifier exposed as bank_id or id
            for k in ("score", "interest_range", "why"):
                assert k in rec, f"rec missing {k}: {rec}"
            assert rec.get("bank_id") or rec.get("id"), f"rec missing bank identifier: {rec}"
            assert isinstance(rec["score"], (int, float))
            assert "_id" not in rec
        # ranked descending by score
        scores = [r["score"] for r in recs]
        assert scores == sorted(scores, reverse=True), "recommendations not sorted by score desc"

    def test_compare_banks(self, http):
        r = http.post(f"{BASE_URL}/api/banks/compare", json={"ids": ["sbi", "hdfc", "icici"]}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "banks" in data
        assert len(data["banks"]) == 3
        returned_ids = {b["id"] for b in data["banks"]}
        assert returned_ids == {"sbi", "hdfc", "icici"}


# ---------------- Readiness ----------------
class TestReadiness:
    def test_my_readiness(self, http, user_v1):
        h, _ = user_v1
        r = http.get(f"{BASE_URL}/api/readiness/me", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "score" in data
        assert 0 <= data["score"] <= 100
        assert "breakdown" in data and isinstance(data["breakdown"], (dict, list))
        assert "actions" in data and isinstance(data["actions"], list)


# ---------------- Alerts ----------------
class TestAlerts:
    def test_evaluate_alerts_and_dedupe(self, http, user_v1):
        h, _ = user_v1
        r1 = http.post(f"{BASE_URL}/api/alerts/evaluate", headers=h, timeout=20)
        assert r1.status_code == 200, r1.text
        data1 = r1.json()
        assert "new_alerts" in data1
        first_count = len(data1["new_alerts"])
        # second call should dedupe
        r2 = http.post(f"{BASE_URL}/api/alerts/evaluate", headers=h, timeout=20)
        assert r2.status_code == 200
        data2 = r2.json()
        assert len(data2["new_alerts"]) == 0, (
            f"dedupe failed: first={first_count} second={len(data2['new_alerts'])}"
        )
        for a in data1["new_alerts"]:
            assert "_id" not in a


# ---------------- Advisor structured ----------------
class TestAdvisorStructured:
    def test_structured_response_shape(self, http, user_v1):
        h, _ = user_v1
        r = http.post(
            f"{BASE_URL}/api/advisor/structured", headers=h, timeout=90,
            json={"query": "I want to start a manufacturing unit in Gujarat with 20L funding", "language": "en"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("summary", "schemes", "banks", "documents", "roadmap", "next_steps", "why"):
            assert k in data, f"missing key {k} in structured response: {list(data.keys())}"


# ---------------- Consultation auto-creates lead ----------------
class TestConsultationCreatesLead(object):
    def test_book_consultation_creates_lead(self, http, user_v1, super_admin_headers):
        h, _ = user_v1
        admin_h, _ = super_admin_headers
        payload = {
            "consultation_type": "Funding Guidance",
            "date": "2026-03-10",
            "time_slot": "11:00 AM - 12:00 PM",
            "notes": "TEST_V1_lead_check",
        }
        r = http.post(f"{BASE_URL}/api/consultations", headers=h, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        # Admin lead listing must include lead with this consultation_id and stage=new
        rl = http.get(f"{BASE_URL}/api/admin/leads", headers=admin_h, timeout=15)
        assert rl.status_code == 200
        leads = rl.json()
        matching = [l for l in leads if l.get("consultation_id") == cid]
        assert matching, f"no lead created for consultation {cid}"
        assert matching[0]["stage"] == "new"
        for l in leads:
            assert "_id" not in l


# ---------------- RBAC ----------------
class TestRBAC:
    @pytest.mark.parametrize("method,path", [
        ("get", "/api/admin/overview"),
        ("get", "/api/admin/users"),
        ("get", "/api/admin/schemes"),
        ("get", "/api/admin/consultations"),
        ("get", "/api/admin/leads"),
        ("get", "/api/admin/analytics"),
        ("get", "/api/admin/exports/users.csv"),
        ("get", "/api/admin/exports/leads.csv"),
        ("get", "/api/admin/exports/consultations.csv"),
        ("get", "/api/admin/exports/schemes.csv"),
    ])
    def test_non_admin_forbidden(self, http, user_v1, method, path):
        h, _ = user_v1
        fn = getattr(http, method)
        r = fn(f"{BASE_URL}{path}", headers=h, timeout=15)
        assert r.status_code == 403, f"{path} expected 403 for normal user, got {r.status_code}"

    @pytest.mark.parametrize("path", [
        "/api/admin/overview", "/api/admin/users", "/api/admin/schemes",
        "/api/admin/consultations", "/api/admin/leads", "/api/admin/analytics",
        "/api/admin/exports/users.csv",
    ])
    def test_missing_token_401(self, http, path):
        r = http.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 401, f"{path} expected 401 without token, got {r.status_code}"

    def test_non_super_admin_cannot_update_role(self, http, user_v1):
        # normal user attempts to update someone's role -> 403
        h, _ = user_v1
        r = http.post(f"{BASE_URL}/api/admin/users/anything/role",
                      headers=h, json={"role": "manager"}, timeout=15)
        assert r.status_code == 403


# ---------------- Admin endpoints (super admin) ----------------
class TestAdmin:
    def test_overview(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/overview", headers=h, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        # expect at least totals about users/schemes/consultations/leads
        assert len(data) >= 3

    def test_list_users_search_and_filter(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/users", headers=h, timeout=15)
        assert r.status_code == 200
        all_users = r.json()
        assert isinstance(all_users, list)
        assert any(u.get("mobile") == SUPER_ADMIN_MOBILE for u in all_users)
        for u in all_users:
            assert "_id" not in u

        # filter by role
        r2 = http.get(f"{BASE_URL}/api/admin/users", headers=h, params={"role": "super_admin"}, timeout=15)
        assert r2.status_code == 200
        admins = r2.json()
        assert len(admins) >= 1
        for u in admins:
            assert u["role"] == "super_admin"

        # search by mobile prefix
        r3 = http.get(f"{BASE_URL}/api/admin/users", headers=h, params={"q": SUPER_ADMIN_MOBILE}, timeout=15)
        assert r3.status_code == 200
        assert any(u["mobile"] == SUPER_ADMIN_MOBILE for u in r3.json())

    def test_user_detail(self, http, super_admin_headers, user_v1):
        admin_h, _ = super_admin_headers
        _, token = user_v1
        # token is the user id
        r = http.get(f"{BASE_URL}/api/admin/users/{token}", headers=admin_h, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "user" in data and "business_profile" in data and "assessment" in data and "matches" in data
        assert "_id" not in data["user"]

    def test_role_update_super_admin_only(self, http, super_admin_headers, user_v1):
        admin_h, _ = super_admin_headers
        _, uid = user_v1
        # set to manager
        r = http.post(f"{BASE_URL}/api/admin/users/{uid}/role",
                      headers=admin_h, json={"role": "manager"}, timeout=15)
        assert r.status_code == 200, r.text
        # verify
        r2 = http.get(f"{BASE_URL}/api/admin/users/{uid}", headers=admin_h, timeout=15)
        assert r2.json()["user"]["role"] == "manager"
        # restore to user
        http.post(f"{BASE_URL}/api/admin/users/{uid}/role",
                  headers=admin_h, json={"role": "user"}, timeout=15)

    def test_admin_invalid_role_rejected(self, http, super_admin_headers, user_v1):
        admin_h, _ = super_admin_headers
        _, uid = user_v1
        r = http.post(f"{BASE_URL}/api/admin/users/{uid}/role",
                      headers=admin_h, json={"role": "godmode"}, timeout=15)
        assert r.status_code == 400

    def test_schemes_create_disable_enable(self, http, super_admin_headers):
        h, _ = super_admin_headers
        sid = f"test-scheme-{int(time.time())}"
        payload = {
            "id": sid, "name": "TEST_Scheme", "full_name": "TEST", "description": "test",
            "eligibility": ["e1"], "benefits": ["b1"], "max_funding": 100000,
            "max_subsidy_percent": 10, "documents": ["d1"], "process": "p",
            "categories": ["MSME"], "states": ["All India"], "tags": [], "disabled": False,
        }
        r = http.post(f"{BASE_URL}/api/admin/schemes", headers=h, json=payload, timeout=15)
        assert r.status_code == 200, r.text
        # disable
        rd = http.post(f"{BASE_URL}/api/admin/schemes/{sid}/disable", headers=h, timeout=15)
        assert rd.status_code == 200
        # disabled scheme is hidden from public list
        public = http.get(f"{BASE_URL}/api/schemes", timeout=15).json()
        assert all(s["id"] != sid for s in public)
        # enable
        re = http.post(f"{BASE_URL}/api/admin/schemes/{sid}/enable", headers=h, timeout=15)
        assert re.status_code == 200
        # delete (super-admin only)
        rdel = http.delete(f"{BASE_URL}/api/admin/schemes/{sid}", headers=h, timeout=15)
        assert rdel.status_code == 200

    def test_consultation_status_mirrors_lead(self, http, super_admin_headers, user_v1):
        admin_h, _ = super_admin_headers
        h, _ = user_v1
        # book a fresh consultation
        cr = http.post(f"{BASE_URL}/api/consultations", headers=h, timeout=15, json={
            "consultation_type": "Funding Guidance", "date": "2026-04-01",
            "time_slot": "9:00 AM - 10:00 AM", "notes": "TEST_mirror",
        })
        assert cr.status_code == 200
        cid = cr.json()["id"]

        # admin updates status -> 'interested'
        ru = http.post(f"{BASE_URL}/api/admin/consultations/{cid}",
                       headers=admin_h, json={"status": "interested"}, timeout=15)
        assert ru.status_code == 200

        # lead with this consultation_id should now be stage=interested
        leads = http.get(f"{BASE_URL}/api/admin/leads", headers=admin_h, timeout=15).json()
        match = next((l for l in leads if l.get("consultation_id") == cid), None)
        assert match is not None
        assert match["stage"] == "interested"

    def test_admin_update_lead_stage(self, http, super_admin_headers):
        h, _ = super_admin_headers
        leads = http.get(f"{BASE_URL}/api/admin/leads", headers=h, timeout=15).json()
        assert leads, "no leads in system"
        lid = leads[0]["id"]
        r = http.post(f"{BASE_URL}/api/admin/leads/{lid}", headers=h,
                      json={"stage": "documentation"}, timeout=15)
        assert r.status_code == 200
        # invalid stage
        r2 = http.post(f"{BASE_URL}/api/admin/leads/{lid}", headers=h,
                       json={"stage": "bogus"}, timeout=15)
        assert r2.status_code == 400

    def test_admin_filter_leads_by_stage(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/leads", headers=h,
                     params={"stage": "new"}, timeout=15)
        assert r.status_code == 200
        for l in r.json():
            assert l["stage"] == "new"

    def test_admin_filter_consultations_by_status(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/consultations", headers=h,
                     params={"status": "new"}, timeout=15)
        assert r.status_code == 200
        for c in r.json():
            assert c["status"] == "new"

    def test_admin_broadcast_notification(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.post(f"{BASE_URL}/api/admin/notifications", headers=h, timeout=20, json={
            "title": "TEST_Broadcast", "body": "regression broadcast", "type": "platform",
        })
        assert r.status_code == 200, r.text
        assert r.json().get("sent", 0) >= 0  # may be 0 if no user-role users


# ---------------- Analytics ----------------
class TestAnalytics:
    def test_analytics_shape(self, http, super_admin_headers):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/analytics", headers=h, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("popular_schemes", "state_distribution", "consultation_status", "lead_pipeline"):
            assert k in data, f"missing analytics key {k}"


# ---------------- CSV Exports ----------------
class TestExports:
    @pytest.mark.parametrize("file", ["users.csv", "leads.csv", "consultations.csv", "schemes.csv"])
    def test_export_returns_csv(self, http, super_admin_headers, file):
        h, _ = super_admin_headers
        r = http.get(f"{BASE_URL}/api/admin/exports/{file}", headers=h, timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct, f"expected text/csv, got {ct}"
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower(), f"missing attachment disposition: {cd}"
        # body must have a header row (at minimum)
        header = r.text.split("\n")[0]
        assert len(r.text.splitlines()) >= 1
        # no raw mongo _id column (allow user_id/consultation_id substrings)
        cols = [c.strip() for c in header.split(",")]
        assert "_id" not in cols, f"raw _id column leaked: {cols}"
