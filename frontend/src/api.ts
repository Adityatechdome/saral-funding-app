import { storage } from "./utils/storage";

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
export const API_BASE = `${BASE}/api`;

async function authHeader(): Promise<Record<string, string>> {
  const token = await storage.getItem<string>("auth_token", "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

export async function setToken(token: string) {
  await storage.setItem("auth_token", token);
}

export async function getToken(): Promise<string> {
  return (await storage.getItem<string>("auth_token", "")) || "";
}

export async function clearToken() {
  await storage.removeItem("auth_token");
}
