import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import {defineConfig, loadEnv} from 'vite';
import {mergeGeminiEnvFromEnvLocal, mergeOtpCheckmeFromEnvLocal} from './server/mergeGeminiEnv';
import {handleCourseCreatorApi} from './server/courseCreatorServe';
import {handleCheckmeSaasAdminApi} from './server/checkmeSaasAdminServe';
import {handleOperatorSessionApi} from './server/operatorSessionServe';
import {handleAdminKnowledgebaseApi} from './server/adminKnowledgebaseServe';
import {localModelDevPlugin} from './vite/localModelPlugin';

// Load `.env`, `.env.local`, etc. from this app folder (not the parent `Apps` directory).
const envDir = __dirname;

function looksLikeGovernancePort8100(targetUrl: string): boolean {
  try {
    const u = new URL(targetUrl);
    const port = u.port || (u.protocol === 'https:' ? '443' : '80');
    return port === '8100' || targetUrl.includes(':8100');
  } catch {
    return targetUrl.includes(':8100');
  }
}

/** `/api` → `/v1` rewrite (AIOS Governance) only when explicitly enabled or when governance is a separate :8100 API. */
function shouldGovernanceRewriteToV1(
  env: Record<string, string>,
  otpTarget: string,
  governanceTarget: string
): boolean {
  if (env.VITE_GOVERNANCE_PROXY_REWRITE === 'true') return true;
  if (governanceTarget === otpTarget) return false;
  return looksLikeGovernancePort8100(governanceTarget);
}

export default defineConfig(({mode}) => {
  const env = mergeOtpCheckmeFromEnvLocal(
    envDir,
    mergeGeminiEnvFromEnvLocal(envDir, loadEnv(mode, envDir, '') as Record<string, string>),
  );
  /** Browser OTP (`checkmeClient`) reads `VITE_123CHECKME_KEY`; `.env` often uses server-style `123CHECKME_KEY` — merge for the bundle. */
  const resolvedVite123CheckmeKey =
    (env.VITE_123CHECKME_KEY ?? '').trim() || (env['123CHECKME_KEY'] ?? '').trim();
  const otpProxyTarget = env.VITE_OTP_PROXY_TARGET || 'http://127.0.0.1:3010';
  const mcpShellPilotTarget = env.VITE_MCP_SHELL_PILOT_PROXY_TARGET || 'http://127.0.0.1:8765';
  const governanceProxyTarget = env.VITE_GOVERNANCE_PROXY_TARGET || otpProxyTarget;
  const rewriteApiToV1 = shouldGovernanceRewriteToV1(env, otpProxyTarget, governanceProxyTarget);
  const shouldAnalyzeBundle = mode === 'analyze';

  return {
    envDir,
    plugins: [
      localModelDevPlugin(env),
      {
        name: 'aios-course-creator-api',
        configureServer(server) {
          server.middlewares.use('/api/operator-session', (req, res) => {
            req.url = '/api/operator-session';
            void handleOperatorSessionApi(env, req, res);
          });
          server.middlewares.use('/__course_creator_api', (req, res) => {
            req.url = `/__course_creator_api${req.url ?? ''}`;
            void handleCourseCreatorApi(env, req, res);
          });
          server.middlewares.use('/__checkme_saas_admin_api', (req, res) => {
            req.url = `/__checkme_saas_admin_api${req.url ?? ''}`;
            void handleCheckmeSaasAdminApi(env, req, res);
          });
          server.middlewares.use('/__admin_knowledgebase_api', (req, res) => {
            req.url = `/__admin_knowledgebase_api${req.url ?? ''}`;
            void handleAdminKnowledgebaseApi(env, req, res);
          });
        },
      },
      react(),
      tailwindcss(),
      ...(shouldAnalyzeBundle
        ? [
            visualizer({
              filename: 'dist/bundle-report.html',
              template: 'sunburst',
              gzipSize: true,
              brotliSize: true,
              open: false,
            }),
            visualizer({
              filename: 'dist/bundle-report.json',
              template: 'raw-data',
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
    define: {
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY ?? ''),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY ?? ''),
      'process.env.TWILIO_ACCOUNT_SID': JSON.stringify(env.TWILIO_ACCOUNT_SID ?? ''),
      'process.env.TWILIO_AUTH_TOKEN': JSON.stringify(env.TWILIO_AUTH_TOKEN ?? ''),
      'process.env.TWILIO_PHONE_NUMBER': JSON.stringify(env.TWILIO_PHONE_NUMBER ?? ''),
      'import.meta.env.AI_OS_SUPABASE_URL': JSON.stringify(env.AI_OS_SUPABASE_URL ?? ''),
      'import.meta.env.AI_OS_SUPABASE_PUBLIC_KEY': JSON.stringify(env.AI_OS_SUPABASE_PUBLIC_KEY ?? ''),
      // Ensures `getOptionalBearer()` sees a key when only `123CHECKME_KEY` is set in `.env.local`.
      'import.meta.env.VITE_123CHECKME_KEY': JSON.stringify(resolvedVite123CheckmeKey),
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Avoid 3000–3006 if those ports are reserved in your environment; override with `vite --port=...`.
      port: 5173,
      /** If true, dev fails when 5173 is taken — avoids silently serving on 5174 while you still open :5173 (unstyled / wrong app). */
      /** `package.json` **`predev`** runs **`kill-port 5173`** before **`npm run dev`** to clear a stale dev server. */
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        /**
         * Order matters: `/api` matches `/api/send-otp`, so OTP paths must be registered before `/api`.
         *
         * OTP → main `server.js` (PORT e.g. 3010). Catch‑all `/api` defaults to the same target so demo routes
         * (send-magic-link, etc.) hit `server.js` unless `VITE_GOVERNANCE_PROXY_TARGET` points elsewhere.
         * `/api` → `/v1` rewrite runs only when `VITE_GOVERNANCE_PROXY_REWRITE=true`, or when governance target
         * differs from OTP and looks like local :8100 (AIOS Governance API).
         */
        '/api/send-otp': {
          target: otpProxyTarget,
          changeOrigin: true,
        },
        '/api/verify-otp': {
          target: otpProxyTarget,
          changeOrigin: true,
        },
        '/api': {
          target: governanceProxyTarget,
          changeOrigin: true,
          rewrite: (path) =>
            rewriteApiToV1 ? '/v1' + path.slice('/api'.length) : path,
        },
        /** Tier B MCP shell pilot — same-origin Streamable HTTP for @mcp-ui/client (browser). */
        '/mcp/core': {
          target: mcpShellPilotTarget,
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/mcp\/core/, '/mcp'),
        },
        /** Same-origin proxy for Workspace MCP (browser CORS). Override target: VITE_WORKSPACE_MCP_PROXY_TARGET. Disable: VITE_WORKSPACE_MCP_PROXY=false */
        ...(env.VITE_WORKSPACE_MCP_PROXY === 'false'
          ? {}
          : {
              '/__workspace_mcp': {
                target: env.VITE_WORKSPACE_MCP_PROXY_TARGET || 'https://mcp.gatewayglobal.ai',
                changeOrigin: true,
                secure: true,
                rewrite: (p: string) => p.replace(/^\/__workspace_mcp/, '/googleworkspace'),
              },
            }),
      },
    },
  };
});
