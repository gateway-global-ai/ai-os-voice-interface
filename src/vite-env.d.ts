/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Web client ID for Google Identity Services (Sign in with Google) — Calendar/Gmail read scopes. */
  readonly VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  readonly VITE_WORKSPACE_MCP_URL?: string;
  readonly VITE_WORKSPACE_MCP_JSONRPC_PATH?: string;
  readonly VITE_WORKSPACE_MCP_TIMEOUT_MS?: string;
  /** Set to `false` to disable `/__workspace_mcp` dev proxy. */
  readonly VITE_WORKSPACE_MCP_PROXY?: string;
  /** Override proxy target (default `https://mcp.gatewayglobal.ai`). */
  readonly VITE_WORKSPACE_MCP_PROXY_TARGET?: string;
  /**
   * Google user email for MCP `user_google_email` (preferred — avoids shell env overriding `.env.local`
   * for the legacy `VITE_WORKSPACE_GOOGLE_USER_EMAIL` name).
   */
  readonly VITE_AIOS_GOOGLE_USER_EMAIL?: string;
  /** @deprecated Prefer `VITE_AIOS_GOOGLE_USER_EMAIL` if an empty shell var overrides `.env.local`. */
  readonly VITE_WORKSPACE_GOOGLE_USER_EMAIL?: string;
  /**
   * If `true`, send `user_google_email` on every MCP tool call (legacy single-user servers).
   * Default / unset: omit it — OAuth 2.1 HTTP MCP derives the user from `Authorization: Bearer`.
   */
  readonly VITE_WORKSPACE_MCP_INCLUDE_USER_EMAIL?: string;
  /**
   * Google OAuth access token for MCP OAuth 2.1 (`Authorization: Bearer`). Dev/local only — do not ship to production clients.
   */
  readonly VITE_WORKSPACE_MCP_BEARER_TOKEN?: string;
  /** Alias for `VITE_WORKSPACE_MCP_BEARER_TOKEN`. */
  readonly VITE_GOOGLE_OAUTH_ACCESS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
