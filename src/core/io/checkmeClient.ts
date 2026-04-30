/**
 * Phone OTP via your app backend (same origin in dev: Vite proxies `/api` → your server).
 *
 * Documented send:
 *   POST /api/send-otp
 *   { "phone": "+1-555-555-5555" }
 *   → { "status": "awaiting", "phone": "+1-555-555-5555" }
 *
 * Verify (defaults below — override paths if your API differs):
 *   POST /api/verify-otp
 *   { "phone": "...", "code": "123456" }
 *   → { "verified": true } or { "status": "verified" }
 *
 * Optional: `VITE_OTP_API_BASE` (e.g. https://www.123checkme.com or http://127.0.0.1:3010 for Tauri / no proxy),
 * `VITE_OTP_SEND_PATH`, `VITE_OTP_VERIFY_PATH`, `VITE_OTP_API_BEARER`.
 */

function trimQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, '').trim();
}

function getOptionalBearer(): string | undefined {
  const a = import.meta.env.VITE_OTP_API_BEARER;
  /** May be set directly or merged from `123CHECKME_KEY` in `vite.config.ts` `define`. */
  const b = import.meta.env.VITE_123CHECKME_KEY;
  const c = import.meta.env.VITE_CHECKME_API_KEY;
  const raw = (typeof a === 'string' && a.trim()) || (typeof b === 'string' && b.trim()) || (typeof c === 'string' && c.trim()) || '';
  const v = trimQuotes(raw);
  return v || undefined;
}

function getApiBase(): string {
  const b = import.meta.env.VITE_OTP_API_BASE;
  return typeof b === 'string' ? b.replace(/\/$/, '') : '';
}

function sendPath(): string {
  const p = import.meta.env.VITE_OTP_SEND_PATH;
  return typeof p === 'string' && p.startsWith('/') ? p : '/api/send-otp';
}

function verifyPath(): string {
  const p = import.meta.env.VITE_OTP_VERIFY_PATH;
  return typeof p === 'string' && p.startsWith('/') ? p : '/api/verify-otp';
}

function resolveUrl(path: string): string {
  const base = getApiBase();
  return base ? `${base}${path}` : path;
}

/**
 * Strip to digits and build E.164. Handles NANP (US/CA): 10-digit local → `+1` + NPA-NXX-XXXX.
 * NANP rules run **before** blindly re-attaching `+` so values like `+7025405471` become `+17025405471`
 * (same digit string as US local 702-540-5471, not country code 702).
 */
export function normalizePhoneE164(input: string): string {
  const s = input.trim();
  const digits = s.replace(/\D/g, '');
  if (!digits) throw new Error('Phone number is required');

  // NANP 10-digit (NPA first digit 2–9)
  if (digits.length === 10 && /^[2-9]\d{9}$/.test(digits)) {
    return `+1${digits}`;
  }
  // NANP with leading country 1
  if (digits.length === 11 && digits.startsWith('1') && /^1[2-9]\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

function parseVerifySuccessPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.verified === true || o.success === true || o.valid === true || o.approved === true) {
    return true;
  }
  if (typeof o.status === 'string') {
    const s = o.status.toLowerCase();
    if (s === 'verified' || s === 'success' || s === 'ok' || s === 'approved') return true;
  }
  const nested = o.verification_check ?? o.verificationCheck ?? o.verificationResult;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    if (typeof n.status === 'string' && n.status.toLowerCase() === 'approved') return true;
    if (n.valid === true || n.success === true) return true;
  }
  return false;
}

