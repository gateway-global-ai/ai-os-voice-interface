/**
 * Course Creator server API.
 * Uses service-role Supabase only after a signed phone-operator token is verified.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabaseTypes';
import { verifyOperatorToken } from './operatorAuthority';

type CourseCreatorRequest = IncomingMessage & { body?: unknown };

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

async function readJsonBody(req: CourseCreatorRequest): Promise<unknown> {
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
  return url.pathname.replace(/^\/__course_creator_api/, '') || '/';
}

function createAdminClient(env: Record<string, string>) {
  const url = env.AI_OS_SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const key = env.AI_OS_SUPABASE_SERVICE_ROLE_KEY || env.AI_OS_SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function handleCourseCreatorApi(
  env: Record<string, string>,
  req: CourseCreatorRequest,
  res: ServerResponse,
): Promise<void> {
  const token = verifyOperatorToken(env, readBearer(req));
  if (token.ok !== true) {
    sendJson(res, 403, { error: token.reason });
    return;
  }

  const admin = createAdminClient(env);
  if (!admin) {
    sendJson(res, 503, { error: 'course_creator_supabase_admin_not_configured' });
    return;
  }

  const method = req.method ?? 'GET';
  const path = apiPath(req);

  try {
    if (method === 'GET' && path === '/access') {
      sendJson(res, 200, { ok: true, phone: token.phone });
      return;
    }

    if (method === 'GET' && path === '/drafts') {
      const { data, error } = await admin
        .from('university_course_drafts')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      sendJson(res, 200, { drafts: data ?? [] });
      return;
    }

    if (method === 'POST' && path === '/drafts') {
      const body = (await readJsonBody(req)) as Record<string, unknown>;
      const { data, error } = await admin
        .from('university_course_drafts')
        .insert(body as never)
        .select('*')
        .single();
      if (error) throw error;
      sendJson(res, 201, { draft: data });
      return;
    }

    const draftMatch = /^\/drafts\/([0-9a-f-]+)$/i.exec(path);
    if (draftMatch && method === 'PATCH') {
      const body = (await readJsonBody(req)) as Record<string, unknown>;
      const { data, error } = await admin
        .from('university_course_drafts')
        .update(body as never)
        .eq('draft_id', draftMatch[1])
        .select('*')
        .single();
      if (error) throw error;
      sendJson(res, 200, { draft: data });
      return;
    }

    if (draftMatch && method === 'DELETE') {
      const { error } = await admin.from('university_course_drafts').delete().eq('draft_id', draftMatch[1]);
      if (error) throw error;
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'GET' && path === '/users') {
      const { data, error } = await admin
        .from('users')
        .select('*')
        .order('display_name', { ascending: true })
        .limit(200);
      if (error) throw error;
      sendJson(res, 200, { users: data ?? [] });
      return;
    }

    if (method === 'GET' && path === '/courses') {
      const { data, error } = await admin
        .from('university_courses')
        .select('course_id, title')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      sendJson(res, 200, { courses: data ?? [] });
      return;
    }

    sendJson(res, 404, { error: 'course_creator_api_not_found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    sendJson(res, 500, { error: message });
  }
}
