/**
 * Dev: same-origin /api/local-model/* → Ollama (CORS-safe). Handlers: `src/local-llm/localModelServe.ts`.
 * Production: `npm run build && npm start` uses `server/prodHost.ts` (same contract).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { serveLocalModelChat, serveLocalModelReadiness } from '../src/local-llm/localModelServe';

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
        if (!url.startsWith('/api/local-model/')) {
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

          sendJson(res, 404, { error: 'Not found' });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 500, { error: msg });
        }
      });
    },
  };
}
