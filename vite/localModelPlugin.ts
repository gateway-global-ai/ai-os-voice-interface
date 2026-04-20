/**
 * Dev: same-origin /api/local-model/* → Ollama (CORS-safe). Handlers: `src/local-llm/localModelServe.ts`.
 * Production: `npm run build && npm start` uses `server/prodHost.ts` (same contract).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { serveLocalModelChat, serveLocalModelReadiness } from '../src/local-llm/localModelServe';
import {
  serveGeminiGenerate,
  serveGeminiHealth,
  serveGeminiReadiness,
  serveGeminiTts,
  streamGeminiTts,
} from '../server/geminiServe';
import { createPodcastEpisode, listPodcastEpisodes } from '../server/podcastLibraryServe';

function readJsonBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function localModelDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-model-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        const isLocalModelRoute = url.startsWith('/api/local-model/');
        const isGeminiRoute = url.startsWith('/api/gemini/');
        const isPodcastRoute = url.startsWith('/__podcast_library_api/episodes');

        if (!isLocalModelRoute && !isGeminiRoute && !isPodcastRoute) {
          next();
          return;
        }

        const sendJson = (r: ServerResponse, status: number, obj: unknown) => {
          r.statusCode = status;
          r.setHeader('Content-Type', 'application/json; charset=utf-8');
          r.end(JSON.stringify(obj));
        };

        try {
          if (url.startsWith('/api/local-model/readiness') && req.method === 'GET') {
            const readiness = await serveLocalModelReadiness(env);
            sendJson(res, 200, readiness);
            return;
          }

          if (url.startsWith('/api/local-model/chat') && req.method === 'POST') {
            const raw = await readJsonBody(req);
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw) as unknown;
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            const r = await serveLocalModelChat(env, parsed);
            sendJson(res, r.status, r.body);
            return;
          }

          if (url.startsWith('/api/gemini/readiness') && req.method === 'GET') {
            const r = serveGeminiReadiness(env);
            sendJson(res, r.status, r.body);
            return;
          }

          if (url.startsWith('/api/gemini/health') && req.method === 'GET') {
            const r = await serveGeminiHealth(env);
            sendJson(res, r.status, r.body);
            return;
          }

          if (url.startsWith('/api/gemini/generate') && req.method === 'POST') {
            const raw = await readJsonBody(req);
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw) as unknown;
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            const r = await serveGeminiGenerate(env, parsed);
            sendJson(res, r.status, r.body);
            return;
          }

          if (url.startsWith('/api/gemini/tts') && req.method === 'POST') {
            if (url.startsWith('/api/gemini/tts/stream')) {
              const raw = await readJsonBody(req);
              let parsed: unknown;
              try {
                parsed = JSON.parse(raw) as unknown;
              } catch {
                sendJson(res, 400, { error: 'Invalid JSON body' });
                return;
              }
              await streamGeminiTts(env, parsed, res, (handler) => {
                req.on('close', handler);
                res.on('close', handler);
              });
              return;
            }

            const raw = await readJsonBody(req);
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw) as unknown;
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            const r = await serveGeminiTts(env, parsed);
            sendJson(res, r.status, r.body);
            return;
          }

          if (url.startsWith('/__podcast_library_api/episodes') && req.method === 'GET') {
            const episodes = await listPodcastEpisodes();
            sendJson(res, 200, episodes);
            return;
          }

          if (url.startsWith('/__podcast_library_api/episodes') && req.method === 'POST') {
            const raw = await readJsonBody(req);
            let parsed: unknown;
            try {
              parsed = JSON.parse(raw) as unknown;
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON body' });
              return;
            }
            const episode = await createPodcastEpisode(parsed as Parameters<typeof createPodcastEpisode>[0]);
            sendJson(res, 201, episode);
            return;
          }

          sendJson(res, 404, { error: 'Not found' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 500, { error: msg });
        }
      });
    },
  };
}
