/**
 * Tier B — MCP Apps surface: Streamable HTTP client + @mcp-ui/client AppRenderer.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpError, ErrorCode, type JSONRPCRequest } from '@modelcontextprotocol/sdk/types.js';
import { AppRenderer, UI_EXTENSION_CAPABILITIES } from '@mcp-ui/client';
import type { RequestHandlerExtra } from '@mcp-ui/client';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { parseShellPilotAction, type ShellPilotAction } from '../../shell/mcpShellPilotActions';
import { mcpSandboxFrameUrl, mcpStreamableHttpUrl } from '../../shell/mcpShellSurfaceUrls';

type Props = {
  open: boolean;
  /** Pilot tool name, e.g. `aios_show_community_funnel` */
  toolName: string;
  onClose: () => void;
  /** Guest UI → host bridge (OTP send, auth shortcuts, audience paths). */
  onShellAction: (action: ShellPilotAction) => void;
};

export function McpShellSurface({ open, toolName, onClose, onShellAction }: Props) {
  const [activeTool, setActiveTool] = useState(toolName);
  const [client, setClient] = useState<Client | null>(null);
  const [toolResult, setToolResult] = useState<CallToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<{ client: Client; transport: StreamableHTTPClientTransport } | null>(null);
  const pendingRef = useRef<{ client: Client; transport: StreamableHTTPClientTransport } | null>(null);

  const teardownSession = useCallback(async () => {
    const pairs = [pendingRef.current, sessionRef.current];
    pendingRef.current = null;
    sessionRef.current = null;
    for (const s of pairs) {
      if (!s) continue;
      try {
        await s.transport.close();
      } catch {
        /* ignore */
      }
      try {
        await s.client.close();
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    setActiveTool(toolName);
  }, [toolName]);

  useEffect(() => {
    if (!open) {
      setClient(null);
      setToolResult(null);
      setError(null);
      void teardownSession();
      return;
    }

    let cancelled = false;

    const run = async () => {
      await teardownSession();

      setError(null);
      setClient(null);
      setToolResult(null);

      const c = new Client(
        { name: 'aios-web-shell', version: '0.1.0' },
        {
          capabilities: {
            extensions: UI_EXTENSION_CAPABILITIES,
          },
        },
      );
      const transport = new StreamableHTTPClientTransport(new URL(mcpStreamableHttpUrl()));
      pendingRef.current = { client: c, transport };

      try {
        await c.connect(transport);
        if (cancelled) {
          pendingRef.current = null;
          await transport.close().catch(() => {});
          await c.close().catch(() => {});
          return;
        }
        const result = await c.callTool({ name: activeTool, arguments: {} });
        if (cancelled) {
          pendingRef.current = null;
          await transport.close().catch(() => {});
          await c.close().catch(() => {});
          return;
        }
        pendingRef.current = null;
        sessionRef.current = { client: c, transport };
        setClient(c);
        setToolResult(result);
      } catch (e) {
        pendingRef.current = null;
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
        await transport.close().catch(() => {});
        await c.close().catch(() => {});
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, activeTool, teardownSession]);

  const onFallbackRequest = useCallback(
    async (request: JSONRPCRequest, _extra: RequestHandlerExtra) => {
      if (request.method !== 'x/aios/shell_action') {
        throw new McpError(ErrorCode.MethodNotFound, `Unsupported MCP UI request: ${request.method}`);
      }
      const params = request.params as Record<string, unknown> | undefined;
      const action = parseShellPilotAction(params);
      if (!action) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid x/aios/shell_action payload');
      }
      if (action.type === 'community_students') {
        setActiveTool('aios_show_students_detail');
        return { ok: true as const };
      }
      if (action.type === 'community_back') {
        setActiveTool('aios_show_community_funnel');
        return { ok: true as const };
      }
      if (action.type === 'community_close') {
        onClose();
        return { ok: true as const };
      }
      onShellAction(action);
      return { ok: true as const };
    },
    [onClose, onShellAction],
  );

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[35] flex items-center justify-center px-4 py-8"
      style={{
        background: 'var(--shell-modal-backdrop)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="MCP shell application"
    >
      <div
        className="relative flex h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        style={{
          background: 'var(--vcu-community-card-bg)',
          borderColor: 'var(--vcu-community-card-border)',
        }}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
          style={{
            background: 'var(--vcu-community-tile-bg)',
            borderColor: 'var(--vcu-community-card-border)',
            color: 'var(--vcu-community-text-muted)',
          }}
          onClick={onClose}
        >
          Close host
        </button>
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--vcu-community-heading)' }}>
              MCP pilot unavailable
            </p>
            <p className="max-w-md text-xs" style={{ color: 'var(--panel-danger-text)' }}>
              {error}
            </p>
            <p className="max-w-md text-xs" style={{ color: 'var(--vcu-community-text-muted)' }}>
              Run <code style={{ padding: '0.125rem 0.25rem', borderRadius: '0.25rem', background: 'var(--panel-surface)' }}>npm run dev:web+mcp</code> or start{' '}
              <code style={{ padding: '0.125rem 0.25rem', borderRadius: '0.25rem', background: 'var(--panel-surface)' }}>mcp:sandbox</code> and{' '}
              <code style={{ padding: '0.125rem 0.25rem', borderRadius: '0.25rem', background: 'var(--panel-surface)' }}>mcp:shell-pilot</code> with Vite proxy for{' '}
              <code style={{ padding: '0.125rem 0.25rem', borderRadius: '0.25rem', background: 'var(--panel-surface)' }}>/mcp/core</code>.
            </p>
          </div>
        ) : null}
        {!error && client && toolResult ? (
          <div className="min-h-0 flex-1 overflow-auto p-2">
            <AppRenderer
              key={activeTool}
              client={client}
              toolName={activeTool}
              sandbox={{ url: mcpSandboxFrameUrl() }}
              toolInput={{}}
              toolResult={toolResult}
              onFallbackRequest={onFallbackRequest}
              onOpenLink={async () => ({ isError: true })}
              onError={(err) => setError(err.message)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
