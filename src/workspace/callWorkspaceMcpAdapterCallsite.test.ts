/**
 * Negative proof (AIOS-SPEC-007 §2 item 1): `callWorkspaceMcpAdapter` is the MCP tools/call entry;
 * it MUST NOT be invoked from feature code outside `runWorkspaceControlPlane`.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = join(__dirname, '..');

/** Only these paths under `src/` may contain the substring `callWorkspaceMcpAdapter`. */
const ALLOWED_REL = new Set([
  'workspace/mcpAdapter.ts',
  'workspace/integrationControlPlane.ts',
  'workspace/index.ts',
  'workspace/callWorkspaceMcpAdapterCallsite.test.ts',
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) {
      acc.push(p);
    }
  }
  return acc;
}

describe('callWorkspaceMcpAdapter callsite guard', () => {
  it('only allowlisted src files reference callWorkspaceMcpAdapter (bypass blocked or absent)', () => {
    const files = walk(srcRoot);
    const offenders: string[] = [];
    for (const abs of files) {
      const rel = relative(srcRoot, abs).replace(/\\/g, '/');
      const text = readFileSync(abs, 'utf8');
      if (!text.includes('callWorkspaceMcpAdapter')) continue;
      if (!ALLOWED_REL.has(rel)) offenders.push(rel);
    }
    assert.deepEqual(
      offenders,
      [],
      `Expected callWorkspaceMcpAdapter only in ${[...ALLOWED_REL].join(', ')}; also found: ${offenders.join(', ') || '(none)'}`
    );
  });
});
