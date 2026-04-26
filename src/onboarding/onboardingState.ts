// ─── Onboarding State ─────────────────────────────────────────────────────────
// Primary persistence: localStorage (synchronous, always available).
// Secondary persistence: Supabase `users` table (async, requires userId from OTP).
// Call syncProfileToSupabase(userId, profile) after OTP succeeds.

import { supabase } from '../lib/supabaseClient';

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

function pickPreferredString(localValue: string | undefined, remoteValue: string | undefined): string | undefined {
  const local = localValue?.trim();
  if (local) return local;
  const remote = remoteValue?.trim();
  return remote || undefined;
}

/**
 * Conflict policy:
 * - local onboarding state is authoritative for fields the current browser session already knows
 * - remote fills gaps for returning users and cross-device recovery
 */
export function mergeOnboardingProfile(
  localProfile: OnboardingProfile | null,
  remoteProfile: OnboardingProfile,
): OnboardingProfile {
  if (!localProfile) return remoteProfile;
  return {
    commander_name: pickPreferredString(localProfile.commander_name, remoteProfile.commander_name) ?? 'Operator',
    interface_mode: localProfile.interface_mode ?? remoteProfile.interface_mode,
    arrival_type: localProfile.arrival_type ?? remoteProfile.arrival_type,
    enrolled_at: localProfile.enrolled_at ?? remoteProfile.enrolled_at,
    phone_number: pickPreferredString(localProfile.phone_number, remoteProfile.phone_number),
    first_name: pickPreferredString(localProfile.first_name, remoteProfile.first_name),
    last_name: pickPreferredString(localProfile.last_name, remoteProfile.last_name),
    email: pickPreferredString(localProfile.email, remoteProfile.email),
    username: pickPreferredString(localProfile.username, remoteProfile.username),
    avatar_url: pickPreferredString(localProfile.avatar_url, remoteProfile.avatar_url),
  };
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

// ── Supabase Sync ──────────────────────────────────────────────────────────────
// Call after OTP verification. Upserts the local profile into the `users` table
// using the phone number as the unique identifier. Also syncs shell_preferences.

export async function syncProfileToSupabase(phone: string, profile: OnboardingProfile): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          phone,
          display_name: profile.commander_name,
          first_name: profile.first_name ?? null,
          last_name: profile.last_name ?? null,
          email: profile.email ?? null,
          username: profile.username ?? null,
          avatar_url: profile.avatar_url ?? null,
          interface_mode: profile.interface_mode,
        } as never,
        { onConflict: 'phone' },
      )
      .select('id')
      .single();
    if (error) {
      console.warn('[onboardingState] syncProfileToSupabase failed:', error.message);
      return null;
    }
    const userId = (data as { id: string }).id;
    try { localStorage.setItem('aios_supabase_user_id', userId); } catch { /* ignore */ }
    return userId;
  } catch {
    return null;
  }
}

/** Returns the Supabase user ID if available (set after OTP + sync). */
export function getSupabaseUserId(): string | null {
  try { return localStorage.getItem('aios_supabase_user_id'); } catch { return null; }
}

/** Fetch profile from Supabase and merge into localStorage. */
export async function loadProfileFromSupabase(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    const remoteProfile: OnboardingProfile = {
      commander_name: (row.display_name as string | null) ?? '',
      interface_mode: (row.interface_mode as 'voice' | 'chat') ?? 'voice',
      arrival_type: 'returning',
      enrolled_at: Date.now(),
      phone_number: (row.phone as string | null) ?? undefined,
      first_name: (row.first_name as string | null) ?? undefined,
      last_name: (row.last_name as string | null) ?? undefined,
      email: (row.email as string | null) ?? undefined,
      username: (row.username as string | null) ?? undefined,
      avatar_url: (row.avatar_url as string | null) ?? undefined,
    };
    writeOnboardingProfile(mergeOnboardingProfile(readOnboardingProfile(), remoteProfile));
  } catch { /* ignore */ }
}
