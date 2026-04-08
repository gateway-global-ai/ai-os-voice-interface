/**
 * External MCP adapter boundary — Google Workspace MCP runs out-of-process (AIOS-SPEC-007).
 * Streamable HTTP (FastMCP): **initialize** → **`Mcp-Session-Id`** header → **`tools/call`** with that header.
 * Response bodies may be JSON or SSE (`data: {jsonrpc…}`); we parse both before **`extractMcpToolData`**.
 *
 * **`session_id` on the envelope** is audit correlation only, not MCP transport.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { getSessionGoogleAccessToken } from './workspaceSessionAuth';

export type McpAdapterCallResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: 'not_configured' | 'timeout' | 'aborted' | 'http_error' | 'auth_error';
      message: string;
    };

const DEFAULT_TIMEOUT_MS = 30_000;

/** Streamable HTTP MCP expects this Accept value (same as golden curl in workspace-mcp-nginx-deploy.md). */
const MCP_STREAMABLE_ACCEPT = 'application/json, text/event-stream';

/** Cached MCP transport session (header from **initialize**). Not the OAuth token. */
let mcpTransportSessionId: string | null = null;

/** Bearer key last used when **initialize** succeeded (`''` if no token). External OAuth 2.1 mode ties session to token. */
let mcpSessionBearerKey: string | null = null;

/** Single-flight per bearer key so parallel tools/call don’t stampede initialize. */
const initInFlightByKey = new Map<string, Promise<string | null>>();

function bearerCacheKey(bearerToken?: string): string {
  return bearerToken?.trim() ?? '';
}

/** Drop transport session (e.g. after 401 or forced reconnect). */
export function clearWorkspaceMcpTransportSession(): void {
  mcpTransportSessionId = null;
  mcpSessionBearerKey = null;
  initInFlightByKey.clear();
}

/**
 * Public MCP base URL from env (`VITE_WORKSPACE_MCP_URL`), trimmed, no trailing slash.
 * Use anywhere the browser (or SSR) needs the configured Workspace MCP origin for display or requests.
 */
export function getWorkspaceMcpPublicBase(): string | null {
  const url =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WORKSPACE_MCP_URL ??
    (typeof process !== 'undefined' ? process.env?.VITE_WORKSPACE_MCP_URL : undefined);
  if (url && url.trim()) return url.trim().replace(/\/$/, '');
  return null;
}

/**
 * Google OAuth **access token** (`ya29…`) for MCP OAuth 2.1 / external-provider HTTP mode.
 * **Dev only** — embedding tokens in the client bundle is unsafe for production; prefer server-side auth or in-app OAuth later.
 */
export function getWorkspaceMcpBearerTokenFromEnv(): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const v = env.VITE_WORKSPACE_MCP_BEARER_TOKEN ?? env.VITE_GOOGLE_OAUTH_ACCESS_TOKEN;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

function getWorkspaceMcpBaseUrl(): string | null {
  return getWorkspaceMcpPublicBase();
}

/** User-facing explanation for network/CORS failures when calling the MCP from the browser. */
export function describeWorkspaceMcpNetworkError(e: unknown): string {
  const raw = e instanceof Error ? e.message : 'Network error calling Workspace MCP';
  const corsHint =
    typeof raw === 'string' && /failed to fetch|networkerror|load failed/i.test(raw)
      ? ' Often CORS: for local dev set VITE_WORKSPACE_MCP_URL=/__workspace_mcp in `.env.development.local` and restart Vite (see `.env.example`); for production add CORS on the MCP nginx host (WORKSPACE.md).'
      : '';
  return `${raw}${corsHint}`;
}

function getJsonRpcPath(): string {
  const p =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WORKSPACE_MCP_JSONRPC_PATH ??
    '/mcp';
  const s = (p || '/mcp').trim();
  return s.startsWith('/') ? s : `/${s}`;
}

