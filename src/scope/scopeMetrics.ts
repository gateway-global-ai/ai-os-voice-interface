/**
 * Lightweight SPEC-010 scope metrics — in-memory counters for tests and operator visibility.
 * @license SPDX-License-Identifier: Apache-2.0
 */

let scopeCheckAllowed = 0;
let scopeCheckDenied = 0;
let scopeRoutingInvalid = 0;

/** Last bounded summarize context (thread read → LLM prompt). */
let lastSummarizeThreadPayloadChars = 0;
let lastSummarizeBoundedPromptChars = 0;
let summarizeBoundedPromptTotalChars = 0;
let summarizeBoundedPromptSampleCount = 0;

export type ScopeMetricsSnapshot = {
  scopeCheckAllowed: number;
  scopeCheckDenied: number;
  scopeRoutingInvalid: number;
  lastSummarizeThreadPayloadChars: number;
  lastSummarizeBoundedPromptChars: number;
  summarizeBoundedPromptAvgChars: number;
};

export function recordScopeCheck(result: 'allowed' | 'denied' | 'routing_invalid'): void {
  if (result === 'allowed') scopeCheckAllowed += 1;
  else if (result === 'denied') scopeCheckDenied += 1;
  else scopeRoutingInvalid += 1;
}

/**
 * Call after building the bounded user prompt for thread summarize (SPEC-010 §5.2).
 * `boundedPromptChars` is the full instruction + thread payload sent to the local LLM.
 */
export function recordThreadSummarizeBoundedContext(params: {
  threadPayloadChars: number;
  boundedPromptChars: number;
}): void {
  lastSummarizeThreadPayloadChars = params.threadPayloadChars;
  lastSummarizeBoundedPromptChars = params.boundedPromptChars;
  summarizeBoundedPromptTotalChars += params.boundedPromptChars;
  summarizeBoundedPromptSampleCount += 1;
}

export function getScopeMetricsSnapshot(): ScopeMetricsSnapshot {
  const avg =
    summarizeBoundedPromptSampleCount > 0
      ? Math.round(summarizeBoundedPromptTotalChars / summarizeBoundedPromptSampleCount)
      : 0;
  return {
    scopeCheckAllowed,
    scopeCheckDenied,
    scopeRoutingInvalid,
    lastSummarizeThreadPayloadChars,
    lastSummarizeBoundedPromptChars,
    summarizeBoundedPromptAvgChars: avg,
  };
}

/** Test hook — resets all counters. */
export function resetScopeMetricsForTests(): void {
  scopeCheckAllowed = 0;
  scopeCheckDenied = 0;
  scopeRoutingInvalid = 0;
  lastSummarizeThreadPayloadChars = 0;
  lastSummarizeBoundedPromptChars = 0;
  summarizeBoundedPromptTotalChars = 0;
  summarizeBoundedPromptSampleCount = 0;
}
