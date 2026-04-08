/**
 * Lexical RAG for UI review agent (BL-007) — no embeddings; chunk + word overlap.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export type TextChunk = { id: string; sourcePath: string; text: string };

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'with', 'from', 'by', 'not', 'no', 'if', 'then', 'than', 'so', 'such', 'any', 'all', 'each', 'per',
]);

export function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s.]/gi, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function scoreChunk(queryTokens: string[], chunkText: string): number {
  const lower = chunkText.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (t.length < 2) continue;
    const re = new RegExp(`\\b${escapeRe(t)}\\b`, 'gi');
    const m = lower.match(re);
    if (m) score += m.length;
  }
  return score;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function chunkMarkdown(sourcePath: string, raw: string, maxChunkChars: number): TextChunk[] {
  const parts = raw.split(/\n{2,}/);
  const chunks: TextChunk[] = [];
  let buf = '';
  let idx = 0;
  const flush = () => {
    const t = buf.trim();
    if (t.length > 0) {
      chunks.push({ id: `${sourcePath}#${idx++}`, sourcePath, text: t.slice(0, maxChunkChars) });
      buf = '';
    }
  };
  for (const p of parts) {
    if ((buf + p).length > maxChunkChars) {
      flush();
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  flush();
  return chunks;
}

export function retrieveTopK(
  query: string,
  chunks: TextChunk[],
  topK: number
): { chunk: TextChunk; score: number }[] {
  const qtok = tokenizeQuery(query);
  const scored = chunks.map((chunk) => ({
    chunk,
    score: scoreChunk(qtok, chunk.text),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, topK);
}

export type KbManifest = {
  productDirs: string[];
  productFiles: string[];
  governingRelativePaths: string[];
  maxTotalChars?: number;
  maxChunkChars?: number;
  retrieveTopK?: number;
};

export function loadManifest(repoRoot: string): KbManifest {
  const p = path.join(repoRoot, 'scripts', 'uiReviewKb.manifest.json');
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as KbManifest;
}

function walkMdFiles(dir: string, out: string[], maxFiles: number): void {
  if (!fs.existsSync(dir) || out.length >= maxFiles) return;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    if (dir.endsWith('.md')) out.push(dir);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkMdFiles(full, out, maxFiles);
    else if (e.isFile() && e.name.endsWith('.md') && out.length < maxFiles) out.push(full);
  }
}

const MAX_FILES_SCAN = 400;

export function collectChunks(
  repoRoot: string,
  manifest: KbManifest,
  govRoot: string | undefined
): TextChunk[] {
  const maxChunk = manifest.maxChunkChars ?? 2800;
  const maxTotal = manifest.maxTotalChars ?? 450_000;
  const chunks: TextChunk[] = [];
  let total = 0;

  const pushFile = (abs: string, relLabel: string) => {
    if (!fs.existsSync(abs)) return;
    const raw = fs.readFileSync(abs, 'utf-8');
    if (abs.endsWith('.json')) {
      const text = raw.slice(0, maxChunk);
      if (total + text.length > maxTotal) return;
      chunks.push({ id: `${relLabel}#0`, sourcePath: relLabel, text });
      total += text.length;
      return;
    }
    const sub = chunkMarkdown(relLabel, raw, maxChunk);
    for (const c of sub) {
      if (total + c.text.length > maxTotal) return;
      chunks.push(c);
      total += c.text.length;
    }
  };

  for (const f of manifest.productFiles) {
    pushFile(path.join(repoRoot, f), f);
  }

  for (const d of manifest.productDirs) {
    const absDir = path.join(repoRoot, d);
    const mdList: string[] = [];
    walkMdFiles(absDir, mdList, MAX_FILES_SCAN);
    for (const abs of mdList) {
      const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
      pushFile(abs, rel);
      if (total >= maxTotal) break;
    }
    if (total >= maxTotal) break;
  }

  if (govRoot && fs.existsSync(govRoot)) {
    for (const rel of manifest.governingRelativePaths) {
      const abs = path.join(govRoot, rel.replace(/\//g, path.sep));
      pushFile(abs, `[gov] ${rel}`);
      if (total >= maxTotal) break;
    }
  }

  return chunks;
}
