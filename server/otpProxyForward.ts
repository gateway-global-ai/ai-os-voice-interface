/**
 * Production parity with Vite dev `server.proxy`: forward phone OTP to the 123checkme (or other) backend.
 * Set `VITE_OTP_PROXY_TARGET` or `OTP_PROXY_TARGET` on the app host (e.g. https://www.123checkme.com).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { Request, Response } from 'express';

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
    const auth = req.headers.authorization;
    const xk = req.headers['x-api-key'];
    if (typeof auth === 'string') headers.Authorization = auth;
    if (typeof xk === 'string') headers['x-api-key'] = xk;

    const r = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body ?? {}),
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || 'application/json; charset=utf-8';
    res.status(r.status);
    res.setHeader('Content-Type', ct);
    res.end(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: `OTP upstream error: ${msg}` });
  }
}
