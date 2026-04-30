/**
 * 123CheckMe SaaS Admin proxy.
 * Verifies the AI OS operator token, then calls 123CheckMe admin APIs server-side.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyOperatorToken } from './operatorAuthority';

type CheckmeAdminRequest = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

async function readJsonBody(req: CheckmeAdminRequest): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function apiPath(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://local.invalid');
  return url.pathname.replace(/^\/__checkme_saas_admin_api/, '') || '/';
}

function checkmeAdminBase(env: Record<string, string>): string {
  return (
    env.CHECKME_ADMIN_BASE_URL ||
    env['123CHECKME_ADMIN_BASE_URL'] ||
    env.VITE_OTP_PROXY_TARGET ||
    env.OTP_PROXY_TARGET ||
    'http://127.0.0.1:3010'
  ).replace(/\/$/, '');
}

function checkmeAdminKey(env: Record<string, string>): string {
  return (
    env.CHECKME_ADMIN_KEY ||
    env['123CHECKME_ADMIN_KEY'] ||
    env.ADMIN_SECRET ||
    env.ADMIN_WEBHOOK_SECRET ||
    env.SESSION_SECRET ||
    ''
  ).trim();
}

async function forwardToCheckme(
  env: Record<string, string>,
  req: CheckmeAdminRequest,
  res: ServerResponse,
): Promise<void> {
  const method = req.method ?? 'GET';
  const path = apiPath(req);
  const target = `${checkmeAdminBase(env)}/api/operator/saas${path}`;
  const adminKey = checkmeAdminKey(env);

  if (!adminKey) {
    sendJson(res, 503, { status: 'blocked', error: 'checkme_admin_key_not_configured' });
    return;
  }

  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
  };

  if (!['GET', 'HEAD'].includes(method)) {
    init.body = JSON.stringify(await readJsonBody(req));
  }

  const response = await fetch(target, init);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? ((await response.json().catch(() => ({}))) as unknown)
    : { status: 'blocked', error: await response.text() };

  sendJson(res, response.status, {
    upstream: {
      status: response.status,
      ok: response.ok,
      base: checkmeAdminBase(env),
      path: `/api/operator/saas${path}`,
    },
    data,
  });
}

export async function handleCheckmeSaasAdminApi(
  env: Record<string, string>,
  req: CheckmeAdminRequest,
  res: ServerResponse,
): Promise<void> {
  const token = verifyOperatorToken(env, readBearer(req));
  if (!token.ok) {
    sendJson(res, 403, { status: 'blocked', error: token.reason });
    return;
  }

  try {
    await forwardToCheckme(env, req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 502, { status: 'blocked', error: message });
  }
}
