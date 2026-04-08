/**
 * Single, frozen callback from workspace canvas provider → app (e.g. TTS).
 * Do not add app hooks, routing, or non-denial concerns here.
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type PolicyDeniedPayload = {
  type: 'policy_denied';
  reason: string;
  spokenMessage?: string;
  eventId?: string;
};

export type PolicyDeniedHandler = (payload: PolicyDeniedPayload) => void | Promise<void>;
