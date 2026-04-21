/**
 * Curated copy for the Vibe Coding University landing — avoids the formal
 * Governor pipeline hallucinating about on-screen UI.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { VibeTopicId } from '../components/shell/ShellVoiceIdlePanel';

export const VIBE_TOPIC_SCRIPTED_RESPONSES: Record<VibeTopicId, string> = {
  university:
    'Vibe Coding University is our learn-by-building path: short guided projects, real tools, and peers who care about craft with A I. Nothing here is graded like a corporate compliance course — it is meant to feel like a studio you can grow in.',
  community:
    'The Vibe Code Community is the people layer: office hours, build demos, and channels where you can ask dumb questions without shame. We use a quick phone verify when you join so we keep bots out and conversations human.',
  coding_platform:
    'The Vibe Coding Platform is the workspace you are looking at: voice-first, a clear shell, and room to wire your own stack over time. If you tap skip intro, we will walk you through creating an account with a simple text code to your phone.',
};

export function vibeTopicUserPromptLine(topic: VibeTopicId): string {
  const labels: Record<VibeTopicId, string> = {
    university: 'University',
    community: 'Community',
    coding_platform: 'Coding Platform',
  };
  return `Tell me about ${labels[topic]}.`;
}