function getTimeoutMs(): number {
  const raw = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WORKSPACE_MCP_TIMEOUT_MS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

type McpFetchAbortKind = 'timeout' | 'caller' | null;

function createMcpFetchAbort(
  external: AbortSignal | undefined,
  timeoutMs: number
): {
  signal: AbortSignal;
  getAbortKind: () => McpFetchAbortKind;
  dispose: () => void;
} {
  const combined = new AbortController();
  let kind: McpFetchAbortKind = null;
  const markFirst = (k: Exclude<McpFetchAbortKind, null>) => {
    if (kind === null) kind = k;
  };

  const timer = setTimeout(() => {
    markFirst('timeout');
    combined.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    clearTimeout(timer);
    markFirst('caller');
    combined.abort();
  };

  if (external) {
    if (external.aborted) {
      onExternalAbort();
    } else {
      external.addEventListener('abort', onExternalAbort);
    }
  }

  const dispose = () => {
    clearTimeout(timer);
    if (external && !external.aborted) {
      external.removeEventListener('abort', onExternalAbort);
    }
  };

  return { signal: combined.signal, getAbortKind: () => kind, dispose };
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

function readMcpSessionIdFromHeaders(res: Response): string | null {
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase() === 'mcp-session-id') return v.trim() || null;
  }
  return null;
}

/** Dev-only hint when MCP URL is cross-origin (browser cannot read custom response headers without Access-Control-Expose-Headers). */
function workspaceMcpCrossOriginDevHint(base: string): string {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return '';
  try {
    const resolved = new URL(base, window.location.href);
    if (resolved.origin !== window.location.origin) {
      return ' Quick fix (local dev): set `VITE_WORKSPACE_MCP_URL=/__workspace_mcp` in `.env.development.local` and restart `npm run dev` so requests are same-origin via the Vite proxy (see `.env.example`).';
    }
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Parse initialize SSE/JSON body when `Mcp-Session-Id` is not readable (e.g. CORS hides the header).
 * Best-effort only — upstream should still expose the header or use same-origin proxy.
 */
function extractMcpSessionIdFromInitializeBody(text: string): string | null {
  const trimmed = text.trim();
  const fromRaw =
    /["']?mcp-session-id["']?\s*[:=]\s*["']([a-zA-Z0-9._-]+)["']/i.exec(trimmed) ??
    /Mcp-Session-Id:\s*([^\s\r\n]+)/i.exec(trimmed);
  if (fromRaw?.[1]?.trim()) return fromRaw[1].trim();

  let parsed: unknown = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      /* try SSE */
    }
  }
  if (parsed == null) {
    for (const line of trimmed.split(/\r?\n/)) {
      const m = /^\s*data:\s*(.+)\s*$/.exec(line);
      if (!m) continue;
      const payload = m[1].trim();
      if (payload === '[DONE]') continue;
      try {
        parsed = JSON.parse(payload) as unknown;
        break;
      } catch {
        continue;
      }
    }
  }
  if (parsed == null) return null;

  const walk = (v: unknown, depth: number): string | null => {
    if (depth > 14 || v == null) return null;
    if (typeof v !== 'object') return null;
    if (Array.isArray(v)) {
      for (const x of v) {
        const w = walk(x, depth + 1);
        if (w) return w;
      }
      return null;
    }
    const o = v as Record<string, unknown>;
    for (const [k, val] of Object.entries(o)) {
      const kl = k.toLowerCase();
      if (
        (kl === 'mcp-session-id' ||
          kl === 'mcp_session_id' ||
          kl === 'mcpsessionid' ||
          kl === 'session_id' ||
          kl === 'sessionid') &&
        typeof val === 'string' &&
        val.trim().length >= 8
      ) {
        return val.trim();
      }
    }
    for (const key of ['_meta', 'result', 'params']) {
      if (key in o) {
        const w = walk(o[key], depth + 1);
        if (w) return w;
      }
    }
    return null;
  };

  return walk(parsed, 0);
}

/**
 * Ensure streamable HTTP transport session: JSON-RPC **initialize**, then cache **`Mcp-Session-Id`**.
 * Sends **`Authorization: Bearer`** on initialize when `bearerToken` is set (required for external OAuth 2.1 provider mode: all MCP requests authenticated).
 * Browsers only see custom response headers if the MCP/nginx sends **Access-Control-Expose-Headers: mcp-session-id** (same-origin Vite proxy avoids CORS).
 */
async function ensureMcpTransportSession(
  base: string,
  path: string,
  signal: AbortSignal,
  bearerToken?: string
): Promise<{ ok: true; sessionId: string } | { ok: false; message: string }> {
  const key = bearerCacheKey(bearerToken);

  if (mcpTransportSessionId && mcpSessionBearerKey === key) {
    return { ok: true, sessionId: mcpTransportSessionId };
  }

  const pending = initInFlightByKey.get(key);
  if (pending) {
    const sid = await pending;
    if (sid) return { ok: true, sessionId: sid };
    return { ok: false, message: 'Workspace MCP initialize did not return a session id.' };
  }

  const initPromise = (async (): Promise<string | null> => {
    const initBody = {
      jsonrpc: '2.0' as const,
      id: `init-${Date.now()}`,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'ai-os-voice-interface', version: '1.0.0' },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: MCP_STREAMABLE_ACCEPT,
    };
    if (bearerToken?.trim()) {
      headers.Authorization = `Bearer ${bearerToken.trim()}`;
    }

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(initBody),
        signal,
      });
    } catch (e) {
      return null;
    }

    const sidHeader = readMcpSessionIdFromHeaders(res);
    let text: string;
    try {
      text = await res.text();
    } catch {
      return null;
    }

    if (!res.ok) {
      return null;
    }

    if (sidHeader) {
      mcpTransportSessionId = sidHeader;
      mcpSessionBearerKey = key;
      return sidHeader;
    }

    const sidBody = extractMcpSessionIdFromInitializeBody(text);
    if (sidBody) {
      mcpTransportSessionId = sidBody;
      mcpSessionBearerKey = key;
      return sidBody;
    }

    return null;
  })();

  initInFlightByKey.set(key, initPromise);

  try {
    const sid = await initPromise;
    if (sid) {
      return { ok: true, sessionId: sid };
    }
    return {
      ok: false,
      message:
        'MCP initialize did not return Mcp-Session-Id. For browser calls, add Access-Control-Expose-Headers: mcp-session-id (and Authorization if needed) on the MCP vhost, or use the Vite /__workspace_mcp dev proxy (same-origin). See WORKSPACE.md.' +
        workspaceMcpCrossOriginDevHint(base),
    };
  } finally {
    initInFlightByKey.delete(key);
  }
}

