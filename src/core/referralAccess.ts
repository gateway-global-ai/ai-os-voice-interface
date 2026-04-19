const REFERRAL_ACCESS_LOG_KEY = 'aios_referral_access_log';
const REFERRAL_ACCESS_ACTIVE_KEY = 'aios_referral_access_active_code';
const REFERRAL_ACCESS_CODES_KEY = 'aios_referral_access_codes';

const DEFAULT_REFERRAL_CODES = ['AIOS-ALPHA', 'PLATFORM-LOYALTY', 'EARLY-ACCESS'];

type ReferralAccessEvent = {
  code: string;
  accepted: boolean;
  at: string;
};

function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '-');
}

function readStoredCodes(): string[] {
  if (typeof window === 'undefined') return DEFAULT_REFERRAL_CODES;
  try {
    const raw = localStorage.getItem(REFERRAL_ACCESS_CODES_KEY);
    if (!raw) return DEFAULT_REFERRAL_CODES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_REFERRAL_CODES;
    const codes = parsed
      .map((value) => (typeof value === 'string' ? normalizeReferralCode(value) : ''))
      .filter(Boolean);
    return codes.length > 0 ? codes : DEFAULT_REFERRAL_CODES;
  } catch {
    return DEFAULT_REFERRAL_CODES;
  }
}

export function verifyReferralCode(raw: string): { accepted: boolean; normalized: string } {
  const normalized = normalizeReferralCode(raw);
  if (!normalized) return { accepted: false, normalized };
  return {
    accepted: readStoredCodes().includes(normalized),
    normalized,
  };
}

export function trackReferralAttempt(raw: string, accepted: boolean): void {
  if (typeof window === 'undefined') return;
  const event: ReferralAccessEvent = {
    code: normalizeReferralCode(raw),
    accepted,
    at: new Date().toISOString(),
  };

  try {
    const rawLog = localStorage.getItem(REFERRAL_ACCESS_LOG_KEY);
    const parsed = rawLog ? JSON.parse(rawLog) : [];
    const events = Array.isArray(parsed) ? parsed : [];
    const next = [...events, event].slice(-50);
    localStorage.setItem(REFERRAL_ACCESS_LOG_KEY, JSON.stringify(next));
  } catch {
    // ignore local tracking failures
  }
}

export function activateReferralCode(raw: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFERRAL_ACCESS_ACTIVE_KEY, normalizeReferralCode(raw));
  } catch {
    // ignore local tracking failures
  }
}
