/**
 * Policy: which resolved workspace intents require local interpretation (Ollama / local LLM).
 * **AIOS-SPEC-009 §12.2** + product POL-MODEL-* — **core** (AIOS-ADR-001).
 *
 * Extend this set when a new intent uses `local.llm.*` or equivalent.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

/** Intents that require local model readiness for primary disclosure when active. */
export const LOCAL_INTERPRETATION_REQUIRED_INTENTS = new Set<string>([
  /** MCP thread read + local LLM summarize (see `threadSummarize.ts`, MailMessageActionsPanel). */
  'workspace.mail.thread.summarize',
]);

/**
 * Whether the **resolved** workspace intent requires local interpretation for SPEC-009 §12.2-style
 * capability disclosure. Call with intent from {@link deriveWorkspaceIntentForDisclosure} or agent resolution.
 */
export function resolvedIntentRequiresLocalModel(intentId: string | null | undefined): boolean {
  if (!intentId) return false;
  return LOCAL_INTERPRETATION_REQUIRED_INTENTS.has(intentId);
}
