/**
 * Restores a server-signed operator token for an already phone-verified shell session.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { issueOperatorToken, normalizePhoneE164, phoneHasOperatorAuthority } from './operatorAuthority';

type JsonRequest = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: JsonRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') return req.body as Record<string, unknown>;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function handleOperatorSessionApi(
  env: Record<string, string>,
  req: JsonRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const phone = typeof body.phone === 'string' ? normalizePhoneE164(body.phone) : '';
    if (!phone) {
      sendJson(res, 400, { error: 'phone_required' });
      return;
    }

    const isOperator = await phoneHasOperatorAuthority(env, phone);
    if (!isOperator) {
      sendJson(res, 403, { error: 'phone_is_not_operator' });
      return;
    }

    sendJson(res, 200, {
      aios_operator: true,
      operator_phone: phone,
      operator_token: issueOperatorToken(env, phone),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  }
}
