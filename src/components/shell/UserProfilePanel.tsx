/**
 * User profile editor panel — shown inside the System Controls overlay.
 * Lets the user upload an avatar, set display name fields, username, email, phone.
 * All data persists to localStorage via onboardingState.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, UserPlus } from 'lucide-react';
import {
  readOnboardingProfile,
  writeOnboardingProfile,
  type OnboardingProfile,
} from '../../onboarding/onboardingState';
import { cn } from '../../lib/cn';
import type { PowerChromeState } from './ShellSystemControls';

type Props = {
  onBack: () => void;
  powerState: PowerChromeState;
  onSave?: (profile: OnboardingProfile) => void;
  /** Called when the user clicks "Create Account" — typically routes back to onboarding. */
  onCreateAccount?: () => void;
};

export function UserProfilePanel({ onBack, powerState, onSave, onCreateAccount }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const profile = readOnboardingProfile();
    if (!profile) return;
    setFirstName(profile.first_name ?? '');
    setLastName(profile.last_name ?? '');
    setUsername(profile.username ?? profile.commander_name ?? '');
    setPhone(profile.phone_number ?? '');
    setEmail(profile.email ?? '');
    setAvatarUrl(profile.avatar_url ?? null);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(() => {
    const existing = readOnboardingProfile();
    if (!existing) return;
    const displayName =
      [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') ||
      username.trim() ||
      existing.commander_name;
    const updated: OnboardingProfile = {
      ...existing,
      first_name: firstName.trim() || undefined,
      last_name: lastName.trim() || undefined,
      username: username.trim() || undefined,
      phone_number: phone.trim() || undefined,
      email: email.trim() || undefined,
      avatar_url: avatarUrl ?? undefined,
      commander_name: displayName,
    };
    writeOnboardingProfile(updated);
    onSave?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [firstName, lastName, username, phone, email, avatarUrl, onSave]);

  const initials =
    (firstName[0] ?? '') + (lastName[0] ?? '') ||
    (username[0] ?? '?');

  return (
    <motion.div
      key="user-profile-panel"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
          aria-label="Back to system controls"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
          User Profile
        </h3>
      </div>

      {/* Not signed in — prompt to create account */}
      {powerState === 'idle' ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/20 bg-white/[0.04]">
            <UserPlus className="h-7 w-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">No account yet</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Create a free account to personalise your AI OS experience, save your profile, and unlock all features.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateAccount}
            className="flex w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-sm font-semibold text-cyan-100 transition-all hover:bg-cyan-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </button>
        </div>
      ) : (
        <>
          {/* Avatar */}
          <div className="mb-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/[0.07] transition-all hover:border-cyan-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/70"
              aria-label="Upload profile photo"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Your profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="select-none text-xl font-bold text-zinc-300">
                  {initials.toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <p className="text-[10px] text-zinc-500">Tap to upload photo</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Fields */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <ProfileField
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="First"
              />
              <ProfileField
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Last"
              />
            </div>
            <ProfileField
              label="Screen Name"
              value={username}
              onChange={setUsername}
              placeholder="@commander"
              autoComplete="username"
            />
            <ProfileField
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
            />
            <ProfileField
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+1 555 000 0000"
              type="tel"
              autoComplete="tel"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={cn(
              'mt-5 flex w-full min-h-[2.75rem] items-center justify-center rounded-xl border text-sm font-semibold transition-all',
              saved
                ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                : 'border-cyan-400/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25',
            )}
          >
            {saved ? 'Saved!' : 'Save Profile'}
          </button>
        </>
      )}
    </motion.div>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-400/50 focus:bg-white/[0.09]"
      />
    </div>
  );
}
