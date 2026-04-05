---
name: rebuild-app
description: >-
  Runs the Vite production build for the AI OS voice interface (npm run build),
  reports output and errors. Use when the user asks to rebuild the app, run a
  production build, refresh dist, or uses /rebuild. Local dev server uses port
  5173 (http://localhost:5173/) — not port 80.
---

# Rebuild AI OS voice interface

## When this applies

- User says **rebuild**, **production build**, **build dist**, or **`/rebuild`**
- After dependency or config changes where a fresh `dist/` is needed

## What to do

1. **Working directory:** project root `ai-os-voice-interface` (this repo). If the workspace is multi-root, use absolute path `C:\Apps\ai-os-voice-interface` when needed.
2. **Run** (PowerShell):

   ```powershell
   Set-Location "C:\Apps\ai-os-voice-interface"; npm run build
   ```

3. **Report:** exit code, any Rollup/Vite warnings, and that output is under `dist/`.
4. **On failure:** show the error output; fix only if the user asks.

## Local URL (this project)

- **`npm run build`** only writes to `dist/`; it does **not** start a server or open a browser.
- **Dev server** (when the user runs it or asks how to open the app): **http://localhost:5173/** or **http://127.0.0.1:5173/** — port **5173** is set in `vite.config.ts` with **`strictPort: true`**. **`npm run dev`** runs **`predev`** (`kill-port 5173`) first so a stuck previous Vite process does not block startup. Plain `http://127.0.0.1/` (port 80) will fail with connection refused.
- **Production preview of `dist/`:** `npm run preview` (Vite default is usually **http://localhost:4173/** unless overridden).

If the user says the site “refused to connect” on localhost, confirm they are using **:5173** for dev (or start `npm run dev`).

## Do not

- Run `npm run dev` unless they ask for the dev server
- Rebuild unrelated projects unless explicitly requested
