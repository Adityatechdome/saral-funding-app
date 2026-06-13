import { storage } from "./utils/storage";

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
export const API_BASE = `${BASE}/api`;

// ── Token storage ─────────────────────────────────────────────────────────────
export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    storage.setItem("auth_token", accessToken),
    storage.setItem("refresh_token", refreshToken),
  ]);
}

export async function setToken(token: string) {
  await storage.setItem("auth_token", token);
}

export async function getToken(): Promise<string> {
  return (await storage.getItem<string>("auth_token", "")) || "";
}

export async function clearToken() {
  await Promise.all([
    storage.removeItem("auth_token"),
    storage.removeItem("refresh_token"),
  ]);
}

// ── Token refresh ─────────────────────────────────────────────────────────────
let _refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = await storage.getItem<string>("refresh_token", "");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      await clearToken();
      return null;
    }
    const data = await res.json();
    await setTokens(data.token, data.refresh_token);
    return data.token as string;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  // Deduplicate concurrent refresh calls — only one in-flight at a time
  if (!_refreshPromise) {
    _refreshPromise = doRefresh().finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

// ── Core request with auto-refresh ───────────────────────────────────────────
async function request<T>(
  path: string,
  init: RequestInit,
  retry = true,
): Promise<T> {
  const token = await getToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...init.headers, ...authHeaders },
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, init, false);
    }
    // Refresh failed — caller sees the 401
    throw new Error(`401 Unauthorized: session expired. Please log in again.`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${init.method || "GET"} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Public API helpers ────────────────────────────────────────────────────────
export async function apiGet<T = any>(path: string): Promise<T> {
  return request<T>(path, {});
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export async function apiLogout(): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } catch {
    // best-effort — clear tokens regardless
  }
  await clearToken();
}
