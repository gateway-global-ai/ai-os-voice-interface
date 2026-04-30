#!/usr/bin/env npx tsx
/**
 * Streamable HTTP MCP pilot for AI OS shell MCP-UI (Tier B).
 * Registers MCP Apps tools + ui:// resources (community funnel, students detail, OTP phone).
 *
 * Run: `npm run mcp:shell-pilot` (default http://127.0.0.1:8765/mcp)
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerAppResource, registerAppTool } from '@modelcontextprotocol/ext-apps/server';
import { createUIResource } from '@mcp-ui/server';
import { communityFunnelHtml, otpPhoneHtml, studentsDetailHtml } from './mcpShellPilot/htmlUi.js';

const MCP_PORT = parseInt(process.env.MCP_SHELL_PILOT_PORT || '8765', 10);

function buildServer(): McpServer {
  const server = new McpServer({ name: 'aios-shell-pilot', version: '0.1.0' });

  const funnel = createUIResource({
    uri: 'ui://aios/community/funnel',
    content: { type: 'rawHtml', htmlString: communityFunnelHtml() },
    encoding: 'text',
  });
  const students = createUIResource({
    uri: 'ui://aios/community/students',
    content: { type: 'rawHtml', htmlString: studentsDetailHtml() },
    encoding: 'text',
  });
  const otp = createUIResource({
    uri: 'ui://aios/auth/otp-phone',
    content: { type: 'rawHtml', htmlString: otpPhoneHtml() },
    encoding: 'text',
  });

  registerAppResource(server, 'AIOS Community funnel', 'ui://aios/community/funnel', { description: 'VCU join paths' }, async () => ({
    contents: [funnel.resource],
  }));
  registerAppResource(server, 'AIOS Students detail', 'ui://aios/community/students', { description: 'Students — two CTAs' }, async () => ({
    contents: [students.resource],
  }));
  registerAppResource(server, 'AIOS OTP phone', 'ui://aios/auth/otp-phone', { description: 'Phone capture (MCP UI)' }, async () => ({
    contents: [otp.resource],
  }));

  registerAppTool(
    server,
    'aios_show_community_funnel',
    {
      title: 'Show community funnel',
      description: 'Opens the Joining the Community MCP App surface.',
      _meta: { ui: { resourceUri: 'ui://aios/community/funnel' } },
    },
    async () => ({
      content: [{ type: 'text', text: 'Community funnel UI resource ready.' }],
    }),
  );

  registerAppTool(
    server,
    'aios_show_students_detail',
    {
      title: 'Students detail',
      description: 'Students audience card (Create account + Login only).',
      _meta: { ui: { resourceUri: 'ui://aios/community/students' } },
    },
    async () => ({
      content: [{ type: 'text', text: 'Students detail UI resource ready.' }],
    }),
  );

  registerAppTool(
    server,
    'aios_show_otp_phone',
    {
      title: 'OTP — phone step',
      description: 'Phone entry step for verification (MCP App).',
      _meta: { ui: { resourceUri: 'ui://aios/auth/otp-phone' } },
    },
    async () => ({
      content: [{ type: 'text', text: 'OTP phone UI resource ready.' }],
    }),
  );

  return server;
}

const transports: Record<string, StreamableHTTPServerTransport> = {};

const app = createMcpExpressApp({ host: '0.0.0.0' });
app.use(cors({ origin: true }));

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        },
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };
      const mcp = buildServer();
      await mcp.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('[mcpShellPilot]', e);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.listen(MCP_PORT, '0.0.0.0', () => {
  console.log(`[mcpShellPilot] MCP Streamable HTTP on http://127.0.0.1:${MCP_PORT}/mcp`);
});
