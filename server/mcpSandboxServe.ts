#!/usr/bin/env npx tsx
/**
 * Separate-origin MCP Apps sandbox (port 8766 by default).
 * Serves sandbox.html + sandbox.bundle.js with CSP headers (see ext-apps basic-host serve.ts).
 *
 * Run: `npm run mcp:sandbox`
 *
 * @license SPDX-License-Identifier: MIT
 * @see https://github.com/modelcontextprotocol/ext-apps/blob/main/examples/basic-host/serve.ts
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { McpUiResourceCsp } from '@modelcontextprotocol/ext-apps';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SANDBOX_PORT = parseInt(process.env.MCP_SANDBOX_PORT || '8766', 10);
const PUBLIC = join(__dirname, '..', 'public', 'mcp-sandbox');

function sanitizeCspDomains(domains?: string[]): string[] {
  if (!domains) return [];
  return domains.filter((d) => typeof d === 'string' && !/[;\r\n'" ]/.test(d));
}

function buildCspHeader(csp?: McpUiResourceCsp): string {
  const resourceDomains = sanitizeCspDomains(csp?.resourceDomains).join(' ');
  const connectDomains = sanitizeCspDomains(csp?.connectDomains).join(' ');
  const frameDomains = sanitizeCspDomains(csp?.frameDomains).join(' ') || null;
  const baseUriDomains = sanitizeCspDomains(csp?.baseUriDomains).join(' ') || null;

  const directives = [
    "default-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: ${resourceDomains}`.trim(),
    `style-src 'self' 'unsafe-inline' blob: data: ${resourceDomains}`.trim(),
    `img-src 'self' data: blob: ${resourceDomains}`.trim(),
    `font-src 'self' data: blob: ${resourceDomains}`.trim(),
    `media-src 'self' data: blob: ${resourceDomains}`.trim(),
    `connect-src 'self' ${connectDomains}`.trim(),
    `worker-src 'self' blob: ${resourceDomains}`.trim(),
    frameDomains ? `frame-src ${frameDomains}` : "frame-src 'none'",
    'object-src none',
    baseUriDomains ? `base-uri ${baseUriDomains}` : "base-uri 'none'",
  ];

  return directives.join('; ');
}

const sandboxApp = express();
sandboxApp.use(cors({ origin: true }));

sandboxApp.use(express.static(PUBLIC, { index: false }));

sandboxApp.get(['/', '/sandbox.html'], (req, res) => {
  let cspConfig: McpUiResourceCsp | undefined;
  if (typeof req.query.csp === 'string') {
    try {
      cspConfig = JSON.parse(req.query.csp) as McpUiResourceCsp;
    } catch {
      console.warn('[mcpSandbox] Invalid csp query param');
    }
  }
  res.setHeader('Content-Security-Policy', buildCspHeader(cspConfig));
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(join(PUBLIC, 'sandbox.html'));
});

sandboxApp.use((_req, res) => {
  res.status(404).send('Not found');
});

sandboxApp.listen(SANDBOX_PORT, '0.0.0.0', () => {
  console.log(`[mcpSandbox] http://127.0.0.1:${SANDBOX_PORT}/sandbox.html`);
});
