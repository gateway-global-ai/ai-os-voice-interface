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
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
        <p className="font-semibold">Google sign-in not configured</p>
        <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
          Set <code className="bg-amber-100 px-1 rounded text-[11px]">VITE_GOOGLE_OAUTH_CLIENT_ID</code> in{' '}
          <code className="bg-amber-100 px-1 rounded text-[11px]">.env.local</code> (OAuth 2.0 Client ID of type{' '}
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
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
        Loading Google sign-in… If this hangs, ensure <code className="bg-zinc-200/80 px-1 rounded">accounts.google.com</code>{' '}
        is not blocked and <code className="bg-zinc-200/80 px-1 rounded">index.html</code> loads the GSI script.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm text-zinc-800 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sky-800/80">Google account (MCP OAuth)</span>
        {signedIn ? (
          <span className="text-xs text-emerald-700 font-medium">Connected · Google token ready for Workspace</span>
        ) : (
          <span className="text-xs text-amber-800">Sign in required for Calendar, Mail, and Drive</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {!signedIn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSignIn()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
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
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh token
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200/80 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </>
        )}
      </div>
      {showDiagnosticsChrome ? (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          “Connect Workspace” only marks this device in local storage; it is <strong>not</strong> Google login. Use the
          button above so the MCP receives <code className="bg-white/80 px-0.5 rounded">Authorization: Bearer</code>.
        </p>
      ) : (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
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
