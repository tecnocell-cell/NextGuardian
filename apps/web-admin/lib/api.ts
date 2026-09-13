const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const TOKEN_KEY = 'ng_token';

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.href = '/login';
    throw new ApiError(401, 'Sessão expirada');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (body as { message?: string })?.message || `Erro ${res.status}`);
  return body as T;
}

function idempotencyKey(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random()}`; }
}

// ---- Contract types (subset used by the console) ----
export interface Account { id: string; name: string; profile: string }
export interface User { id: string; accountId: string; name: string; email: string }
export interface AccountMe { account: Account; user: User; deviceCount: number; serverTime: string }
export interface DeviceSummary {
  id: string; name: string; pairingState: string; manufacturer: string; model: string;
  androidVersion: string; appVersion: string; lastSync: string | null; batteryLevel: number | null; networkType: string | null;
}
export interface Subscription { accountId: string; state: string; trialStartedAt: string; trialExpiresAt: string }
export interface AuthResponse { account: Account; user: User; session: { accessToken: string; refreshToken: string; accessExpiresAt: string }; activationCode: { value: string; expiresAt: string }; serverTime: string }

// ---- Endpoints ----
export const login = (email: string, password: string) =>
  api<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (name: string, email: string, password: string) =>
  api<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }), headers: { 'Idempotency-Key': idempotencyKey() } });

export const getAccount = () => api<AccountMe>('/account/me');
export const listDevices = () => api<{ devices: DeviceSummary[]; serverTime: string }>('/devices');
export const getSubscription = () => api<{ subscription: Subscription | null; serverTime: string }>('/subscription/me');
export const issueActivationCode = () =>
  api<{ value: string; expiresAt: string; serverTime: string }>('/activation/codes', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey() } });
export const revokeDevice = (deviceId: string) =>
  api('/devices/revoke', { method: 'POST', body: JSON.stringify({ deviceId }) });
