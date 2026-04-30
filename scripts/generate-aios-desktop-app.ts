/**
 * Generate a full-stack AI OS desktop app scaffold from a manifest.
 *
 * Usage:
 *   tsx scripts/generate-aios-desktop-app.ts templates/aios-desktop-app/app.manifest.example.json /tmp/aios-app-out
 *
 * Source docs:
 * - Cursor skills: https://cursor.sh/docs/skills
 * - Rust skills CLI: https://crates.io/crates/skills
 * - Rust skills docs: https://docs.rs/skills/latest/skills/
 * - MCP server docs: https://modelcontextprotocol.io/docs/develop/build-server
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

type EndpointStatus = 'verified' | 'blocked' | 'unverified';

type IntentPath = {
  id: string;
  label: string;
  intent: string;
  description: string;
  endpointId: string;
  loadsOnStart?: boolean;
};

type BackendEndpoint = {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  status: EndpointStatus;
  purpose: string;
  writeControl?: boolean;
};

type McpTool = {
  name: string;
  endpointId: string;
  status: EndpointStatus;
};

type AppManifest = {
  appId: string;
  title: string;
  icon: string;
  description: string;
  requiredRole: 'authenticated' | 'operator' | 'admin';
  proxyBase: string;
  backendBaseEnv: string;
  backendAuthEnv: string;
  intentPaths: IntentPath[];
  backendEndpoints: BackendEndpoint[];
  mcpTools: McpTool[];
  noMockEvidence: {
    sourceDocs: string[];
    verificationCommands: string[];
    blockedPolicy: string;
  };
};

const templateRoot = resolve('templates/aios-desktop-app');

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Manifest field ${name} must be a non-empty string.`);
  }
}

function assertArray<T>(value: unknown, name: string): asserts value is T[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Manifest field ${name} must be a non-empty array.`);
  }
}

function validateManifest(raw: unknown): AppManifest {
  const manifest = raw as Partial<AppManifest>;
  assertString(manifest.appId, 'appId');
  assertString(manifest.title, 'title');
  assertString(manifest.icon, 'icon');
  assertString(manifest.description, 'description');
  assertString(manifest.requiredRole, 'requiredRole');
  assertString(manifest.proxyBase, 'proxyBase');
  assertString(manifest.backendBaseEnv, 'backendBaseEnv');
  assertString(manifest.backendAuthEnv, 'backendAuthEnv');
  assertArray<IntentPath>(manifest.intentPaths, 'intentPaths');
  assertArray<BackendEndpoint>(manifest.backendEndpoints, 'backendEndpoints');
  assertArray<McpTool>(manifest.mcpTools, 'mcpTools');
  if (!manifest.noMockEvidence) {
    throw new Error('Manifest field noMockEvidence is required.');
  }
  assertArray<string>(manifest.noMockEvidence.sourceDocs, 'noMockEvidence.sourceDocs');
  assertArray<string>(manifest.noMockEvidence.verificationCommands, 'noMockEvidence.verificationCommands');
  assertString(manifest.noMockEvidence.blockedPolicy, 'noMockEvidence.blockedPolicy');
  if (!/^[a-z][a-z0-9_]*$/.test(manifest.appId)) {
    throw new Error('appId must match ^[a-z][a-z0-9_]*$');
  }
  if (!manifest.proxyBase.startsWith('/__') || !manifest.proxyBase.endsWith('_api')) {
    throw new Error('proxyBase must look like /__example_app_api.');
  }
  for (const intent of manifest.intentPaths) {
    if (intent.loadsOnStart) {
      throw new Error(`Intent ${intent.id} sets loadsOnStart=true. AI OS apps must open to a start page first.`);
    }
    const endpoint = manifest.backendEndpoints.find((item) => item.id === intent.endpointId);
    if (!endpoint) {
      throw new Error(`Intent ${intent.id} references missing endpointId ${intent.endpointId}.`);
    }
  }
  return manifest as AppManifest;
}

function pascalCase(input: string): string {
  return input
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
}

function rustCrateName(appId: string): string {
  return appId.replace(/_/g, '-');
}

function render(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (next, [key, value]) => next.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function markdownList(rows: string[]): string {
  return rows.map((row) => `- ${row}`).join('\n');
}

function endpointMap(manifest: AppManifest) {
  return manifest.backendEndpoints.map((endpoint) => ({
    id: endpoint.id,
    method: endpoint.method,
    proxyPath: endpoint.path,
    upstreamPath: endpoint.path,
    status: endpoint.status,
    purpose: endpoint.purpose,
  }));
}

function intentPanelRows(manifest: AppManifest) {
  return manifest.intentPaths.map((intent) => {
    const endpoint = manifest.backendEndpoints.find((item) => item.id === intent.endpointId);
    return {
      id: intent.id,
      label: intent.label,
      intent: intent.intent,
      description: intent.description,
      path: endpoint?.path ?? '/',
    };
  });
}

async function readTemplate(path: string): Promise<string> {
  return readFile(join(templateRoot, path), 'utf8');
}

async function writeRendered(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  const outDir = process.argv[3];
  if (!manifestPath || !outDir) {
    throw new Error('Usage: tsx scripts/generate-aios-desktop-app.ts <manifest.json> <output-dir>');
  }

  const manifest = validateManifest(JSON.parse(await readFile(resolve(manifestPath), 'utf8')));
  const resolvedOutDir = resolve(outDir);
  const componentName = `${pascalCase(manifest.appId)}Panel`;
  const handlerName = `handle${pascalCase(manifest.appId)}Api`;
  const viewUnion = manifest.intentPaths.map((intent) => `'${intent.id}'`).join(' | ');
  const proxyBaseRegex = manifest.proxyBase.replace(/\//g, '\\/');

  const replacements: Record<string, string> = {
    APP_ID: manifest.appId,
    APP_ID_UPPER: manifest.appId.toUpperCase(),
    TITLE: manifest.title,
    ICON: manifest.icon,
    DESCRIPTION: manifest.description,
    REQUIRED_ROLE: manifest.requiredRole,
    PROXY_BASE: manifest.proxyBase,
    PROXY_BASE_REGEX: proxyBaseRegex,
    BACKEND_BASE_ENV: manifest.backendBaseEnv,
    BACKEND_AUTH_ENV: manifest.backendAuthEnv,
    COMPONENT_NAME: componentName,
    HANDLER_NAME: handlerName,
    RUST_CRATE_NAME: rustCrateName(manifest.appId),
    VIEW_ID_UNION: viewUnion,
    INTENT_PATHS_JSON: JSON.stringify(intentPanelRows(manifest), null, 2),
    ENDPOINT_MAP_JSON: JSON.stringify(endpointMap(manifest), null, 2),
    RUST_MCP_TOOLS: manifest.mcpTools
      .map((tool) => `    AppTool { name: "${tool.name}", endpoint_id: "${tool.endpointId}", status: "${tool.status}" },`)
      .join('\n'),
    INTENT_CONTRACT_MARKDOWN: markdownList(
      manifest.intentPaths.map((intent) => `\`${intent.id}\` - ${intent.intent}: ${intent.description}`),
    ),
    ENDPOINT_CONTRACT_MARKDOWN: markdownList(
      manifest.backendEndpoints.map(
        (endpoint) => `\`${endpoint.method} ${endpoint.path}\` (${endpoint.status}) - ${endpoint.purpose}`,
      ),
    ),
    MCP_TOOLS_MARKDOWN: markdownList(
      manifest.mcpTools.map((tool) => `\`${tool.name}\` -> \`${tool.endpointId}\` (${tool.status})`),
    ),
    VERIFICATION_COMMANDS_MARKDOWN: markdownList(manifest.noMockEvidence.verificationCommands.map((command) => `\`${command}\``)),
  };

  await writeRendered(
    join(resolvedOutDir, 'src', `${componentName}.tsx`),
    render(await readTemplate('src/AppPanel.tsx.template'), replacements),
  );
  await writeRendered(
    join(resolvedOutDir, 'server', `${manifest.appId}ProxyServe.ts`),
    render(await readTemplate('server/appProxyServe.ts.template'), replacements),
  );
  await writeRendered(
    join(resolvedOutDir, 'contracts', 'backend-contract.md'),
    render(await readTemplate('contracts/backend-contract.md.template'), replacements),
  );
  await writeRendered(
    join(resolvedOutDir, 'rust-mcp-server', 'Cargo.toml'),
    render(await readTemplate('rust-mcp-server/Cargo.toml.template'), replacements),
  );
  await writeRendered(
    join(resolvedOutDir, 'rust-mcp-server', 'src', 'main.rs'),
    render(await readTemplate('rust-mcp-server/src/main.rs.template'), replacements),
  );
  await writeRendered(join(resolvedOutDir, 'app.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        status: 'generated',
        appId: manifest.appId,
        outputDir: resolvedOutDir,
        files: [
          join('src', `${componentName}.tsx`),
          join('server', `${manifest.appId}ProxyServe.ts`),
          join('contracts', 'backend-contract.md'),
          join('rust-mcp-server', 'Cargo.toml'),
          join('rust-mcp-server', 'src', 'main.rs'),
          basename(manifestPath),
        ],
        noMockPolicy: manifest.noMockEvidence.blockedPolicy,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
