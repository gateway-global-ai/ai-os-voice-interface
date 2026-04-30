/**
 * Vite `loadEnv` merges files in this order (later wins):
 * `.env` → `.env.local` → `.env.[mode]` → `.env.[mode].local`
 * So an empty `GEMINI_API_KEY=` in `.env.production` can wipe the real key from `.env.local`.
 * If no non-empty `GEMINI_API_KEY` remains, backfill from `.env.local` on disk (production VPS parity with dev laptop).
 * Legacy `VITE_GEMINI_API_KEY` in that file is copied into `GEMINI_API_KEY` once, then stripped — never keep `VITE_GEMINI_API_KEY` in merged env (Vite exposes `VITE_*` to the browser).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseDotenv } from 'dotenv';

export function mergeGeminiEnvFromEnvLocal(
  projectRoot: string,
  env: Record<string, string>,
): Record<string, string> {
  const merged = { ...env };
  if (!merged.GEMINI_API_KEY?.trim()) {
    const p = resolve(projectRoot, '.env.local');
    if (existsSync(p)) {
      const parsed = parseDotenv(readFileSync(p, 'utf-8'));
      const fromFile =
        parsed.GEMINI_API_KEY?.trim() || parsed.VITE_GEMINI_API_KEY?.trim();
      if (fromFile) merged.GEMINI_API_KEY = fromFile;
    }
  }
  // Never keep VITE_GEMINI_API_KEY in merged env — Vite injects `VITE_*` into the client.
  delete merged.VITE_GEMINI_API_KEY;
  return merged;
}

/** Keys used by 123checkme OTP proxy + client (see `server/otpProxyForward.ts`, `checkmeClient.ts`, `vite.config.ts`). */
const OTP_BACKFILL_KEYS = [
  '123CHECKME_KEY',
  'VITE_123CHECKME_KEY',
  'VITE_OTP_API_BEARER',
  'VITE_CHECKME_API_KEY',
  'CHECKME_API_KEY',
  'VITE_OTP_PROXY_TARGET',
  'OTP_PROXY_TARGET',
] as const;

/**
 * Same later-file-wins issue as `GEMINI_API_KEY`: a blank `123CHECKME_KEY=` in `.env.production`
 * can wipe a real value from earlier `.env.local` after Vite's merge. Backfill missing/empty
 * values from `.env.local` on disk so `server/prodHost` and the Vite config see the key.
 */
export function mergeOtpCheckmeFromEnvLocal(
  projectRoot: string,
  env: Record<string, string>,
): Record<string, string> {
  const merged = { ...env };
  const p = resolve(projectRoot, '.env.local');
  if (!existsSync(p)) return merged;
  const parsed = parseDotenv(readFileSync(p, 'utf-8'));
  for (const key of OTP_BACKFILL_KEYS) {
    if (merged[key]?.trim()) continue;
    const v = parsed[key];
    if (typeof v === 'string' && v.trim()) {
      merged[key] = v.trim();
    }
  }
  return merged;
}
