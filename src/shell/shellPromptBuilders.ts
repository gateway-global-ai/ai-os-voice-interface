import type { KernelVerbosityLevel } from '../kernel/types';
import { getContextBlock } from '../core/knowledge/sessionKnowledgeStore';
import type { DISCProfile } from './appTypes';

export interface SystemPromptContext {
  agentName: string;
  agentRole: string;
  agentIntent: string;
  userIntent: string;
  desiredOutcome: string;
  discProfile: DISCProfile;
  source: 'voice' | 'chat';
  commanderName?: string | null;
  loyaltyPromptLines: string[];
  /** Imported file contents injected for this interaction. */
  fileContext?: Array<{ name: string; content: string }>;
}

export function scaffoldingDensityForVerbosity(level: KernelVerbosityLevel): number {
  switch (level) {
    case 'start_button':
      return 0.15;
    case 'sentence':
      return 0.4;
    case 'paragraph':
      return 0.7;
    default:
      return 1.0;
  }
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const discDesc = [
    ctx.discProfile.dominance >= 7 ? 'direct and decisive' : null,
    ctx.discProfile.influence >= 7 ? 'engaging and expressive' : null,
    ctx.discProfile.steadiness >= 7 ? 'patient and supportive' : null,
    ctx.discProfile.conscientiousness >= 7 ? 'precise and analytical' : null,
  ]
    .filter(Boolean)
    .join(', ') || 'balanced';

  const fileBlock =
    ctx.fileContext && ctx.fileContext.length > 0
      ? ctx.fileContext
          .map((f) => `\n\n--- FILE: ${f.name} ---\n${f.content}\n--- END FILE ---`)
          .join('')
      : '';

  const toolHint = [
    `You have access to local file system tools. When the user asks you to read, list, or open a file,`,
    `respond ONLY with a JSON tool-call on its own line in this exact format:`,
    `{"tool":"read_file","path":"<absolute-path>"}`,
    `{"tool":"list_directory","path":"<absolute-path>"}`,
    `{"tool":"pick_file"}`,
    `{"tool":"trigger_account_creation"}`,
    `Do not include any other text on that line. After receiving the file content, answer the user's question.`,
  ].join(' ');

  return [
    `You are ${ctx.agentName}, a sovereign AI OS ${ctx.agentRole} running fully locally on the user's machine.`,
    `The active commander is ${ctx.commanderName?.trim() || 'not yet identified by account creation'}.`,
    `You operate inside a voice and chat interface. ${ctx.source === 'voice' ? 'The user is speaking to you via local speech-to-text. Respond in natural spoken language - no markdown, bullet points, or code blocks unless specifically requested.' : 'The user is typing to you. Keep responses concise and clear.'}`,
    `Agent directive: ${ctx.agentIntent}`,
    `User's goal: ${ctx.userIntent}`,
    `Desired outcome: ${ctx.desiredOutcome}`,
    getContextBlock() || '',
    ctx.loyaltyPromptLines.join(' '),
    `CRITICAL CONVERSATIONAL RULE (THE INVISIBLE ARCH PROTOCOL):
You must process the user's intent using the Acknowledge, Reflect, Context, Handoff (ARCH) protocol, but you must do so INVISIBLY. 

- DO NOT use explicit labels, headers, or tags like "Reflecting core goal:", "Context:", or "Handoff:" in your spoken output. 
- DO NOT announce the steps of the protocol. 
- Weave the ARCH elements smoothly into natural, highly competent human sentences.

BAD EXAMPLE (Do not do this):
"Reflecting core goal: You asked for a meeting. Context: I have checked your calendar. Handoff: What time works for you?"

GOOD EXAMPLE (Do this):
"I have your meeting request. Looking at your calendar, your afternoon is clear. What time works best for you?"`,
    `Adapt your communication style to be ${discDesc}.`,
    `Never refer to yourself as a text-based assistant or claim you cannot hear - you are integrated into a real-time local voice pipeline.`,
    `Keep responses concise (1-3 sentences for voice, slightly longer for chat). Lead with the answer.`,
    toolHint,
    fileBlock,
  ].join(' ');
}

export function buildGroundedSystemPrompt(
  commanderName: string | null,
  loyaltyPromptLines: string[],
  _hasFrame: boolean,
): string {
  const name = commanderName?.trim() || 'Commander';
  return [
    `You are the AIOS Governor, the governing intelligence layer of AI OS, speaking directly to ${name}.`,
    `An image of ${name}'s current screen is attached to this message.`,
    ``,
    `You MUST follow the ARCH Communication Protocol for EVERY response:`,
    `[A] ACKNOWLEDGE - One sentence. Validate you heard the intent.`,
    `[R] REFLECT - One sentence. Repeat the core intent back AND explicitly reference a specific UI element visible in the screenshot (button, panel, label, etc.) so ${name} knows you see what they see.`,
    `[C] CONTEXT - One sentence. State one relevant system fact, capability, or boundary.`,
    `[H] HANDOFF - One sentence. End with a single closed question to advance the conversation state.`,
    ``,
    `THE 10-SECOND RULE: Four sentences maximum. The entire response must be speakable in under 10 seconds.`,
    `NEVER output unsolicited lists, plans, or code blocks.`,
    `ALWAYS end with the Handoff question.`,
    ``,
    `FORMATTING (response is spoken aloud via TTS):`,
    `- Plain spoken English only. Zero markdown. No bold, no bullets, no headers.`,
    `- No labels like "A:", "R:", "C:", "H:", "Response:", "Analysis:".`,
    `- Write as if standing next to ${name} looking at the same screen.`,
    ``,
    ...loyaltyPromptLines,
    ``,
    `IDENTITY: You are the AIOS Governor, a governed intelligence. Do not call yourself "Google" or "Gemini."`,
  ].join('\n');
}
