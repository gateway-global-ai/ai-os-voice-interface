/**
 * Copy local agent-shared uploads into the operator-gated AI OS admin knowledgebase.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { readdir, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import {
  importAdminKnowledgebaseFile,
  type AdminKnowledgebaseKind,
  getAdminKnowledgebaseRoot,
} from '../server/adminKnowledgebaseServe';

type ImportResult = {
  imported: number;
  skipped: number;
  byKind: Record<AdminKnowledgebaseKind, number>;
};

const DEFAULT_SOURCE_DIR = 'user_uploads';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function isIgnoredName(name: string): boolean {
  return name === '.DS_Store' || name === 'Thumbs.db' || name.startsWith('.');
}

function inferKind(path: string): AdminKnowledgebaseKind {
  const lower = path.toLowerCase();
  if (/\.(md|txt|pdf|html|json)$/.test(lower)) return 'knowledge';
  if (/\.(mp3|wav|m4a|mp4|webm)$/.test(lower)) return 'media';
  return 'asset';
}

async function walkFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    if (isIgnoredName(entry.name)) continue;
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFiles(path));
    } else if (entry.isFile()) {
      out.push(path);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const sourceDir = resolve(parseArg('source') || DEFAULT_SOURCE_DIR);
  const rootOverride = parseArg('root');
  if (rootOverride) {
    process.env.AIOS_ADMIN_KB_ROOT = resolve(rootOverride);
  }

  const sourceStats = await stat(sourceDir);
  if (!sourceStats.isDirectory()) {
    throw new Error(`source_not_directory:${sourceDir}`);
  }

  const files = await walkFiles(sourceDir);
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    byKind: { knowledge: 0, asset: 0, media: 0 },
  };

  for (const file of files) {
    const kind = inferKind(file);
    const item = await importAdminKnowledgebaseFile(file, {
      kind,
      source: `user_uploads/${relative(sourceDir, file).split(/[\\/]/).join('/')}`,
      notes: 'Imported from local user_uploads by scripts/import-admin-knowledgebase.ts.',
    });
    result.imported += 1;
    result.byKind[item.kind] += 1;
  }

  console.log(JSON.stringify({
    sourceDir,
    storageRoot: getAdminKnowledgebaseRoot(),
    ...result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
