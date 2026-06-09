import os
import pytest
import requests

# Use public Expo backend URL (EXPO_PUBLIC_BACKEND_URL is what frontend uses)
BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "https://saral-schemes.preview.emergentagent.com"
).rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_mobile():
    # unique per-run mobile to avoid clashes
    import time
    return f"9{int(time.time()) % 1000000000:09d}"


@pytest.fixture(scope="session")
def auth(api_client, test_mobile):
    """Register + verify OTP, return (token, user)."""
    api_client.post(f"{BASE_URL}/api/auth/send-otp", json={"mobile": test_mobile, "language": "en"}, timeout=15)
    r = api_client.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"mobile": test_mobile, "code": "123456", "language": "en"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]


@pytest.fixture(scope="session")
def auth_headers(auth):
    token, _ = auth
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
