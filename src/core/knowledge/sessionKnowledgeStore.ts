/**
 * sessionKnowledgeStore — Session-scoped declared knowledge context inputs.
 *
 * Implements the 'operator_upload' source_class from the governed vocabulary
 * established in AMD-2026-015-ADD-001 (Governed Knowledge Artifact Registry and
 * Declared-Input Bridge).
 *
 * This is a RUNTIME SESSION-SCOPED declared context input, not a new governed
 * artifact store. The source_class 'operator_upload' follows governed vocabulary.
 *
 * Storage: localStorage key 'aios_session_knowledge_inputs'
 * Max per input: 50,000 characters of extracted text
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Aligned to AMD-2026-015-ADD-001 declared input vocabulary. */
export type SessionKnowledgeInput = {
  id: string;
  /** Human-readable name of the document. */
  declared_name: string;
  /** AMD-2026-015-ADD-001 source_class — operator_upload for user-uploaded files. */
  source_class: 'operator_upload';
  /** One-sentence classification summary (Gemini-generated or filename fallback). */
  content_summary: string;
  /** Detected file type. */
  content_type: 'text' | 'pdf' | 'markdown' | 'other';
  /** Extracted text, max 50,000 characters. */
  raw_text: string;
  /** ISO timestamp when the input was declared. */
  declared_at: string;
};

const LS_KEY = 'aios_session_knowledge_inputs';
const MAX_TEXT_CHARS = 50_000;

function load(): SessionKnowledgeInput[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionKnowledgeInput[];
  } catch {
    return [];
  }
}

function save(inputs: SessionKnowledgeInput[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(inputs));
  } catch {
    /* ignore quota errors */
  }
}

function mergeInputs(
  localInputs: SessionKnowledgeInput[],
  remoteInputs: SessionKnowledgeInput[],
): SessionKnowledgeInput[] {
  const merged = new Map<string, SessionKnowledgeInput>();
  for (const input of localInputs) {
    merged.set(input.id, input);
  }
  for (const input of remoteInputs) {
    merged.set(input.id, input);
  }
  return Array.from(merged.values()).sort((a, b) => a.declared_at.localeCompare(b.declared_at));
}

export function getInputs(): SessionKnowledgeInput[] {
  return load();
}

export function addInput(input: Omit<SessionKnowledgeInput, 'id' | 'declared_at'>): SessionKnowledgeInput {
  const saved: SessionKnowledgeInput = {
    ...input,
    id: `ski_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    declared_at: new Date().toISOString(),
    raw_text: input.raw_text.slice(0, MAX_TEXT_CHARS),
  };
  save([...load(), saved]);
  return saved;
}

export function removeInput(id: string): void {
  save(load().filter((i) => i.id !== id));
}

/** Returns a formatted context block for injection into the Gemini system prompt. */
export function getContextBlock(): string {
  const inputs = load();
  if (inputs.length === 0) return '';
  const blocks = inputs.map((i) => [
    `--- KNOWLEDGE INPUT: ${i.declared_name} [${i.content_type}] ---`,
    `Summary: ${i.content_summary}`,
    `Content:\n${i.raw_text.slice(0, 8_000)}`, // per-doc limit in prompt injection
    `--- END KNOWLEDGE INPUT ---`,
  ].join('\n'));
  return [
    '=== DECLARED SESSION KNOWLEDGE INPUTS (operator_upload) ===',
    ...blocks,
    '=== END DECLARED SESSION KNOWLEDGE INPUTS ===',
  ].join('\n\n');
}

/** Detect content type from filename extension. */
export function detectContentType(filename: string): SessionKnowledgeInput['content_type'] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (['txt', 'text', 'log', 'csv', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return 'text';
  return 'other';
}

// ── Supabase Sync ──────────────────────────────────────────────────────────────

import { supabase } from '../../lib/supabaseClient';

/** Persist a knowledge input to Supabase (non-blocking). */
export async function syncInputToSupabase(input: SessionKnowledgeInput, userId: string | null, sessionId?: string | null): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('session_knowledge_inputs').upsert({
      id: input.id,
      user_id: userId ?? null,
      session_id: sessionId ?? null,
      declared_name: input.declared_name,
      source_class: input.source_class,
      content_summary: input.content_summary,
      content_type: input.content_type,
      raw_text: input.raw_text,
      declared_at: input.declared_at,
    } as never);
    if (error) console.warn('[sessionKnowledgeStore] sync failed:', error.message);
  } catch { /* offline */ }
}

/** Remove a knowledge input from Supabase. */
export async function removeInputFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('session_knowledge_inputs').delete().eq('id', id);
  } catch { /* offline */ }
}

/** Load knowledge inputs from Supabase and merge into localStorage. */
export async function loadInputsFromSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('session_knowledge_inputs')
      .select('*')
      .eq('user_id', userId)
      .order('declared_at', { ascending: true });
    if (error || !data) return;
    const inputs = data as SessionKnowledgeInput[];
    save(mergeInputs(load(), inputs));
  } catch { /* offline */ }
}
