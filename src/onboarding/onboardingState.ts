// ─── Onboarding State ─────────────────────────────────────────────────────────
// Persisted in localStorage. All writes are synchronous and idempotent.

const LS_PROFILE_KEY = 'aios_onboarding_profile';
const LS_COMPLETE_KEY = 'aios_onboarding_complete';
const LS_LESSON_KEY = 'aios_lesson_progress';
const LS_TASK_KEY = 'aios_task_progress';
/** Set immediately when OTP is accepted — lets the app skip the auth flow on refresh. */
const LS_OTP_VERIFIED_KEY = 'aios_otp_verified';

export interface OnboardingProfile {
  commander_name: string;
  interface_mode: 'voice' | 'chat';
  arrival_type: 'new' | 'returning';
  enrolled_at: number; // unix ms
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string;
  /** Base64 data URL of the uploaded avatar image. */
  avatar_url?: string;
}

// ── Profile ────────────────────────────────────────────────────────────────────

export function readOnboardingProfile(): OnboardingProfile | null {
  try {
    const raw = localStorage.getItem(LS_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    return null;
  }
}

export function writeOnboardingProfile(profile: OnboardingProfile): void {
  localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));
}

// ── Completion Gate ────────────────────────────────────────────────────────────

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(LS_COMPLETE_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(LS_COMPLETE_KEY, 'true');
}

// ── OTP / Phone Verification Gate ─────────────────────────────────────────────

/** True if the user has passed phone OTP in any prior session. */
export function isOtpVerified(): boolean {
  return localStorage.getItem(LS_OTP_VERIFIED_KEY) === 'true';
}

/** Call immediately when OTP succeeds — persists across refreshes. */
export function markOtpVerified(): void {
  localStorage.setItem(LS_OTP_VERIFIED_KEY, 'true');
}

/** For dev/testing: wipe all onboarding data so the flow re-runs. */
export function resetOnboarding(): void {
  localStorage.removeItem(LS_PROFILE_KEY);
  localStorage.removeItem(LS_COMPLETE_KEY);
  localStorage.removeItem(LS_OTP_VERIFIED_KEY);
  localStorage.removeItem(LS_LESSON_KEY);
  localStorage.removeItem(LS_TASK_KEY);
}

// ── Lesson Progress ────────────────────────────────────────────────────────────

function readLessonProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_LESSON_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function isLessonComplete(lessonId: string): boolean {
  return readLessonProgress()[lessonId] === true;
}

export function markLessonComplete(lessonId: string): void {
  const progress = readLessonProgress();
  progress[lessonId] = true;
  localStorage.setItem(LS_LESSON_KEY, JSON.stringify(progress));
}

// ── Onboarding Task Progress ───────────────────────────────────────────────────

function readTaskProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_TASK_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function isTaskComplete(taskId: string): boolean {
  return readTaskProgress()[taskId] === true;
}

export function markTaskComplete(taskId: string): void {
  const progress = readTaskProgress();
  progress[taskId] = true;
  localStorage.setItem(LS_TASK_KEY, JSON.stringify(progress));
}

export function getAllTaskProgress(): Record<string, boolean> {
  return readTaskProgress();
}

export function getAllLessonProgress(): Record<string, boolean> {
  return readLessonProgress();
}
