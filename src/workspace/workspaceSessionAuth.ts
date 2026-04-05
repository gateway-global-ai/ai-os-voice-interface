/**
 * In-memory Google OAuth **access token** for MCP OAuth 2.1 (browser session).
 * Prefer this over `VITE_WORKSPACE_MCP_BEARER_TOKEN` when the user signs in with Google in-app.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

let accessToken: string | null = null;
/** Epoch ms when token is treated as expired (with 60s skew). */
let expiresAtMs: number | null = null;

export function setSessionGoogleAccessToken(token: string | null, expiresInSeconds?: number): void {
  const t = token?.trim() || null;
  accessToken = t;
  if (t && typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
    expiresAtMs = Date.now() + expiresInSeconds * 1000;
  } else {
    expiresAtMs = null;
  }
}

export function getSessionGoogleAccessToken(): string | null {
  if (!accessToken) return null;
  if (expiresAtMs != null && Date.now() > expiresAtMs - 60_000) {
    accessToken = null;
    expiresAtMs = null;
    return null;
  }
  return accessToken;
}

export function clearSessionGoogleAccessToken(): void {
  accessToken = null;
  expiresAtMs = null;
}

/**
 * Scopes for Phase 1 read plane (Calendar, Gmail, Drive, Contacts). Align with MCP / Cloud Console OAuth client.
 * Missing scopes → 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` from the relevant API (e.g. `drive.readonly` for Drive,
 * `contacts.readonly` for People `searchContacts`).
 */
export const WORKSPACE_GIS_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
].join(' ');
