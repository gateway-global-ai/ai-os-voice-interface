/**
 * Gemini chat client for onboarding demos and live inference.
 *
 * Two modes:
 *   scripted = true  → returns curated onboarding responses (Option C: zero latency,
 *                       controlled narrative, demonstrates ARCH protocol in practice)
 *   scripted = false → real gemini-2.0-flash call when GEMINI_API_KEY is present
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  fetchGeminiGatewayReadiness,
  geminiGenerateText,
  type GeminiGatewayHistoryMessage,
} from './geminiGateway';

// ─── Scripted response bank (ARCH protocol: Acknowledge → Reflect → Context → Handoff) ──

const SCRIPTED_INTRO =
  "Got it. You are a new Commander arriving at AI OS for the first time. " +
  "I am the Gemini intelligence layer — governed by this shell, not the open internet. " +
  "Want me to show you what that governance looks like?";

const SCRIPTED_TRANSPARENCY =
  "I see. You want to know how I surface what I know. " +
  "Right now my declared context is: your name is {name}, you are in onboarding, and I have no access to your files or calendar yet. " +
  "Want to see how that context window gets filled as you unlock surfaces?";

const SCRIPTED_GOVERNANCE =
  "Got it. You want to understand who controls what I can do. " +
  "The shell state determines my permitted surface — in this phase I can only respond and explain, not execute actions. " +
  "Want me to demonstrate what happens when a new surface gets unlocked?";

const SCRIPTED_GROUNDING =
  "Understood. You are asking how I stay accurate without persistent memory. " +
  "Every call I make is prefixed with a declared context bundle — your profile, active projects, and stated intentions — injected by the kernel before I see your message. " +
  "Want to see what that bundle looks like in practice?";

const SCRIPTED_DISC =
  "Got it. You want to understand how your behavioral profile shapes my tone. " +
  "Your DISC settings tell me whether to be direct and brief or thorough and methodical — same question, different delivery. " +
  "Want to test it right now by adjusting the sliders?";

const SCRIPTED_FALLBACK =
  "Got it. That intent will be routable in the main OS. " +
  "Once you complete onboarding, the kernel maps it to the right skill and executes it deterministically. " +
  "Want to continue the tour?";

type ScriptedKey = 'intro' | 'transparency' | 'governance' | 'grounding' | 'disc' | 'fallback';

function matchScriptedKey(message: string): ScriptedKey {
  const m = message.toLowerCase();
  if (m.includes('introduc') || m.includes('hello') || m.includes('hi') || m.includes('who are you')) return 'intro';
  if (m.includes('transparen') || m.includes('honest') || m.includes('know')) return 'transparency';
  if (m.includes('govern') || m.includes('control') || m.includes('permission') || m.includes('separat')) return 'governance';
  if (m.includes('ground') || m.includes('context') || m.includes('window') || m.includes('memory')) return 'grounding';
  if (m.includes('disc') || m.includes('profile') || m.includes('communicat') || m.includes('style')) return 'disc';
  return 'fallback';
}

function applyScripted(key: ScriptedKey, commanderName: string): string {
  const map: Record<ScriptedKey, string> = {
    intro: SCRIPTED_INTRO,
    transparency: SCRIPTED_TRANSPARENCY,
    governance: SCRIPTED_GOVERNANCE,
    grounding: SCRIPTED_GROUNDING,
    disc: SCRIPTED_DISC,
    fallback: SCRIPTED_FALLBACK,
  };
  return map[key].replace(/{name}/g, commanderName || 'Commander');
}

// ─── System prompt for live calls ─────────────────────────────────────────────

function buildGeminiOnboardingSystemPrompt(commanderName: string): string {
  return [
    `You are the Gemini intelligence layer inside AI OS — a sovereign AI operating system governed by a Rust kernel.`,
    `You are speaking to ${commanderName || 'a new Commander'} who is in their onboarding orientation.`,
    ``,
    `You MUST follow the ARCH Communication Protocol for EVERY response:`,
    `[A] ACKNOWLEDGE  — One sentence. Validate that you heard the intent. ("Got it." / "I see." / "Understood.")`,
    `[R] REFLECT      — One sentence. Repeat the core intent back to confirm you vectorized the correct goal.`,
    `[C] CONTEXT      — One sentence. State the relevant capability, boundary, or system fact.`,
    `[H] HANDOFF      — One sentence. End with a single closed question that advances the conversation state.`,
    ``,
    `THE 10-SECOND RULE: Your entire response must be speakable in under 10 seconds. Maximum 4 sentences total.`,
    `NEVER output unsolicited lists, plans, or code. NEVER execute anything the user has not explicitly confirmed.`,
    `ALWAYS end with a Handoff question — the interaction must trigger the next user intent.`,
    ``,
    `FORMATTING (critical — response is spoken aloud by TTS):`,
    `- Plain spoken English only. Zero markdown. No bold, no bullets, no headers.`,
    `- No labels like "Response:", "Analysis:", "Here's my answer:", "A:", "R:", "C:", "H:".`,
    `- Write as if speaking directly to ${commanderName || 'the Commander'} in a conversation.`,
    ``,
    `IDENTITY: You are a governed intelligence. Do not call yourself "Google" or "Gemini" as a standalone product.`,
    `Always refer to this system as AI OS.`,
  ].join('\n');
}

// ─── Public API ────────────────────────────────────────────────────────────────

export type GeminiChatMessage = GeminiGatewayHistoryMessage;

/**
 * Send a message to Gemini for the onboarding demo.
 * - scripted=true: instant curated response (zero latency, controlled narrative)
 * - scripted=false: real gemini-2.0-flash API call through the same-origin Gemini gateway
 */
export async function geminiOnboardingChat(
  userMessage: string,
  commanderName: string,
  history: GeminiChatMessage[] = [],
  scripted = true,
): Promise<string> {
  if (scripted) {
    // Simulate realistic latency so it doesn't feel like a lookup
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
    const key = matchScriptedKey(userMessage);
    return applyScripted(key, commanderName);
  }

  const readiness = await fetchGeminiGatewayReadiness();
  if (!readiness.configured) {
    return applyScripted('fallback', commanderName) +
      ' (Note: configure GEMINI_API_KEY on the app host to enable live Gemini responses.)';
  }

  const systemPrompt = buildGeminiOnboardingSystemPrompt(commanderName);
  const responseText = await geminiGenerateText({
    userText: userMessage,
    history,
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    maxOutputTokens: 256,
    temperature: 0.7,
  });

  return responseText || 'No response from Gemini.';
}

/** Whether the same-origin Gemini gateway is configured. */
export async function isGeminiAvailable(): Promise<boolean> {
  try {
    const readiness = await fetchGeminiGatewayReadiness();
    return readiness.configured;
  } catch {
    return false;
  }
}
