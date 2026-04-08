/**
 * Production-style host: static `dist/` + same-origin `/api/local-model/*` (parity with Vite dev middleware).
 *
 * Run after build: `npm run build && npm start` (see `PORT` in `.env.example`).
 * Env: `vite` `loadEnv` from app root — OLLAMA_*, LOCAL_LLM_*, VITE_OLLAMA_* (same semantics as dev).
 *
 * Other `/api/*` routes (e.g. optional local documents proxy on :8100) are not mounted here — use a reverse proxy
 * or extend this server if you need one process to serve both.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { serveLocalModelChat, serveLocalModelReadiness } from '../src/local-llm/localModelServe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, root, '');

const port = Number(process.env.PORT) || 5173;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

app.get('/api/local-model/readiness', async (_req, res) => {
  try {
    const readiness = await serveLocalModelReadiness(env);
    res.status(200).json(readiness);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post('/api/local-model/chat', async (req, res) => {
  const r = await serveLocalModelChat(env, req.body);
  res.status(r.status).json(r.body);
});

/** Other /api/* routes are not implemented on this host — avoid SPA fallback masking API 404s. */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

app.use(express.static(resolve(root, 'dist'), { index: false }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(resolve(root, 'dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[prodHost] listening on http://0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV ?? 'unset'}, mode=${mode})`);
});
