/**
 * Local Gemini API key check — loads `.env.local` like dev/prod host and pings Google via generateContent.
 * Run: npx tsx scripts/geminiKeyHealth.ts
 */
import { loadEnv } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeGeminiEnvFromEnvLocal } from '../server/mergeGeminiEnv';
import { serveGeminiReadiness, serveGeminiHealth } from '../server/geminiServe.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Match prodHost: production mode can hide GEMINI if `.env.production` has an empty key. */
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = mergeGeminiEnvFromEnvLocal(root, loadEnv(mode, root, '') as Record<string, string>);

const hasKey = Boolean(
  (env.GEMINI_API_KEY ?? '').trim(),
);
console.log('Working directory (env root):', root);
console.log('GEMINI_API_KEY set:', hasKey);
if (!hasKey) {
  console.error('Set GEMINI_API_KEY in .env.local (see .env.example).');
  process.exit(1);
}

const readiness = serveGeminiReadiness(env);
console.log('\nreadiness (GET /api/gemini/readiness):');
console.log(JSON.stringify(readiness.body, null, 2));

const health = await serveGeminiHealth(env);
console.log('\nhealth (GET /api/gemini/health — live generateContent ping):');
console.log(JSON.stringify(health.body, null, 2));

const ok =
  health.status === 200 &&
  typeof health.body === 'object' &&
  health.body !== null &&
  'ok' in health.body &&
  (health.body as { ok?: boolean }).ok === true;
if (!ok) process.exitCode = 2;