/**
 * Extract structured data from MCP `tools/call` result (content[].text JSON or raw).
 */
export function extractMcpToolData(result: unknown): unknown {
  if (result == null) return null;
  if (typeof result !== 'object') return result;
  const r = result as Record<string, unknown>;
  if (r.isError === true) {
    const msg =
      Array.isArray(r.content) && r.content[0] && typeof r.content[0] === 'object'
        ? String((r.content[0] as { text?: string }).text ?? 'MCP tool error')
        : 'MCP tool returned isError';
    throw new Error(msg);
  }
  if (Array.isArray(r.content)) {
    const texts: string[] = [];
    for (const c of r.content) {
      if (c && typeof c === 'object' && 'text' in c && typeof (c as { text: unknown }).text === 'string') {
        texts.push((c as { text: string }).text);
      }
    }
    if (texts.length === 1) {
      try {
        return JSON.parse(texts[0]!) as unknown;
      } catch {
        return texts[0];
      }
    }
    if (texts.length > 1) return texts;
    return r.content;
  }
  return result;
}

function jsonRpcErrorMessage(json: unknown): string {
  if (json && typeof json === 'object' && 'error' in json) {
    const err = (json as { error?: { message?: string } }).error;
    return err?.message ?? JSON.stringify(json);
  }
  return JSON.stringify(json);
}

/**
 * Streamable HTTP may return **`Content-Type: text/event-stream`** with lines like **`data: {"jsonrpc":"2.0",...}`**,
 * not only `application/json`. Prefer first parseable JSON object (whole body or first **`data:`** line).
 */
async function parseMcpStreamableResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  const probe = trimmed.slice(0, 96).toLowerCase();
  if (probe.startsWith('<!doctype') || probe.startsWith('<html') || trimmed.startsWith('<')) {
    throw new Error(
      `MCP returned HTML (wrong URL path or error page?), not JSON-RPC. First 200 chars: ${text.slice(0, 200)}`
    );
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      /* try SSE lines */
    }
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*data:\s*(.+)\s*$/.exec(line);
    if (!m) continue;
    const payload = m[1].trim();
    if (payload === '[DONE]') continue;
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      continue;
    }
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(
      `Could not parse MCP body as JSON or SSE data: (status ${res.status}) ${text.slice(0, 400)}`
    );
  }
}

/**
 * POST JSON-RPC `tools/call` after streamable **initialize** + **`Mcp-Session-Id`**.
 */
