import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Load `.env`, `.env.local`, etc. from this app folder (not the parent `Apps` directory).
const envDir = __dirname;

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, envDir, '');
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY ?? ''),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Avoid 3000–3006 if those ports are reserved in your environment; override with `vite --port=...`.
      port: 5173,
      /** If true, dev fails when 5173 is taken — avoids silently serving on 5174 while you still open :5173 (unstyled / wrong app). */
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
      },
    },
  };
});