function readJsonError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;
  if (typeof d.error === 'string') return d.error;
  if (d.error && typeof d.error === 'object' && 'message' in d.error) {
    const m = (d.error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  if (typeof d.message === 'string') return d.message;
  return fallback;
}

/** 123checkme returns HTTP 500 + `Authenticate` when the API key is missing or rejected (see `providerCode` 20003). */
function clarifyOtpUpstreamError(status: number, message: string, raw: unknown): string {
  if (status !== 500 && status !== 401 && status !== 403) return message;
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  const code = o?.providerCode;
  const looksLikeCheckmeAuth =
    message === 'Authenticate' ||
    (typeof code === 'number' && code === 20003) ||
    (o?.success === false && typeof o.error === 'string' && o.error.toLowerCase().includes('auth'));
  if (!looksLikeCheckmeAuth) return message;
  return (
    `${message} — 123checkme rejected this call (usually missing or invalid API key). ` +
    'Set `VITE_123CHECKME_KEY` or `VITE_OTP_API_BEARER` in `.env.local` and restart Vite. ' +
    'Production: keys are baked in at `npm run build`; rebuild after changing them. ' +
    'Twilio/Supabase on the checkme host are unrelated to whether the browser sends a valid checkme API key.'
  );
}

async function postJson(path: string, body: Record<string, unknown>): Promise<unknown> {
  const bearer = getOptionalBearer();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
    // 123checkme server.js also accepts the same secret via x-api-key (or body.api_key).
    headers['x-api-key'] = bearer;
  }

  const response = await fetch(resolveUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    let msg = readJsonError(data, response.statusText || 'Request failed');
    msg = clarifyOtpUpstreamError(response.status, msg, data);
    if (response.status === 404) {
      msg =
        `${msg} — nothing at POST ${path}. ` +
        'OTP is served by the main app (server.js). In dev, run that process and match `VITE_OTP_PROXY_TARGET`, ' +
        'or set `VITE_OTP_API_BASE` (e.g. https://www.123checkme.com). ' +
        'A separate Governance API is only in play when `VITE_GOVERNANCE_PROXY_TARGET` points to it.';
    }
    throw new Error(msg);
  }
  return data;
}

export interface SendOtpResponse {
  status: string;
  phone: string;
  raw: unknown;
}

export interface VerifyOtpResult {
  verified: boolean;
  operatorToken?: string;
  operatorPhone?: string;
  raw: unknown;
}

/** POST /api/send-otp — body `{ phone }`. */
export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  const p = normalizePhoneE164(phone);

  const raw = await postJson(sendPath(), { phone: p });
  const o = raw as { status?: unknown; phone?: unknown; success?: unknown; message?: unknown };
  let phoneOut: string;
  if (typeof o.phone === 'string' && o.phone.trim()) {
    try {
      phoneOut = normalizePhoneE164(o.phone);
    } catch {
      phoneOut = p;
    }
  } else if (o.success === true && p) {
    // Some backends return only { success, message } after Twilio Verify send.
    phoneOut = p; // already E.164
  } else {
    throw new Error('Invalid response: missing phone');
  }
  const status =
    typeof o.status === 'string'
      ? o.status
      : o.success === true
        ? 'awaiting'
        : 'unknown';
  return { status, phone: phoneOut, raw };
}

/** POST /api/verify-otp — body `{ phone, code }`. */
export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const p = normalizePhoneE164(phone);
  const c = code.replace(/\D/g, '').trim();
  if (!p || !c) throw new Error('phone and code are required');
  if (c.length !== 6) throw new Error('Enter a 6-digit code');

  const raw = await postJson(verifyPath(), { phone: p, code: c });
  const verified = parseVerifySuccessPayload(raw);
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const operatorToken = typeof o.operator_token === 'string' ? o.operator_token : undefined;
  const operatorPhone = typeof o.operator_phone === 'string' ? o.operator_phone : undefined;
  return { verified, operatorToken, operatorPhone, raw };
}

export async function restoreOperatorToken(phone: string): Promise<string | null> {
  const p = normalizePhoneE164(phone);
  const response = await fetch('/api/operator-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: p }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) return null;
  const token = typeof data.operator_token === 'string' ? data.operator_token : null;
  if (token) {
    localStorage.setItem(AIOS_OPERATOR_TOKEN_KEY, token);
  }
  return token;
}

export function formatCheckmeUserError(message: string): string {
  return message;
}

/** Set after a successful send — used on the OTP step with `verifyOtp`. */
export const CHECKME_SESSION_PHONE_KEY = 'aios_otp_pending_phone';
export const AIOS_OPERATOR_TOKEN_KEY = 'aios_operator_token';

/** @deprecated Use CHECKME_SESSION_PHONE_KEY; kept for any stale sessionStorage cleanup. */
export const CHECKME_SESSION_VERIFICATION_ID_KEY = 'aios_checkme_verification_code_id';