export async function callWorkspaceMcpAdapter(params: {
  tool: string;
  args: Record<string, unknown>;
  bearerToken?: string;
  signal?: AbortSignal;
}): Promise<McpAdapterCallResult> {
  const base = getWorkspaceMcpBaseUrl();
  if (!base) {
    return {
      ok: false,
      code: 'not_configured',
      message:
        'Workspace MCP URL not configured (set VITE_WORKSPACE_MCP_URL). Control plane blocks raw execution.',
    };
  }

  const path = getJsonRpcPath();
  const timeoutMs = getTimeoutMs();
  if (params.signal?.aborted) {
    return {
      ok: false,
      code: 'aborted',
      message: 'Workspace MCP request cancelled before send.',
    };
  }

  const { signal, getAbortKind, dispose } = createMcpFetchAbort(params.signal, timeoutMs);

  const runOnce = async (
    allowRetryAfterReinit: boolean,
    bearerOverride?: string | null
  ): Promise<McpAdapterCallResult> => {
    const resolvedBearer =
      bearerOverride !== undefined && bearerOverride !== null ? bearerOverride : params.bearerToken;
    const bearerTokenForThisRun =
      typeof resolvedBearer === 'string' && resolvedBearer.trim() ? resolvedBearer.trim() : undefined;

    const session = await ensureMcpTransportSession(base, path, signal, bearerTokenForThisRun);
    if (session.ok === false) {
      return { ok: false, code: 'http_error', message: session.message };
    }

    const id = Date.now();
    const body = {
      jsonrpc: '2.0' as const,
      id,
      method: 'tools/call',
      params: {
        name: params.tool,
        arguments: { ...params.args },
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: MCP_STREAMABLE_ACCEPT,
      'Mcp-Session-Id': session.sessionId,
    };
    if (bearerTokenForThisRun?.trim()) {
      headers.Authorization = `Bearer ${bearerTokenForThisRun.trim()}`;
    }

    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      if (isAbortError(e)) {
        const abortKind = getAbortKind();
        if (abortKind === 'caller') {
          return {
            ok: false,
            code: 'aborted',
            message: 'Workspace MCP request was cancelled.',
          };
        }
        if (abortKind === 'timeout') {
          return {
            ok: false,
            code: 'timeout',
            message: `Workspace MCP request timed out (${timeoutMs}ms).`,
          };
        }
        return {
          ok: false,
          code: 'aborted',
          message: 'Workspace MCP request was aborted.',
        };
      }
      return {
        ok: false,
        code: 'http_error',
        message: describeWorkspaceMcpNetworkError(e),
      };
    }

    if (res.status === 401 || res.status === 403) {
      clearWorkspaceMcpTransportSession();
      return {
        ok: false,
        code: 'auth_error',
        message: `Workspace MCP returned ${res.status} (auth).`,
      };
    }

    let json: unknown;
    try {
      json = await parseMcpStreamableResponseBody(res);
    } catch (e) {
      return {
        ok: false,
        code: 'http_error',
        message: e instanceof Error ? e.message : `Workspace MCP returned unparseable body (${res.status}).`,
      };
    }

    if (!res.ok) {
      const msg = jsonRpcErrorMessage(json);
      const missingSession =
        res.status === 400 && /missing session id/i.test(msg) && allowRetryAfterReinit;
      if (missingSession) {
        clearWorkspaceMcpTransportSession();
        // Re-fetch token: GIS may have just set it. The original `params.bearerToken` is stale.
        const freshBearerToken = getSessionGoogleAccessToken() ?? bearerTokenForThisRun;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return runOnce(false, freshBearerToken);
      }
      return {
        ok: false,
        code: 'http_error',
        message: `Workspace MCP HTTP ${res.status}: ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 400) : String(json)}`,
      };
    }

    if (json && typeof json === 'object' && 'error' in json && (json as { error?: unknown }).error) {
      const err = (json as { error: { message?: string; code?: unknown } }).error;
      const msg = err?.message ?? JSON.stringify(err);
      const missingSession =
        /missing session id/i.test(msg) && allowRetryAfterReinit;
      if (missingSession) {
        clearWorkspaceMcpTransportSession();
        // Re-fetch token: GIS may have just set it. The original `params.bearerToken` is stale.
        const freshBearerToken = getSessionGoogleAccessToken() ?? bearerTokenForThisRun;
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return runOnce(false, freshBearerToken);
      }
      return { ok: false, code: 'http_error', message: `JSON-RPC error: ${msg}` };
    }

    const result = (json as { result?: unknown }).result;
    if (result === undefined) {
      return { ok: false, code: 'http_error', message: 'JSON-RPC response missing result' };
    }

    try {
      const data = extractMcpToolData(result);
      return { ok: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'MCP tool extraction failed';
      /** MCP may have bound transport session before Bearer was sent; re-init once with current token. */
      const oauthUserMissing =
        allowRetryAfterReinit && /requires an authenticated user/i.test(msg);
      if (oauthUserMissing) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        clearWorkspaceMcpTransportSession();
        // Re-fetch token: GIS may have just set it. The original `params.bearerToken` is stale.
        const freshBearerToken = getSessionGoogleAccessToken() ?? bearerTokenForThisRun;
        return runOnce(false, freshBearerToken);
      }
      return {
        ok: false,
        code: 'http_error',
        message: msg,
      };
    }
  };

  try {
    return await runOnce(true);
  } finally {
    dispose();
  }
}
