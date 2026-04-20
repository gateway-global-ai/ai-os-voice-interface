/**
 * External identity handoff for **123CheckMe** (Gateway Global AI).
 *
 * OTP and SMS stay on the hosted platform — this app does not embed Twilio or
 * CHECKME_API_KEY. Flow matches the upstream repo:
 * `https://github.com/gateway-global-ai/identity-verification-mcp-gateway-gobal-ai`
 *
 * After verification, 123CheckMe can redirect with query params such as:
 * `?status=success&type=magic-link&verification_id=...&state=...`
 * (see `replit.md` / SDK docs in that repo.)
 *
 * Environment:
 * - **`import.meta.env.VITE_CHECKME_VERIFICATION_ENTRY_URL`** — optional full URL to open
 *   (e.g. your branded hosted path or `https://123checkme.com/demo` for the interactive demo).
 *   If unset, defaults to the public demo path below.
 */

const DEFAULT_CHECKME_ENTRY =
  (import.meta.env.VITE_CHECKME_VERIFICATION_ENTRY_URL as string | undefined)?.trim() ||
  'https://123checkme.com/demo';

/** Sent as `SubmitOTP` when the user finished verification in the browser (no in-app code). */
export const CHECKME_EXTERNAL_OTP_MARKER = '__checkme_external__';

export function getCheckMeVerificationEntryUrl(): string {
  return DEFAULT_CHECKME_ENTRY;
}

/**
 * Builds a URL to open in the system/browser. Optionally appends handoff query params
 * if your hosted page reads them.
 */
export function buildCheckMeVerificationUrl(options: {
  /** E.164 or local format; optional */
  phone?: string;
  /** Correlates redirect `state` if your hosted flow supports it */
  state?: string;
}): string {
  try {
    const base = new URL(getCheckMeVerificationEntryUrl());
    if (options.phone?.trim()) {
      base.searchParams.set('phone', options.phone.trim());
    }
    if (options.state?.trim()) {
      base.searchParams.set('state', options.state.trim());
    }
    base.searchParams.set('source', 'ai-os-voice');
    return base.toString();
  } catch {
    const q = new URLSearchParams();
    if (options.phone?.trim()) q.set('phone', options.phone.trim());
    if (options.state?.trim()) q.set('state', options.state.trim());
    q.set('source', 'ai-os-voice');
    const qs = q.toString();
    return qs ? `${getCheckMeVerificationEntryUrl()}?${qs}` : getCheckMeVerificationEntryUrl();
  }
}

export function openCheckMeVerificationPage(url: string): void {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.warn('[identityVerification] window.open failed:', e);
  }
}

/** Parse `?status=...&verification_id=...` when you add a return route later. */
export function parseCheckMeReturnParams(search: string): {
  status: string | null;
  type: string | null;
  verification_id: string | null;
  state: string | null;
} {
  const p = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return {
    status: p.get('status'),
    type: p.get('type'),
    verification_id: p.get('verification_id'),
    state: p.get('state'),
  };
}
