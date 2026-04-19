import { useEffect, useRef, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Home,
  Mic,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import {
  writeOnboardingProfile,
  markOnboardingComplete,
  markOtpVerified,
  isOtpVerified,
  readOnboardingProfile,
  resetOnboarding,
  type OnboardingProfile,
} from './onboardingState';
import { ScreenDemoLibrary } from './ScreenDemoLibrary';
import { ScreenPlanetOverview } from './ScreenPlanetOverview';
import { ScreenModelArena } from './ScreenModelArena';
import { ScreenIntentDemo } from './ScreenIntentDemo';
import { Screen3PIntro } from './Screen3PIntro';
import { ScreenInvite } from './ScreenInvite';
import {
  buildCheckMeVerificationUrl,
  CHECKME_EXTERNAL_OTP_MARKER,
  getCheckMeVerificationEntryUrl,
  openCheckMeVerificationPage,
} from '../config/identityVerification';
import {
  CHECKME_SESSION_PHONE_KEY,
  CHECKME_SESSION_VERIFICATION_ID_KEY,
  formatCheckmeUserError,
  sendOtp,
  verifyOtp,
} from '../core/io/checkmeClient';
import * as VoiceboxClient from '../core/io/VoiceboxClient';
import { useKernelState } from '../kernel/useKernelState';
import { kernelPermits, type OsStateSnapshot } from '../kernel/types';
import {
  SovereignGrid,
  SovereignCard,
  SovereignTitle,
  SovereignDescription,
  SovereignButton,
  SovereignTextInput,
  SovereignRadioGroup,
} from '../ui-core';
import {
  OnboardingLayerSettingsPanel,
  loadOnboardingLayerOpacities,
  persistOnboardingLayerOpacities,
  type OnboardingLayerOpacities,
} from './OnboardingLayerSettingsPanel';
import {
  phaseFromSnapshot,
  snapshotFromMirrorPhase,
  transitionMirrorPhase,
  type MirrorPhase,
} from './onboardingKernelMirror';

/**
 * While `get_os_state` is still resolving (common on desktop Tauri), `kernelPermits` is false
 * for every component — only the background video would show. Assume **landing** until the
 * snapshot exists so the first screen always renders.
 */
function onboardingPermits(snapshot: OsStateSnapshot | null, component: string): boolean {
  if (snapshot === null) {
    return component === 'onboarding_landing';
  }
  return kernelPermits(snapshot, component);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function narrate(text: string) {
  try {
    // Ensure we have an active profile if one exists
    if (!VoiceboxClient.getActiveProfileId()) {
      try {
        const profiles = await VoiceboxClient.listProfiles();
        if (Array.isArray(profiles) && profiles.length > 0) {
          // Pick the one with the most samples, or just the first one
          const bestProfile = [...profiles].sort((a, b) => (b.sample_count || 0) - (a.sample_count || 0))[0];
          if (bestProfile && bestProfile.id) {
            await VoiceboxClient.setActiveProfile(bestProfile.id);
          }
        }
      } catch (err) {
        console.warn('Failed to load voice profiles for onboarding narration:', err);
      }
    }
    
    await VoiceboxClient.speak(text);
  } catch {
    // Voicebox not ready — silent fallback
  }
}

/** H.264 MP4 plays in Tauri WebView2; QuickTime `.mov` often does not — keep MP4 as primary `source`. */
function OnboardingBackgroundVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void el.play().catch((err) => {
      console.warn('[OnboardingBackgroundVideo] autoplay:', err);
    });
  }, []);

  return (
    <video
      ref={ref}
      className="fixed inset-0 z-0 h-full w-full object-cover pointer-events-none"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onError={(e) => {
        const err = e.currentTarget.error;
        console.error('[OnboardingBackgroundVideo] decode/load error', err?.code, err?.message);
      }}
    >
      <source src={`${base}/videos/0_Hologram_Globe_1920x1080.mp4`} type="video/mp4" />
      <source src={`${base}/videos/0_Hologram_Globe_1920x1080.mov`} type="video/quicktime" />
    </video>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  onComplete: (profile: OnboardingProfile) => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { osState: kernelState, applySnapshot } = useKernelState();
  const kernelStateRef = useRef(kernelState);
  useEffect(() => {
    kernelStateRef.current = kernelState;
  }, [kernelState]);
  /** When Tauri `invoke` fails, local mirror tracks phase between clicks. */
  const mirrorPhaseRef = useRef<MirrorPhase | null>(null);
  const narratedRef = useRef<Set<string>>(new Set());
  const [layerOpacities, setLayerOpacities] = useState<OnboardingLayerOpacities>(() =>
    loadOnboardingLayerOpacities(),
  );
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  /** "I Just Landed" path: keep one card mounted and morph into mode select. */
  const [morphFromLanding, setMorphFromLanding] = useState(false);
  const [morphPhase, setMorphPhase] = useState<'idle' | 'expanding'>('idle');
  /** Tracks which landing CTA was used (copy on phone / OTP). */
  const [pathArrival, setPathArrival] = useState<'new' | 'returning' | null>(null);
  /** Commander name captured at SubmitCommanderName for injected screens. */
  const [commanderName, setCommanderName] = useState('');
  /** Client-side injected steps shown after OTP and before planet_overview. */
  type InjectedStep = 'model_arena' | 'intent_demo' | 'three_p_intro' | 'invite' | 'done';
  const [injectedStep, setInjectedStep] = useState<InjectedStep>('model_arena');
  /** Latest visual context frame — base64 JPEG captured on each phase transition. */
  const latestFrameRef = useRef<string | null>(null);
  /** True when the user has a verified session — shows the returning-user landing instead of new-user landing. */
  const [isReturningUser] = useState(() => isOtpVerified() && !!readOnboardingProfile()?.commander_name);
  const [returningProfile] = useState(() => readOnboardingProfile());
  /** Whether the AI Library demo overlay is open (accessible from returning-user landing). */
  const [showDemoLibrary] = useState(false); // kept for type safety — no longer used

  const updateLayerOpacities = useCallback((next: OnboardingLayerOpacities) => {
    setLayerOpacities(next);
    persistOnboardingLayerOpacities(next);
  }, []);

  // Narrate on first visit to each screen
  const narrateOnce = useCallback(
    async (s: string, text: string) => {
      if (narratedRef.current.has(s)) return;
      narratedRef.current.add(s);
      await narrate(text);
    },
    []
  );

  useEffect(() => {
    // Snap the current UI on every phase transition to power Visual Grounding.
    invoke<string>('capture_visual_context')
      .then((b64) => { latestFrameRef.current = b64; })
      .catch(() => { /* not in Tauri (browser dev) or window not ready — graceful no-op */ });

    if (onboardingPermits(kernelState, 'onboarding_landing')) {
      void narrateOnce('landing', 'Welcome. You have landed on Planet AI OS.');
    } else if (onboardingPermits(kernelState, 'onboarding_mode_select')) {
      void narrateOnce('mode_select', 'Choose your interface — voice or chat.');
    } else if (onboardingPermits(kernelState, 'onboarding_commander_name')) {
      void narrateOnce('commander_name', 'What name shall we call you by, Commander?');
    } else if (onboardingPermits(kernelState, 'onboarding_returning_phone')) {
      void narrateOnce('returning_phone', 'Enter your number to verify your identity.');
    } else if (onboardingPermits(kernelState, 'onboarding_returning_otp')) {
      void narrateOnce('returning_otp', 'Enter the verification code.');
    } else if (onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'model_arena') {
      // OTP has just been accepted — lock in the session so a refresh never re-prompts.
      markOtpVerified();
      void narrateOnce('model_arena', `Welcome, ${commanderName || 'Commander'}. Let me introduce your intelligence stack.`);
    } else if (onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'intent_demo') {
      void narrateOnce('intent_demo', 'Every word you speak is an intent. Let me show you how the engine works.');
    } else if (onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'three_p_intro') {
      void narrateOnce('three_p_intro', 'Your success formula. Purpose, Plan, and Pressure — the three signals that keep you focused.');
    } else if (onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'invite') {
      void narrateOnce('invite', `Your stack is fully configured, ${commanderName || 'Commander'}. You have clearance to issue one early-access pass.`);
    } else if (onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'done') {
      void narrateOnce('planet_overview', `Welcome. The planet is yours.`);
    } else if (onboardingPermits(kernelState, 'onboarding_complete')) {
      void narrateOnce('complete', `Systems online. Speak your intent.`);
      setTimeout(() => {
        const profile: OnboardingProfile = {
          commander_name: commanderName || 'Commander',
          interface_mode: 'voice',
          arrival_type: 'new',
          enrolled_at: Date.now(),
        };
        writeOnboardingProfile(profile);
        markOnboardingComplete();
        onComplete(profile);
      }, 2800);
    }
  }, [kernelState, narrateOnce, onComplete, injectedStep, commanderName]);

  // Dispatch an intent to the Rust kernel; apply returned snapshot. If not in Tauri (e.g. Vite in a browser), mirror Rust onboarding locally.
  const dispatchIntent = useCallback(
    async (intentType: string, payload?: unknown) => {
      VoiceboxClient.stop();
      // Capture commander name so injected screens can personalise
      if (intentType === 'SubmitCommanderName' && typeof payload === 'string' && payload.trim()) {
        const name = payload.trim();
        setCommanderName(name);
        // Persist immediately — power button shows the name right away,
        // and the profile survives a refresh before onboarding_complete fires.
        writeOnboardingProfile({
          commander_name: name,
          interface_mode: 'voice',
          arrival_type: pathArrival ?? 'new',
          enrolled_at: Date.now(),
        });
      }
      const intent = JSON.stringify(
        payload !== undefined ? { type: intentType, payload } : { type: intentType },
      );
      try {
        const snapshot = await invoke<OsStateSnapshot>('process_intent', { intent });
        applySnapshot(snapshot);
        mirrorPhaseRef.current = null;
      } catch (err) {
        console.warn('[Onboarding] process_intent failed — using local onboarding mirror (browser dev?):', err);
        const intentObj = JSON.parse(intent) as { type: string; payload?: unknown };
        const prev =
          mirrorPhaseRef.current ?? phaseFromSnapshot(kernelStateRef.current);
        const next = transitionMirrorPhase(prev, intentObj);
        mirrorPhaseRef.current = next;
        applySnapshot(snapshotFromMirrorPhase(next));
      }
    },
    [applySnapshot],
  );

  const handleJustLanded = useCallback(() => {
    setPathArrival('new');
    setMorphFromLanding(true);
    setMorphPhase('expanding');
    window.setTimeout(() => {
      void dispatchIntent('SubmitArrivalType', 'new');
    }, 420);
  }, [dispatchIntent]);

  const handleReturning = useCallback(() => {
    setPathArrival('returning');
    void dispatchIntent('SubmitArrivalType', 'returning');
  }, [dispatchIntent]);

  const handleEnterLastState = useCallback(() => {
    const profile = readOnboardingProfile();
    if (!profile) {
      // Fallback: profile somehow gone, start fresh
      window.location.reload();
      return;
    }
    markOnboardingComplete();
    onComplete(profile);
  }, [onComplete]);

  const handleNewSession = useCallback(() => {
    resetOnboarding();
    window.location.reload();
  }, []);

  const showLandingMorphShell =
    onboardingPermits(kernelState, 'onboarding_landing') ||
    (onboardingPermits(kernelState, 'onboarding_mode_select') && morphFromLanding);

  return (
    <div className="relative w-full min-h-screen bg-transparent overflow-y-auto flex items-center justify-center py-8 md:py-12 font-sans custom-scrollbar">
      {/* Full-viewport background: MP4 first (WebView2 / Chromium decode H.264); MOV fallback for Safari */}
      <OnboardingBackgroundVideo />
      {/* Light touch: keep globe visible; bottom darkening is mostly the adjustable layer below */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-slate-950/25 via-slate-950/10 to-transparent"
        style={{ opacity: layerOpacities.globalScrim / 100 }}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-[1] pointer-events-none shadow-[inset_0_0_100px_50px_rgba(3,7,18,0.22)]"
        style={{ opacity: layerOpacities.vignette / 100 }}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[1] pointer-events-none h-[min(55vh,640px)] bg-gradient-to-t from-[#030712] via-[#030712]/55 to-transparent"
        style={{ opacity: layerOpacities.bottomWash / 100 }}
        aria-hidden
      />

      <OnboardingLayerSettingsPanel
        open={layerPanelOpen}
        onClose={() => setLayerPanelOpen(false)}
        layers={layerOpacities}
        onChange={updateLayerOpacities}
      />

      {/* Screen content - strictly governed by Kernel */}
      <SovereignGrid columns={1} className="relative z-20 w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <AnimatePresence mode="wait">
          {/* Returning-user landing — shown when a verified session already exists */}
          {isReturningUser && onboardingPermits(kernelState, 'onboarding_landing') && (
            <motion.div
              key="returning-user-landing"
              className="w-full flex justify-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <ScreenReturningLanding
                commanderName={returningProfile?.commander_name ?? 'Commander'}
                onEnterLastState={handleEnterLastState}
                onNewSession={handleNewSession}
              />
            </motion.div>
          )}
          {/* New-user landing — shown only when no verified session exists */}
          {!isReturningUser && showLandingMorphShell && (
            <motion.div
              key="landing-morph-shell"
              className="w-full flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LandingMorphShell
                showLanding={onboardingPermits(kernelState, 'onboarding_landing')}
                showMode={
                  onboardingPermits(kernelState, 'onboarding_mode_select') && morphFromLanding
                }
                morphPhase={morphPhase}
                cardOverlayOpacity={layerOpacities.landingCard}
                onOpenLayerSettings={() => setLayerPanelOpen(true)}
                onJustLanded={handleJustLanded}
                onReturning={handleReturning}
                onModeSelect={(mode) => void dispatchIntent('SubmitInterfaceMode', mode)}
              />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_mode_select') && !morphFromLanding && (
            <motion.div key="mode-returning" className="w-full">
              <ScreenModeSelect onSelect={(mode) => void dispatchIntent('SubmitInterfaceMode', mode)} />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_commander_name') && (
            <motion.div key="name" className="w-full">
              <ScreenCommanderName onSubmit={(name) => void dispatchIntent('SubmitCommanderName', name)} />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_returning_phone') && (
            <motion.div key="phone" className="w-full">
              <ScreenReturningPhone
                identityContext={pathArrival === 'returning' ? 'returning' : 'new'}
                onSubmit={(phone) => void dispatchIntent('SubmitPhoneNumber', phone)}
              />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_returning_otp') && (
            <motion.div key="otp" className="w-full">
              <ScreenReturningOtp
                identityContext={pathArrival === 'returning' ? 'returning' : 'new'}
                onSubmit={(otp) => void dispatchIntent('SubmitOTP', otp)}
                onBack={() => void dispatchIntent('GoBack')}
              />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep !== 'done' && (
            <>
              {injectedStep === 'model_arena' && (
                <motion.div
                  key="model-arena"
                  className="w-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScreenModelArena
                    commanderName={commanderName}
                    onNext={() => setInjectedStep('intent_demo')}
                  />
                </motion.div>
              )}
              {injectedStep === 'intent_demo' && (
                <motion.div
                  key="intent-demo"
                  className="w-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScreenIntentDemo
                    commanderName={commanderName}
                    onNext={() => setInjectedStep('three_p_intro')}
                  />
                </motion.div>
              )}
              {injectedStep === 'three_p_intro' && (
                <motion.div
                  key="three-p"
                  className="w-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Screen3PIntro
                    commanderName={commanderName}
                    onNext={() => setInjectedStep('invite')}
                  />
                </motion.div>
              )}
              {injectedStep === 'invite' && (
                <motion.div
                  key="invite"
                  className="w-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ScreenInvite
                    commanderName={commanderName}
                    onNext={() => setInjectedStep('done')}
                    onDispatch={(phone) => void dispatchIntent('SendInvite', { phone })}
                  />
                </motion.div>
              )}
            </>
          )}
          {onboardingPermits(kernelState, 'onboarding_planet_overview') && injectedStep === 'done' && (
            <motion.div key="planet" className="w-full">
              <ScreenPlanetOverview
                onFinish={() => void dispatchIntent('CompleteOnboarding')}
                dispatchIntent={(t, p) => void dispatchIntent(t, p)}
              />
            </motion.div>
          )}
          {onboardingPermits(kernelState, 'onboarding_complete') && (
            <motion.div key="complete" className="w-full">
              <ScreenComplete />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Library overlay removed — ScreenDemoLibrary now renders at App.tsx root level
            to avoid motion.div stacking context trap. See overlay-positioning.mdc. */}
      </SovereignGrid>

    </div>
  );
}

// ─── Screen: Returning User Landing ───────────────────────────────────────────

function ScreenReturningLanding({
  commanderName,
  onEnterLastState,
  onNewSession,
}: {
  commanderName: string;
  onEnterLastState: () => void;
  onNewSession: () => void;
  /** @deprecated AI Library button removed — no longer triggers unintended demo overlay */
  onDemoLibrary?: () => void;
}) {
  return (
    <div className="w-full max-w-[min(96vw,480px)] mx-auto">
      <SovereignCard
        omitDefaultBackdropBlur
        omitDefaultShadow
        style={{
          backgroundColor: 'rgb(2 6 23 / 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 0 100px -30px rgba(34, 211, 238, 0.25)',
        }}
        animate={false}
        className="flex flex-col items-center gap-7 text-center px-8 py-10 rounded-[2rem] border border-cyan-400/25 w-full"
      >
        {/* Identity */}
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400 mb-3">
            Welcome Back
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]">
            {commanderName}
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--panel-text-muted)' }}>
            Sovereign kernel active. Push the PTT button to speak.
          </p>
        </div>

        {/* Single primary action */}
        <SovereignButton
          onClick={onEnterLastState}
          className="w-full py-4 text-base !border-cyan-400/45 !bg-cyan-500/20 !text-cyan-100 hover:!bg-cyan-500/30"
        >
          Enter AI OS
        </SovereignButton>

        <button
          type="button"
          onClick={onNewSession}
          className="text-xs transition hover:opacity-80"
          style={{ color: 'var(--panel-text-muted)' }}
        >
          Start new session
        </button>
      </SovereignCard>
    </div>
  );
}

// ─── Landing → mode morph (single card) ───────────────────────────────────────

function LandingMorphShell({
  showLanding,
  showMode,
  morphPhase,
  cardOverlayOpacity,
  onOpenLayerSettings,
  onJustLanded,
  onReturning,
  onModeSelect,
}: {
  showLanding: boolean;
  showMode: boolean;
  morphPhase: 'idle' | 'expanding';
  cardOverlayOpacity: number;
  onOpenLayerSettings: () => void;
  onJustLanded: () => void;
  onReturning: () => void;
  onModeSelect: (m: 'voice' | 'chat') => void;
}) {
  const t = Math.min(100, Math.max(0, cardOverlayOpacity)) / 100;
  const blurPx = Math.round(t * 24);
  const expanded = morphPhase === 'expanding' || showMode;
  const showClearLanding = showLanding && !expanded;

  return (
    <motion.div
      layout
      className="w-full max-w-[min(96vw,1280px)] mx-auto"
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    >
      <SovereignCard
        omitDefaultBackdropBlur
        omitDefaultShadow
        style={{
          backgroundColor: showClearLanding ? 'transparent' : `rgb(2 6 23 / ${t})`,
          ...(showClearLanding
            ? {
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
              }
            : blurPx > 0
              ? {
                  backdropFilter: `blur(${blurPx}px)`,
                  WebkitBackdropFilter: `blur(${blurPx}px)`,
                }
              : {
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                }),
          boxShadow: showClearLanding ? 'none' : t > 0 ? '0 0 100px -30px rgba(34, 211, 238, 0.25)' : 'none',
        }}
        animate={false}
        className={`flex flex-col items-center justify-center text-center mx-auto px-6 sm:px-10 lg:px-16 py-12 sm:py-14 md:py-20 rounded-[2rem] border border-cyan-400/25 w-full transition-[min-height,max-width] duration-500 ease-out ${
          showClearLanding || t === 0 ? '!bg-transparent !border-transparent ' : ''
        }${
          expanded
            ? 'min-h-[min(92vh,980px)] justify-center gap-8'
            : 'min-h-[min(88vh,920px)] gap-10 md:gap-14 max-w-6xl xl:max-w-7xl'
        }`}
      >
        <AnimatePresence mode="wait">
          {showLanding && (
            <motion.div
              key="landing-pane"
              className="flex w-full flex-col items-center gap-10 md:gap-14"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <LandingHeroContent
                morphPhase={morphPhase}
                onOpenLayerSettings={onOpenLayerSettings}
                onJustLanded={onJustLanded}
                onReturning={onReturning}
              />
            </motion.div>
          )}
          {showMode && (
            <motion.div
              key="mode-pane"
              className="flex w-full flex-col items-center justify-center py-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <ScreenModeSelect embedded onSelect={onModeSelect} />
            </motion.div>
          )}
        </AnimatePresence>
      </SovereignCard>
    </motion.div>
  );
}

function LandingHeroContent({
  morphPhase,
  onOpenLayerSettings,
  onJustLanded,
  onReturning,
}: {
  morphPhase: 'idle' | 'expanding';
  onOpenLayerSettings: () => void;
  onJustLanded: () => void;
  onReturning: () => void;
}) {
  const expanding = morphPhase === 'expanding';
  return (
    <>
      <div className="space-y-3 max-w-4xl">
        <SovereignTitle
          level={1}
          className="mb-0 text-5xl sm:text-6xl md:text-7xl lg:text-8xl !leading-[1.05] drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)] flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3"
        >
          <span className="select-none">AI</span>
          <span className="inline-flex items-center gap-0">
            <button
              type="button"
              onClick={onOpenLayerSettings}
              className="relative inline-flex h-[0.82em] w-[0.82em] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 align-middle outline-none ring-offset-2 ring-offset-[#030712] transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-cyan-400/70"
              aria-label="Open visual stack — layer opacity controls"
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-cyan-500 to-indigo-600 shadow-[0_0_0.55em_rgba(99,179,237,0.45)]" />
              <span
                className="pointer-events-none absolute inset-0 rounded-full animate-ping opacity-25 bg-cyan-400"
                style={{ animationDuration: '3s' }}
              />
            </button>
            <span className="select-none">S</span>
          </span>
        </SovereignTitle>
      </div>
      <SovereignGrid
        columns={expanding ? 1 : 2}
        className={`w-full gap-4 sm:gap-6 ${expanding ? 'max-w-md' : 'max-w-4xl'}`}
      >
        <SovereignButton
          onClick={onJustLanded}
          variant="secondary"
          className="py-7 sm:py-8 text-base sm:text-lg !border-cyan-400/45 !bg-cyan-500/20 !text-cyan-100 hover:!bg-cyan-500/30"
        >
          <Rocket size={22} className="shrink-0" /> START HERE
        </SovereignButton>
        {!expanding && (
          <SovereignButton onClick={onReturning} variant="secondary" className="py-7 sm:py-8 text-base sm:text-lg">
            <Home size={22} className="shrink-0" /> LOGIN
          </SovereignButton>
        )}
      </SovereignGrid>
    </>
  );
}

// ─── Screen: Mode Select ─────────────────────────────────────────────────────

function ScreenModeSelect({
  onSelect,
  embedded,
}: {
  onSelect: (m: 'voice' | 'chat') => void;
  /** When true, render without outer SovereignCard (nested inside landing morph shell). */
  embedded?: boolean;
}) {
  const body = (
    <>
      <div>
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-2">Choose Your Interface</p>
        <SovereignTitle level={2} className="mb-2">How do you operate?</SovereignTitle>
        <SovereignDescription>
          You are entering the voice-first interface. Switch to chat if you prefer to type.
        </SovereignDescription>
      </div>
      <SovereignRadioGroup
        columns={2}
        value=""
        onChange={(val) => onSelect(val as 'voice' | 'chat')}
        options={[
          { value: 'voice', label: 'Voice', description: 'Push-to-talk', icon: <Mic size={28} /> },
          { value: 'chat', label: 'Chat', description: 'Text input', icon: <MessageSquare size={28} /> },
        ]}
      />
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col items-center gap-8 text-center w-full max-w-2xl mx-auto">{body}</div>
    );
  }

  return (
    <SovereignCard className="flex flex-col items-center gap-8 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
      {body}
    </SovereignCard>
  );
}

// ─── Screen: Commander Name ───────────────────────────────────────────────────

function ScreenCommanderName({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [val, setVal] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmedName, setConfirmedName] = useState('');

  const handleConfirm = useCallback(async () => {
    const name = val.trim();
    if (!name) return;
    setConfirmedName(name);
    setAcknowledged(true);
    // Narrate the acknowledgment
    await narrate(
      `Welcome, ${name}. We have been waiting for you. The planet is now under your command.`,
    );
  }, [val]);

  if (acknowledged) {
    return (
      <SovereignCard className="flex flex-col items-center gap-8 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          {/* Glowing avatar ring */}
          <div className="relative flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 shadow-[0_0_48px_16px_rgba(34,211,238,0.45)] flex items-center justify-center">
              <span className="text-4xl font-black text-white select-none">
                {confirmedName[0]?.toUpperCase()}
              </span>
            </div>
            <div
              className="absolute inset-0 rounded-full border-2 border-cyan-400/40 scale-[1.35] animate-ping"
              style={{ animationDuration: '2.2s' }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-cyan-400 text-sm uppercase tracking-[0.35em]">Identity Confirmed</p>
            <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              Welcome, {confirmedName}.
            </h2>
            <p className="text-zinc-300 text-base max-w-md leading-relaxed mt-1 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
              We have been waiting for you. The planet is now under your command.
            </p>
          </div>

          <SovereignButton
            onClick={() => onSubmit(confirmedName)}
            variant="primary"
            className="px-10 py-3 mt-2"
          >
            Begin Mission <ChevronRight size={18} />
          </SovereignButton>
        </motion.div>
      </SovereignCard>
    );
  }

  return (
    <SovereignCard className="flex flex-col items-center gap-8 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
      <div>
        <p className="text-cyan-400 text-sm uppercase tracking-[0.3em] mb-2">New Arrival Protocol</p>
        <SovereignTitle level={2} className="mb-2">Welcome, Commander</SovereignTitle>
        <SovereignDescription>
          We have been awaiting our fearless leader. We are ready to serve you.
        </SovereignDescription>
        <p className="text-gray-300 mt-3">What name shall we call you by?</p>
      </div>
      <div className="w-full space-y-3">
        <SovereignTextInput
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleConfirm()}
          placeholder="Enter your first name"
          autoFocus
          className="text-center text-xl"
        />
        <SovereignButton onClick={() => void handleConfirm()} variant="primary" className="w-full">
          Confirmed <ChevronRight size={18} />
        </SovereignButton>
      </div>
    </SovereignCard>
  );
}

// ─── Screen: Returning Phone ─────────────────────────────────────────────────

function ScreenReturningPhone({
  onSubmit,
  identityContext,
}: {
  onSubmit: (v: string) => void;
  identityContext: 'new' | 'returning';
}) {
  const [val, setVal] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const skipSend = import.meta.env.VITE_OTP_SKIP_SEND === 'true';

  async function handleContinue() {
    setSendErr(null);
    const v = val.trim();
    if (!v) return;

    if (skipSend) {
      sessionStorage.removeItem(CHECKME_SESSION_PHONE_KEY);
      sessionStorage.removeItem(CHECKME_SESSION_VERIFICATION_ID_KEY);
      onSubmit(v);
      return;
    }

    setSending(true);
    try {
      const result = await sendOtp(v);
      sessionStorage.setItem(CHECKME_SESSION_PHONE_KEY, result.phone);
      sessionStorage.removeItem(CHECKME_SESSION_VERIFICATION_ID_KEY);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setSendErr(formatCheckmeUserError(raw));
      console.error('[Onboarding] send-otp failed:', e);
      setSending(false);
      return;
    }
    setSending(false);
    onSubmit(v);
  }

  const isReturning = identityContext === 'returning';

  return (
    <SovereignCard className="flex flex-col items-center gap-8 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
      <div>
        <p
          className={`text-sm uppercase tracking-[0.3em] mb-2 ${isReturning ? 'text-green-400' : 'text-cyan-400'}`}
        >
          {isReturning ? 'Returning to Base' : 'Secure your account'}
        </p>
        <SovereignTitle level={2} className="mb-2">
          {isReturning ? 'All Systems Live' : 'Verify your phone'}
        </SovereignTitle>
        <p className="text-zinc-50 text-[15px] md:text-base max-w-md mx-auto leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
          {isReturning
            ? 'Enter your phone number to verify your identity.'
            : 'We will text a one-time code to this number to confirm your identity.'}
        </p>
      </div>
      {sendErr && (
        <p
          className="text-red-200 text-sm max-w-md text-left rounded-xl border border-red-400/35 bg-red-950/50 px-4 py-3 shadow-sm"
          role="alert"
        >
          {sendErr}
        </p>
      )}
      <div className="w-full space-y-3">
        <SovereignTextInput
          type="tel"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && void handleContinue()}
          placeholder="+1 555 000 0000"
          autoFocus
          className="text-center text-xl focus:ring-green-500/50 focus:border-green-500/60"
        />
        <SovereignButton
          onClick={() => void handleContinue()}
          disabled={sending}
          className="w-full bg-green-500/20 text-green-100 border-green-500/40 hover:bg-green-500/30 disabled:opacity-50"
        >
          {sending ? 'Sending code…' : (
            <>
              Continue <ArrowRight size={18} />
            </>
          )}
        </SovereignButton>
      </div>
    </SovereignCard>
  );
}

