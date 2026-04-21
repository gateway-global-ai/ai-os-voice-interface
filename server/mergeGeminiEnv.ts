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
