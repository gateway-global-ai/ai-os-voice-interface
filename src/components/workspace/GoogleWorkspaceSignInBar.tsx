/**
 * Google Identity Services — OAuth 2.0 token client for Workspace MCP (Calendar / Gmail / Drive / Contacts read scopes).
 * Requires **Authorized JavaScript origins** in Cloud Console (e.g. http://localhost:5173).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useDiagnosticsChromeEnabled } from '../../shell/DiagnosticsChromeContext';
import { clearWorkspaceMcpTransportSession, getWorkspaceMcpBearerTokenFromEnv } from '../../workspace/mcpAdapter';
import {
  clearSessionGoogleAccessToken,
  getSessionGoogleAccessToken,
  setSessionGoogleAccessToken,
  WORKSPACE_GIS_OAUTH_SCOPES,
} from '../../workspace/workspaceSessionAuth';

function hasWorkspaceMcpCredential(): boolean {
  return !!(getSessionGoogleAccessToken()?.trim() || getWorkspaceMcpBearerTokenFromEnv()?.trim());
}

function getClientId(): string | null {
  const v = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function waitForGoogleGsi(maxMs = 8000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const id = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(id);
        resolve(true);
      } else if (Date.now() - start > maxMs) {
        window.clearInterval(id);
        resolve(false);
      }
    }, 50);
  });
}

type Props = {
  /** After sign-in/out, reload current workspace view so MCP runs with new Bearer. */
  onAuthSessionChange?: () => void;
};

export function GoogleWorkspaceSignInBar({ onAuthSessionChange }: Props) {
  const showDiagnosticsChrome = useDiagnosticsChromeEnabled();
  const clientId = getClientId();
  const [gsiReady, setGsiReady] = useState(false);
  const [signedIn, setSignedIn] = useState(() => hasWorkspaceMcpCredential());
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void waitForGoogleGsi().then((ok) => {
      if (!cancelled) setGsiReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const syncSignedIn = useCallback(() => {
    setSignedIn(hasWorkspaceMcpCredential());
  }, []);

  /** GIS does not notify when `expires_in` elapses; re-sync so UI matches `getSessionGoogleAccessToken()`. */
  useEffect(() => {
    if (!clientId) return;
    const tick = () => syncSignedIn();
    const iv = window.setInterval(tick, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [clientId, syncSignedIn]);

  const handleSignIn = useCallback(() => {
    if (!clientId || !window.google?.accounts?.oauth2) return;
    setBusy(true);
    setLastError(null);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_GIS_OAUTH_SCOPES,
        callback: (resp) => {
          setBusy(false);
          if (resp.error) {
            setLastError(resp.error);
            return;
          }
          if (!resp.access_token) {
            setLastError('No access_token in response');
            return;
          }
          setSessionGoogleAccessToken(resp.access_token, resp.expires_in);
          clearWorkspaceMcpTransportSession();
          syncSignedIn();
          onAuthSessionChange?.();
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      setBusy(false);
      setLastError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  }, [clientId, onAuthSessionChange, syncSignedIn]);

  const handleRefresh = useCallback(() => {
    if (!clientId || !window.google?.accounts?.oauth2) return;
    setBusy(true);
    setLastError(null);
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: WORKSPACE_GIS_OAUTH_SCOPES,
        callback: (resp) => {
          setBusy(false);
          if (resp.error) {
            setLastError(resp.error);
            return;
          }
          if (resp.access_token) {
            setSessionGoogleAccessToken(resp.access_token, resp.expires_in);
            clearWorkspaceMcpTransportSession();
            syncSignedIn();
            onAuthSessionChange?.();
          }
        },
      });
      client.requestAccessToken({ prompt: '' });
    } catch (e) {
      setBusy(false);
      setLastError(e instanceof Error ? e.message : 'Refresh failed');
    }
  }, [clientId, onAuthSessionChange, syncSignedIn]);

  const handleSignOut = useCallback(() => {
    clearSessionGoogleAccessToken();
    clearWorkspaceMcpTransportSession();
    syncSignedIn();
    onAuthSessionChange?.();
  }, [onAuthSessionChange, syncSignedIn]);

  if (!clientId) {
    return (
      <div
        className="rounded-2xl px-4 py-3 text-sm"
        style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#fcd34d',
        }}
      >
        <p className="font-semibold">Google sign-in not configured</p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: '#fde68a' }}>
          Set <code className="rounded px-1 text-[11px]" style={{ background: 'rgba(2,6,23,0.28)' }}>VITE_GOOGLE_OAUTH_CLIENT_ID</code> in{' '}
          <code className="rounded px-1 text-[11px]" style={{ background: 'rgba(2,6,23,0.28)' }}>.env.local</code> (OAuth 2.0 Client ID of type{' '}
          <strong>Web application</strong>). In Google Cloud Console → APIs &amp; Services → Credentials → your
          client → add <strong>Authorized JavaScript origins</strong>:{' '}
          <code className="text-[11px]">http://localhost:5173</code>,{' '}
          <code className="text-[11px]">http://127.0.0.1:5173</code>, and your production origin. Restart{' '}
          <code className="text-[11px]">npm run dev</code> after saving.
        </p>
      </div>
    );
  }

  if (!gsiReady) {
    return (
      <div
        className="rounded-2xl px-4 py-3 text-xs"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          color: 'var(--panel-text-muted)',
        }}
      >
        Loading Google sign-in… If this hangs, ensure{' '}
        <code className="rounded px-1" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)' }}>
          accounts.google.com
        </code>{' '}
        is not blocked and{' '}
        <code className="rounded px-1" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)' }}>
          index.html
        </code>{' '}
        loads the GSI script.
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-2xl px-4 py-3 text-sm"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
        color: 'var(--panel-text)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--panel-text-muted)' }}>
          Google account (MCP OAuth)
        </span>
        {signedIn ? (
          <span className="text-xs font-medium" style={{ color: 'var(--panel-accent-text)' }}>
            Connected · Google token ready for Workspace
          </span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            Sign in required for Calendar, Mail, and Drive
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {!signedIn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignIn()}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
            style={{
              background: 'var(--panel-accent-bg)',
              border: '1px solid var(--panel-accent-border)',
              color: 'var(--panel-accent-text)',
            }}
          >
            <LogIn className="w-4 h-4" />
            {busy ? 'Opening Google…' : 'Sign in with Google'}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                background: 'var(--panel-accent-bg)',
                border: '1px solid var(--panel-accent-border)',
                color: 'var(--panel-accent-text)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh token
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                color: 'var(--panel-text)',
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </>
        )}
      </div>
      {showDiagnosticsChrome ? (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
          “Connect Workspace” only marks this device in local storage; it is <strong>not</strong> Google login. Use the
          button above so the MCP receives{' '}
          <code className="rounded px-0.5" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text)' }}>
            Authorization: Bearer
          </code>.
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
          “Connect Workspace” only saves a preference on this device. Use <strong>Sign in with Google</strong> so your
          requests can use your account.
        </p>
      )}
      {lastError ? (
        <p className={`text-xs text-red-700 ${showDiagnosticsChrome ? 'font-mono' : ''}`}>{lastError}</p>
      ) : null}
    </div>
  );
}