// ─── Screen: OTP ─────────────────────────────────────────────────────────────

function ScreenReturningOtp({
  onSubmit,
  identityContext,
  onBack,
}: {
  onSubmit: (v: string) => void;
  identityContext: 'new' | 'returning';
  onBack: () => void;
}) {
  const [val, setVal] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);
  const pendingPhone =
    typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CHECKME_SESSION_PHONE_KEY) : null;
  const useOtpApiVerify = Boolean(pendingPhone);

  async function handleVerifyWithCode() {
    setVerifyErr(null);
    const phone = sessionStorage.getItem(CHECKME_SESSION_PHONE_KEY);
    if (phone && val.length === 6) {
      setVerifying(true);
      try {
        const result = await verifyOtp(phone, val);
        if (!result.verified) {
          throw new Error('Code could not be verified');
        }
        sessionStorage.removeItem(CHECKME_SESSION_PHONE_KEY);
        sessionStorage.removeItem(CHECKME_SESSION_VERIFICATION_ID_KEY);
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        setVerifyErr(formatCheckmeUserError(raw));
        console.error('[Onboarding] verify-otp failed:', e);
        setVerifying(false);
        return;
      }
      setVerifying(false);
    }
    onSubmit(val);
  }

  const isReturning = identityContext === 'returning';

  return (
    <SovereignCard className="flex flex-col items-center gap-8 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
      <div>
        <p
          className={`text-sm uppercase tracking-[0.3em] mb-2 ${isReturning ? 'text-green-400' : 'text-cyan-400'}`}
        >
          Identity Verification
        </p>
        <SovereignTitle level={2} className="mb-2">Enter Access Code</SovereignTitle>
        <p className="text-zinc-50 text-[15px] md:text-base max-w-md mx-auto leading-relaxed [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
          {useOtpApiVerify
            ? isReturning
              ? 'Enter the six-digit code from SMS.'
              : 'Enter the six-digit code we sent to confirm your identity.'
            : 'Enter your code, or finish in the browser and confirm below.'}
        </p>
      </div>
      {verifyErr && (
        <p
          className="text-red-200 text-sm max-w-md text-left rounded-xl border border-red-400/35 bg-red-950/50 px-4 py-3 shadow-sm"
          role="alert"
        >
          {verifyErr}
        </p>
      )}
      <div className="w-full space-y-3">
        <SovereignTextInput
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && val.length === 6 && !verifying && void handleVerifyWithCode()}
          placeholder="000000"
          autoFocus
          className="text-center text-2xl tracking-[0.5em] focus:ring-green-500/50 focus:border-green-500/60"
        />
        <SovereignButton
          onClick={() => void handleVerifyWithCode()}
          disabled={val.length !== 6 || verifying}
          className="w-full bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30 disabled:opacity-40"
        >
          {verifying ? 'Verifying…' : (
            <>
              Verify with code <ChevronRight size={18} />
            </>
          )}
        </SovereignButton>
        <button
          type="button"
          onClick={onBack}
          disabled={verifying}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <ChevronLeft size={16} />
          Back — re-enter phone number
        </button>
      </div>
    </SovereignCard>
  );
}

// ─── Screen: Complete ────────────────────────────────────────────────────────

function ScreenComplete() {
  return (
    <SovereignCard className="flex flex-col items-center gap-6 text-center bg-transparent border-none shadow-none backdrop-blur-none w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_40px_15px_rgba(99,179,237,0.4)]">
          <CheckCircle size={36} className="text-white" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 scale-150 animate-ping" style={{ animationDuration: '2s' }} />
      </div>
      <div>
        <SovereignTitle level={2} className="mb-2">Systems Online</SovereignTitle>
        <SovereignDescription variant="accent" className="text-lg">
          Affirmative, Commander.
        </SovereignDescription>
        <p className="text-gray-400 text-sm mt-2">All systems initialised. Full sovereignty engaged.</p>
      </div>
      <div className="flex gap-2 mt-2">
        {[0, 1, 2].map((i) => (
          <motion.div key={i} className="w-2 h-2 rounded-full bg-cyan-400" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.6, delay: i * 0.2, repeat: Infinity }} />
        ))}
      </div>
    </SovereignCard>
  );
}
