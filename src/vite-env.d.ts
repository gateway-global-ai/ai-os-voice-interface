/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKSPACE_MCP_URL?: string;
  readonly VITE_WORKSPACE_MCP_JSONRPC_PATH?: string;
  readonly VITE_WORKSPACE_MCP_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
