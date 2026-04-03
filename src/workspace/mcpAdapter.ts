/**
 * External MCP adapter boundary — Google Workspace MCP runs out-of-process (AIOS-SPEC-007).
 * Uses JSON-RPC 2.0 `tools/call` over HTTP POST (common MCP HTTP mapping).
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type McpAdapterCallResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: 'not_configured' | 'timeout' | 'aborted' | 'http_error' | 'auth_error';
      message: string;
    };

const DEFAULT_TIMEOUT_MS = 30_000;

function getWorkspaceMcpBaseUrl(): string | null {
  const url =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_WORKSPACE_MCP_URL ??
    (typeof process !== 'undefined' ? process.env?.VITE_WORKSPACE_MCP_URL : undefined);
  if (url && url.trim()) return url.trim().replace(/\/$/, '');
  return null;
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

/**
 * Merges optional caller `signal` with a timeout into one `fetch` signal, and records
 * which branch fired first so `AbortError` can be classified (timeout vs cancellation).
 */
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

/**
 * Phase 1: POST JSON-RPC `tools/call` to `{VITE_WORKSPACE_MCP_URL}{VITE_WORKSPACE_MCP_JSONRPC_PATH}`.
 * Tool name is the governed intent string (e.g. `workspace.calendar.list`).
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

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.bearerToken?.trim()) {
    headers.Authorization = `Bearer ${params.bearerToken.trim()}`;
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
      message: e instanceof Error ? e.message : 'Network error calling Workspace MCP',
    };
  } finally {
    dispose();
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      code: 'auth_error',
      message: `Workspace MCP returned ${res.status} (auth).`,
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      code: 'http_error',
      message: `Workspace MCP returned non-JSON (${res.status}).`,
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      code: 'http_error',
      message: `Workspace MCP HTTP ${res.status}: ${typeof json === 'object' && json ? JSON.stringify(json).slice(0, 200) : String(json)}`,
    };
  }

  if (json && typeof json === 'object' && 'error' in json && (json as { error?: unknown }).error) {
    const err = (json as { error: { message?: string; code?: unknown } }).error;
    const msg = err?.message ?? JSON.stringify(err);
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
    return {
      ok: false,
      code: 'http_error',
      message: e instanceof Error ? e.message : 'MCP tool extraction failed',
    };
  }
}
