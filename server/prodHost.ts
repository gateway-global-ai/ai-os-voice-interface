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
import { mergeGeminiEnvFromEnvLocal, mergeOtpCheckmeFromEnvLocal } from './mergeGeminiEnv';
import { serveLocalModelChat, serveLocalModelReadiness } from '../src/local-llm/localModelServe';
import {
  serveGeminiGenerate,
  serveGeminiHealth,
  serveGeminiReadiness,
  serveGeminiTts,
  streamGeminiTts,
} from './geminiServe';
import { createPodcastEpisode, listPodcastEpisodes } from './podcastLibraryServe';
import { forwardOtpJson, getOtpUpstreamBaseForLog } from './otpProxyForward';
import { handleCourseCreatorApi } from './courseCreatorServe';
import { handleCheckmeSaasAdminApi } from './checkmeSaasAdminServe';
import { handleOperatorSessionApi } from './operatorSessionServe';
import { handleAdminKnowledgebaseApi } from './adminKnowledgebaseServe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = mergeOtpCheckmeFromEnvLocal(
  root,
  mergeGeminiEnvFromEnvLocal(root, loadEnv(mode, root, '') as Record<string, string>),
);

const port = Number(process.env.PORT) || 5173;

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));

/** Phone OTP — same as Vite dev proxy to 123checkme `server.js` (see vite.config.ts). */
app.post('/api/send-otp', (req, res) => {
  void forwardOtpJson(env, req, res, '/api/send-otp');
});
app.post('/api/verify-otp', (req, res) => {
  void forwardOtpJson(env, req, res, '/api/verify-otp');
});
app.post('/api/operator-session', (req, res) => {
  void handleOperatorSessionApi(env, req, res);
});

app.all('/__course_creator_api/*', (req, res) => {
  void handleCourseCreatorApi(env, req, res);
});

app.all('/__checkme_saas_admin_api/*', (req, res) => {
  void handleCheckmeSaasAdminApi(env, req, res);
});

app.all('/__admin_knowledgebase_api/*', (req, res) => {
  void handleAdminKnowledgebaseApi(env, req, res);
});

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

app.get('/api/gemini/readiness', (_req, res) => {
  const r = serveGeminiReadiness(env);
  res.status(r.status).json(r.body);
});

app.get('/api/gemini/health', async (_req, res) => {
  const r = await serveGeminiHealth(env);
  res.status(r.status).json(r.body);
});

app.post('/api/gemini/generate', async (req, res) => {
  const r = await serveGeminiGenerate(env, req.body);
  res.status(r.status).json(r.body);
});

app.post('/api/gemini/tts', async (req, res) => {
  const r = await serveGeminiTts(env, req.body);
  res.status(r.status).json(r.body);
});

app.post('/api/gemini/tts/stream', async (req, res) => {
  await streamGeminiTts(env, req.body, res, (handler) => {
    req.on('close', handler);
    res.on('close', handler);
  });
});

app.get('/__podcast_library_api/episodes', async (_req, res) => {
  try {
    const episodes = await listPodcastEpisodes();
    res.status(200).json(episodes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

app.post('/__podcast_library_api/episodes', async (req, res) => {
  try {
    const episode = await createPodcastEpisode(req.body);
    res.status(201).json(episode);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

/** Other /api/* routes are not implemented on this host — avoid SPA fallback masking API 404s. */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
});

app.use(express.static(resolve(root, 'public'), { index: false }));
app.use(express.static(resolve(root, 'dist'), { index: false }));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.sendFile(resolve(root, 'dist/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(
    `[prodHost] listening on http://0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV ?? 'unset'}, mode=${mode}, OTP upstream=${getOtpUpstreamBaseForLog(env)})`,
  );
});
