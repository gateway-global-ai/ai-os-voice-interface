/**
 * BL-007 — UI review agent: lexical RAG + Ollama (non-streaming).
 * Requires Ollama reachable at OLLAMA_BASE_URL / VITE_OLLAMA_BASE_URL (default http://127.0.0.1:11434).
 * Optional: AIOS_GOV_DOCS_ROOT = path to aios-governing-docs repo clone for law excerpts.
 *
 * Usage:
 *   npx tsx scripts/uiReviewAgent.ts --surface "primary shell" --journey "open workspace hub"
 *   npx tsx scripts/uiReviewAgent.ts --dry-run --surface "workspace hub" --journey "mail read"
 *   UI_REVIEW_MODEL=mistral npx tsx scripts/uiReviewAgent.ts --out docs/conformance/artifacts/ui-review-last.md ...
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ollamaChatNonStreaming } from '../src/local-llm/ollamaChat.ts';
import {
  collectChunks,
  loadManifest,
  retrieveTopK,
  type KbManifest,
} from './uiReviewRag.ts';

function envRecord(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function parseArgs(argv: string[]) {
  let surface = '';
  let journey = '';
  let intent = '';
  let dryRun = false;
  let outPath = '';
  let model = process.env.UI_REVIEW_MODEL ?? 'llama3.2';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--surface') surface = argv[++i] ?? '';
    else if (a === '--journey') journey = argv[++i] ?? '';
    else if (a === '--intent') intent = argv[++i] ?? '';
    else if (a === '--dry-run') dryRun = true;
    else if (a === '--out') outPath = argv[++i] ?? '';
    else if (a === '--model') model = argv[++i] ?? model;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: tsx scripts/uiReviewAgent.ts --surface "..." --journey "..." [--intent "..."] [--dry-run] [--out path.md] [--model name]`);
      process.exit(0);
    }
  }
  return { surface, journey, intent, dryRun, outPath, model };
}

function buildQuery(surface: string, journey: string, intent: string): string {
  return [
    `surface: ${surface}`,
    `journey: ${journey}`,
    intent ? `intent: ${intent}` : '',
    'AI OS shell authority AMD-2026-012 SPEC-009 disclosure workspace integration routing',
  ]
    .filter(Boolean)
    .join('. ');
}

function buildSystemPrompt(): string {
  return [
    'You are an AI OS interface conformance reviewer.',
    'Use ONLY the retrieved context excerpts below plus established AMD-2026-012 / AIOS-SPEC-009 obligations you already know; if a claim is not supported by retrieved context, say "insufficient context".',
    'Grade pass | pass_with_findings | fail for alignment with: shell-first entry, voice-first posture, SPEC-009 §12.2-style disclosure honesty, workspace subordination, intent routing traceability.',
    'Respond with:',
    '1) A short executive summary (≤ 200 words).',
    '2) A JSON object in a fenced block ```json ... ``` with keys: grade (string), findings (array of { severity, text, citation? }), citations (array of source paths or doc IDs).',
    '3) Optional mermaid suggestion for user flow (fenced ```mermaid).',
  ].join('\n');
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const { surface, journey, intent, dryRun, outPath, model } = parseArgs(process.argv.slice(2));
  if (!surface.trim() || !journey.trim()) {
    console.error('Error: --surface and --journey are required (or --help).');
    process.exit(1);
  }

  const manifest: KbManifest = loadManifest(repoRoot);
  const govRoot = process.env.AIOS_GOV_DOCS_ROOT?.trim() || undefined;
  const chunks = collectChunks(repoRoot, manifest, govRoot);
  const query = buildQuery(surface, journey, intent);
  const topK = manifest.retrieveTopK ?? 12;
  const retrieved = retrieveTopK(query, chunks, topK);
  const contextBlock = retrieved
    .map((r, i) => `--- chunk ${i + 1} (score=${r.score}) source=${r.chunk.sourcePath} ---\n${r.chunk.text}`)
    .join('\n\n');

  if (dryRun) {
    console.log('--- UI Review Agent (dry run) ---');
    console.log('query:', query);
    console.log('chunks loaded:', chunks.length);
    console.log('retrieved:', retrieved.length);
    console.log('context chars:', contextBlock.length);
    console.log('model:', model);
    console.log('gov root:', govRoot ?? '(not set — set AIOS_GOV_DOCS_ROOT for governing excerpts)');
    process.exit(0);
  }

  const env = envRecord();
  const userContent = [
    `Review request:\n${query}\n`,
    'Retrieved knowledge base excerpts:\n',
    contextBlock,
  ].join('\n');

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: userContent },
  ];

  const result = await ollamaChatNonStreaming(env, { model, messages });
  if (result.ok === false) {
    console.error('Ollama error:', result.error);
    console.error('Tip: use --dry-run without Ollama, or start Ollama and pull the model.');
    process.exit(1);
  }

  const report = [
    '# UI review agent report (BL-007)',
    '',
    `**Surface:** ${surface}`,
    `**Journey:** ${journey}`,
    intent ? `**Intent:** ${intent}` : '',
    `**Model:** ${model}`,
    `**Retrieved chunks:** ${retrieved.length} (of ${chunks.length} loaded)`,
    '',
    '---',
    '',
    result.content,
    '',
  ]
    .filter(Boolean)
    .join('\n');

  if (outPath) {
    const abs = path.isAbsolute(outPath) ? outPath : path.join(repoRoot, outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, report, 'utf-8');
    console.log('Wrote', abs);
  } else {
    process.stdout.write(report);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
