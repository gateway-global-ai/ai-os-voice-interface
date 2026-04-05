import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {localModelDevPlugin} from './vite/localModelPlugin';

// Load `.env`, `.env.local`, etc. from this app folder (not the parent `Apps` directory).
const envDir = __dirname;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, envDir, '');
  return {
    envDir,
    plugins: [localModelDevPlugin(env), react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY ?? ''),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY ?? ''),
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
        '/api': {
          target: 'http://127.0.0.1:8100',
          changeOrigin: true,
          rewrite: (p) => '/v1' + p.slice('/api'.length),
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
