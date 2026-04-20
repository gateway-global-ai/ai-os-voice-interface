# AIOS Shell Audio Control Surface

## Purpose

This note explains the runtime shell behavior behind the disclosure/player bar and the first-run loyalty intro. It is product-facing guidance for operators and implementers; governed authority lives in the AIOS standards repo.

## Runtime model

The shell audio path still follows a single dispatch point in `src/App.tsx`, but playback is no longer treated as an invisible side effect.

- `speakText()` is the canonical shell entry point for spoken output.
- The shell keeps a bounded cue model: one current cue plus pending queued cues.
- `ShellIdentityBar` is the visible operator control surface for that model.
- The bar exposes play/stop, mic enable, speaker enable, and a cue drawer with queued items plus voice-route switching.

## Onboarding stability rule

The loyalty intro remains visually mounted while onboarding narration is active. Narrated slides must not disappear just because the global shell voice state becomes `speaking`.

Operationally, this means:

- intro narration is routed through the same shell audio controller as other spoken events,
- skipping to the next slide stops the active narration immediately, and
- onboarding visibility is gated separately from generic conversational playback.

## Current implementation surfaces

- `src/App.tsx`
- `src/components/shell/ShellIdentityBar.tsx`
- `src/components/shell/LoyaltyIntroSequence.tsx`
- `src/core/io/GeminiVoiceEngine.ts`

## Operator expectation

When speaker output is muted, spoken shell events may queue instead of playing immediately. The operator can inspect that state from the disclosure/player bar and decide when to replay the queued content.
