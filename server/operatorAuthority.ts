/**
 * Server-side operator authority for phone-verified shell sessions.
 * Issues short-lived HMAC tokens only after OTP success and server-side operator lookup.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type User } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabaseTypes';

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

type OperatorTokenPayload = {
  phone: string;
  iat: number;
  exp: number;
};

type Target = { label: string; url: string; key: string };

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function tokenSecret(env: Record<string, string>): string {
  return (
    env.AIOS_OPERATOR_TOKEN_SECRET ||
    env.AI_OS_SUPABASE_SERVICE_ROLE_KEY ||
    env.AI_OS_SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env['123CHECKME_KEY'] ||
    'dev-only-operator-token-secret'
  );
}

export function normalizePhoneE164(input: string): string {
  const digits = input.trim().replace(/\D/g, '');
  if (!digits) throw new Error('phone_required');
  if (digits.length === 10 && /^[2-9]\d{9}$/.test(digits)) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1') && /^1[2-9]\d{9}$/.test(digits)) return `+${digits}`;
  return `+${digits}`;
}

function phonesMatch(a: string | undefined, b: string): boolean {
  if (!a) return false;
  try {
    return normalizePhoneE164(a) === normalizePhoneE164(b);
  } catch {
    return false;
  }
}

function hasAdminClaim(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  const claim = user?.app_metadata?.is_admin;
  return claim === true || claim === 'true';
}

function allowedOperatorPhones(env: Record<string, string>): string[] {
  const raw = [
    env.AIOS_OPERATOR_PHONES,
    env.VITE_AIOS_OPERATOR_PHONES,
    env.ADMIN_PHONES,
  ]
    .filter(Boolean)
    .join(',');
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return normalizePhoneE164(item);
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function targetsFromEnv(env: Record<string, string>): Target[] {
  const out: Target[] = [];
  const aiOsServiceRoleKey = env.AI_OS_SUPABASE_SERVICE_ROLE_KEY || env.AI_OS_SUPABASE_SECRET_KEY;
  if (env.AI_OS_SUPABASE_URL && aiOsServiceRoleKey) {
    out.push({ label: 'AI_OS', url: env.AI_OS_SUPABASE_URL, key: aiOsServiceRoleKey });
  }
  if (env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    out.push({ label: 'VITE', url: env.VITE_SUPABASE_URL, key: env.SUPABASE_SERVICE_ROLE_KEY });
  }
  return out;
}

async function findUserByPhone(client: ReturnType<typeof createClient<Database>>, phone: string): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const user of data.users) {
      if (phonesMatch(user.phone, phone)) return user;
    }
    if (data.users.length < 200) break;
  }
  return null;
}

export async function phoneHasOperatorAuthority(env: Record<string, string>, phoneInput: string): Promise<boolean> {
  const phone = normalizePhoneE164(phoneInput);
  if (allowedOperatorPhones(env).includes(phone)) return true;

  for (const target of targetsFromEnv(env)) {
    const client = createClient<Database>(target.url, target.key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const user = await findUserByPhone(client, phone);
    if (hasAdminClaim(user)) return true;
  }
  return false;
}

export function issueOperatorToken(env: Record<string, string>, phoneInput: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: OperatorTokenPayload = {
    phone: normalizePhoneE164(phoneInput),
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(tokenSecret(env), encodedPayload)}`;
}

export function verifyOperatorToken(
  env: Record<string, string>,
  token: string | undefined,
): { ok: true; phone: string } | { ok: false; reason: string } {
  if (!token) return { ok: false, reason: 'missing_operator_token' };
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return { ok: false, reason: 'invalid_operator_token' };

  const expected = sign(tokenSecret(env), encodedPayload);
  const actualBuffer = Buffer.from(encodedSignature, 'base64url');
  const expectedBuffer = Buffer.from(expected, 'base64url');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return { ok: false, reason: 'invalid_operator_token_signature' };
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as OperatorTokenPayload;
    if (!payload.phone || typeof payload.exp !== 'number') return { ok: false, reason: 'invalid_operator_token_payload' };
    if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'operator_token_expired' };
    return { ok: true, phone: normalizePhoneE164(payload.phone) };
  } catch {
    return { ok: false, reason: 'invalid_operator_token_payload' };
  }
}

export function parseOtpVerifiedPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (o.verified === true || o.success === true || o.valid === true || o.approved === true) return true;
  if (typeof o.status === 'string') {
    const status = o.status.toLowerCase();
    if (status === 'verified' || status === 'success' || status === 'ok' || status === 'approved') return true;
  }
  const nested = o.verification_check ?? o.verificationCheck ?? o.verificationResult;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    if (typeof n.status === 'string' && n.status.toLowerCase() === 'approved') return true;
    if (n.valid === true || n.success === true) return true;
  }
  return false;
}
