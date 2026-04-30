/**
 * Production parity with Vite dev `server.proxy`: forward phone OTP to the 123checkme (or other) backend.
 * Set `VITE_OTP_PROXY_TARGET` or `OTP_PROXY_TARGET` on the app host (e.g. https://www.123checkme.com).
 *
 * API key: when `123CHECKME_KEY` (or the aliases below) is set in process env, this module adds
 * `Authorization: Bearer` and `x-api-key` on the upstream request. That lets production use a
 * server-only secret without embedding `VITE_123CHECKME_KEY` in the static bundle. If a server
 * key is present, it overrides any missing/wrong key the browser sent (fixes bad builds).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { Request, Response } from 'express';
import {
  issueOperatorToken,
  normalizePhoneE164,
  parseOtpVerifiedPayload,
  phoneHasOperatorAuthority,
} from './operatorAuthority';

function trimEnv(v: string | undefined): string {
  return typeof v === 'string' ? v.replace(/^["']|["']$/g, '').trim() : '';
}

/**
 * Same precedence as the browser `checkmeClient` + `vite.config` merge, plus server-only names.
 */
export function resolveOtpServerCredentials(env: Record<string, string>): string | undefined {
  const a = trimEnv(env['123CHECKME_KEY']);
  const b = trimEnv(env.VITE_123CHECKME_KEY);
  const c = trimEnv(env.VITE_OTP_API_BEARER);
  const d = trimEnv(env.VITE_CHECKME_API_KEY);
  const e = trimEnv(env.CHECKME_API_KEY);
  return a || b || c || d || e || undefined;
}

function otpUpstreamBase(env: Record<string, string>): string {
  return (env.VITE_OTP_PROXY_TARGET ?? env.OTP_PROXY_TARGET ?? '').trim().replace(/\/$/, '');
}

export function getOtpUpstreamBaseForLog(env: Record<string, string>): string {
  const b = otpUpstreamBase(env);
  return b || '(not configured)';
}

export async function forwardOtpJson(
  env: Record<string, string>,
  req: Request,
  res: Response,
  upstreamPath: '/api/send-otp' | '/api/verify-otp',
): Promise<void> {
  const base = otpUpstreamBase(env);
  if (!base) {
    res.status(503).json({
      error:
        'OTP proxy not configured on app host. Set VITE_OTP_PROXY_TARGET (e.g. https://www.123checkme.com) in .env.local or process env, then restart npm start.',
    });
    return;
  }

  const url = `${base}${upstreamPath}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const serverKey = resolveOtpServerCredentials(env);
    if (serverKey) {
      headers.Authorization = `Bearer ${serverKey}`;
      headers['x-api-key'] = serverKey;
    } else {
      const auth = req.headers.authorization;
      const xk = req.headers['x-api-key'];
      if (typeof auth === 'string' && auth.trim()) headers.Authorization = auth;
      if (typeof xk === 'string' && xk.trim()) headers['x-api-key'] = xk;
    }

    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body ?? {}),
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || 'application/json; charset=utf-8';
    res.status(r.status);
    res.setHeader('Content-Type', ct);
    if (upstreamPath === '/api/verify-otp' && r.ok && ct.toLowerCase().includes('application/json')) {
      const data = JSON.parse(buf.toString('utf8')) as Record<string, unknown>;
      const requestPhone =
        typeof req.body?.phone === 'string'
          ? req.body.phone
          : typeof data.phone === 'string'
            ? data.phone
            : '';
      if (parseOtpVerifiedPayload(data) && requestPhone) {
        const phone = normalizePhoneE164(requestPhone);
        const isOperator = await phoneHasOperatorAuthority(env, phone);
        if (isOperator) {
          res.end(
            JSON.stringify({
              ...data,
              aios_operator: true,
              operator_phone: phone,
              operator_token: issueOperatorToken(env, phone),
            }),
          );
          return;
        }
      }
      res.end(JSON.stringify(data));
      return;
    }
    res.end(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: `OTP upstream error: ${msg}` });
  }
}
