/**
 * Recorded welcome for the vibe landing — HTMLAudioElement with play / pause / resume.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

let active: HTMLAudioElement | null = null;

export function landingStartWelcomeAudioSrc(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/audio/landing-welcome.wav`;
}

function wireNaturalEnd(onNaturalEnded?: () => void): void {
  if (!active || !onNaturalEnded) return;
  const el = active;
  el.addEventListener(
    'ended',
    function onEnd() {
      el.removeEventListener('ended', onEnd);
      onNaturalEnded();
    },
    { once: true },
  );
}

/** Hard stop: release element (used when shell TTS takes over). */
export function stopLandingStartWelcome(): void {
  if (!active) return;
  try {
    active.pause();
    active.removeAttribute('src');
    active.load();
  } catch {
    /* already torn down */
  }
  active = null;
}

/** Pause without destroying so the user can resume. */
export function pauseLandingWelcomeSoft(): void {
  if (!active) return;
  try {
    void active.pause();
  } catch {
    /* ignore */
  }
}

export function resumeLandingWelcome(): Promise<void> {
  if (!active) {
    return Promise.reject(new Error('Landing welcome audio is not loaded'));
  }
  return active.play();
}

export type LandingWelcomePlayback = 'idle' | 'playing' | 'paused';

export function getLandingWelcomePlayback(): LandingWelcomePlayback {
  if (!active) return 'idle';
  if (active.ended) return 'idle';
  return active.paused ? 'paused' : 'playing';
}

/**
 * Start from the beginning. Promise settles when playback **starts** (not when it ends).
 */
export function startLandingWelcomeFromBeginning(
  src = landingStartWelcomeAudioSrc(),
  onNaturalEnded?: () => void,
): Promise<void> {
  stopLandingStartWelcome();
  const audio = new Audio(src);
  audio.preload = 'auto';
  active = audio;
  wireNaturalEnd(onNaturalEnded);
  return audio.play().catch((e) => {
    stopLandingStartWelcome();
    throw e instanceof Error ? e : new Error(String(e));
  });
}

/** @deprecated Prefer {@link startLandingWelcomeFromBeginning} or {@link toggleLandingWelcomePlayback}. */
export function playLandingStartWelcome(src = landingStartWelcomeAudioSrc()): Promise<void> {
  return startLandingWelcomeFromBeginning(src);
}

/**
 * If idle: start playing. If playing: pause. If paused: resume.
 */
export async function toggleLandingWelcomePlayback(
  src = landingStartWelcomeAudioSrc(),
  onNaturalEnded?: () => void,
): Promise<LandingWelcomePlayback> {
  const state = getLandingWelcomePlayback();
  if (state === 'idle') {
    await startLandingWelcomeFromBeginning(src, onNaturalEnded);
    return getLandingWelcomePlayback();
  }
  if (state === 'playing') {
    pauseLandingWelcomeSoft();
    return 'paused';
  }
  wireNaturalEnd(onNaturalEnded);
  await resumeLandingWelcome();
  return getLandingWelcomePlayback();
}
