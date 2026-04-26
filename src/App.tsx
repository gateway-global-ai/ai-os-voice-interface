/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  FormEvent,
  type MutableRefObject,
  type PointerEvent,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  User,
  Settings,
  Building2,
  Table,
  Presentation,
  Calendar,
  Video,
  Layout,
  Volume2,
  Check,
  Activity,
  Sliders,
  Target,
  Zap,
  Flag,
  Briefcase,
  UserCheck,
  Mic,
  Plus,
  StopCircle,
  Paperclip,
  X,
  FileText,
  Palette,
  Radio,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './lib/tauriRuntime';
import type {
  AppMode,
  DISCProfile,
  Message,
  ShellAudioCue,
  ShellAudioCueSource,
  SystemStatus,
  VoicePlaybackEngine,
} from './shell/appTypes';
import { buildShellAudioCue } from './shell/shellAudioCues';
import {
  buildGroundedSystemPrompt,
  buildSystemPrompt,
  scaffoldingDensityForVerbosity,
} from './shell/shellPromptBuilders';
import { logGeminiGatewayFallback } from './api/geminiErrors';
import { isVibePublicShellSurface } from './shell/vibePublicSurface';
import { isThemeOverlayCustomized, mapThemeToCanvasChrome } from './shell/canvasChromeTheme';

const LazyShellTransparencyDrawer = lazy(() =>
  import('./components/shell/ShellTransparencyDrawer').then((module) => ({
    default: module.ShellTransparencyDrawer,
  })),
);
const LazySessionKnowledgePanel = lazy(() =>
  import('./components/shell/SessionKnowledgePanel').then((module) => ({
    default: module.SessionKnowledgePanel,
  })),
);
const LazyPodcastLibraryPanel = lazy(() =>
  import('./components/shell/PodcastLibraryPanel').then((module) => ({ default: module.PodcastLibraryPanel })),
);
const LazyUserStoragePanel = lazy(() =>
  import('./components/shell/UserStoragePanel').then((module) => ({ default: module.UserStoragePanel })),
);
const LazyCodingAgentPanel = lazy(() =>
  import('./components/shell/CodingAgentPanel').then((module) => ({ default: module.CodingAgentPanel })),
);
const LazyPublicPodcastPage = lazy(() =>
  import('./components/shell/PublicPodcastPage').then((module) => ({ default: module.PublicPodcastPage })),
);
const LazyWorkspaceHubSurface = lazy(() =>
  import('./overlays/WorkspaceHubSurface').then((module) => ({ default: module.WorkspaceHubSurface })),
);
const LazyWorkspaceOnboardingSurface = lazy(() =>
  import('./overlays/WorkspaceOnboardingSurface').then((module) => ({
    default: module.WorkspaceOnboardingSurface,
  })),
);
const LazyApiHealthOverlay = lazy(() =>
  import('./overlays/ApiHealthOverlay').then((module) => ({ default: module.ApiHealthOverlay })),
);
import * as VoiceboxClient from './core/io/VoiceboxClient';
import {
  toggleLandingWelcomePlayback,
  stopLandingStartWelcome,
  landingStartWelcomeAudioSrc,
} from './shell/landingStartWelcomeAudio';
import { VIBE_TOPIC_SCRIPTED_RESPONSES, vibeTopicUserPromptLine } from './shell/vibeLandingNarration';
import { VibeJoinCommunityCard } from './components/shell/VibeJoinCommunityCard';
import type { VoiceProfile } from './core/io/VoiceboxClient';
import { stripIntentLineForDisplay } from './shellCanvas/intentParse';
import { logShellCanvasAudit } from './shellCanvas/shellCanvasAudit';
import { useWorkspaceCanvas } from './shellCanvas/WorkspaceCanvasContext';
import { ShellVoiceIdlePanel, type VibeTopicId } from './components/shell/ShellVoiceIdlePanel';
import {
  LoyaltyIntroSequence,
  hasSeenLoyaltyIntro,
} from './components/shell/LoyaltyIntroSequence';
import { ShellBackground } from './components/shell/ShellBackground';
import { ShellOverlayFrame } from './components/shell/ShellOverlayFrame';
import {
  useShellTheme,
  themeToCssVars,
} from './shell/useShellTheme';
import { fetchLocalModelReadiness } from './api/localModelClient';
import type { LocalModelReadiness } from './local-llm/types';
import { routeShellAgentText } from './shell/shellIntentRouter';
import { SovereignVoiceEngine } from './core/io/SovereignVoiceEngine';
import { BrowserVoiceEngine } from './core/io/BrowserVoiceEngine';
import { GeminiVoiceEngine, type GeminiPlaybackResult } from './core/io/GeminiVoiceEngine';
import { resolveWorkspaceState, setWorkspaceUserConnected, shouldShowWorkspaceHub } from './shell/workspaceState';
import { ScopeMetricsDevHud } from './dev/ScopeMetricsDevHud';
import { useShellState } from './shell/ShellStateContext';
import { useKernelState } from './kernel/useKernelState';
import { useKernelTelemetry } from './kernel/useKernelTelemetry';
import type { KernelVerbosityLevel } from './kernel/types';
import { kernelPermits } from './kernel/types';
import { ShellIdentityBar } from './components/shell/ShellIdentityBar';
import {
  VirtualDesktopEnvironment,
  type VcuUniversityView,
} from './components/shell/VirtualDesktopEnvironment';
import {
  DesktopWelcomeOverlay,
  DESKTOP_WELCOME_VOICE_SCRIPT,
} from './components/shell/DesktopWelcomeOverlay';
import { CrystalOverlay } from './components/shell/CrystalOverlay';
import { DISCSettingsOverlay } from './components/shell/DISCSettingsOverlay';
import { OrbitalVisualizer } from './components/shell/OrbitalVisualizer';
import { ShellMenuController } from './components/shell/ShellMenuController';
import { UserProfilePanel } from './components/shell/UserProfilePanel';
import { AdminPanel } from './components/shell/AdminPanel';
import { LiveBackgroundAppearancePicker } from './components/shell/LiveBackgroundAppearancePicker';
import type { PowerChromeState } from './components/shell/ShellSystemControls';
import {
  getVoiceRoute,
  setVoiceRoute,
  voiceRouteLabel,
  hasExplicitVoiceRouteSelection,
  loadVoiceRouteFromSupabase,
  syncVoiceRouteToSupabase,
  type VoiceRouteId,
} from './config/voiceRoutePreference';
import { CommandRail, type CommandRailState } from './components/shell/CommandRail';
import {
  ShellContentZone,
  type ShellGlassTheme,
  type ShellTranscriptMessage,
} from './ui/shell';
import {
  SovereignGrid,
  SovereignCard,
  SovereignTitle,
  SovereignDescription,
  SovereignButton,
  SovereignTextInput,
  SovereignRadioGroup,
} from './ui-core';
import { cn } from './lib/cn';
import { geminiGenerateText } from './api/geminiGateway';
import {
  tryParseShellStateCommand,
  shellStateCommandAck,
} from './shell/shellStateCommands';
import { readInterimShellAuthority } from './shell/shellAuthority';
import {
  readSessionEntryClassification,
  markSessionEntryEngaged,
  type SessionEntryClassification,
} from './shell/sessionEntryClassification';
import {
  applyShellNavigationAction,
  getShellNavigationDenialMessage,
  shellStateCommandToNavigationAction,
  tryApplyShellNavigationAction,
  type ShellApplyHandlers,
} from './shell/shellNavigationApply';
import {
  readOnboardingProfile,
  resetOnboarding,
  isOtpVerified,
  markOtpVerified,
  writeOnboardingProfile,
  getSupabaseUserId,
  loadProfileFromSupabase,
  syncProfileToSupabase,
} from './onboarding/onboardingState';
import { buildShellPromptContract } from './shell/shellPromptContract';
import { useShellMenuActions } from './shell/useShellMenuActions';
import { useShellMenuRuntime } from './shell/useShellMenuRuntime';
import { useTauriKernelBridge } from './shell/useTauriKernelBridge';
import { useShellJourney } from './shell/useShellJourney';
import { getLandingWelcomePlayback } from './shell/landingStartWelcomeAudio';
import {
  buildVibeCodersHostSystemPrompt,
  buildVibeCodersScreenBuddyPrompt,
  readVibeGuestDisplayName,
  shouldUseVibeCodersHostPrompt,
  writeVibeGuestDisplayName,
} from './shell/vibeCodersSystemPrompt';
import type { ShellMenuId } from './shell/shellMenuContract';
import { CENTRAL_SHELL_MENU_REGISTRY, filterShellMenuRegistryForAuth } from './shell/shellMenuRegistry';
import type { ShellMenuRegistryEntry, ShellMenuStoreState } from './shell/shellMenuStoreTypes';
import { useShellMenuRegistry } from './shell/shellMenuLoader';
import { VOICEBOX_SAMPLE_PROMPTS, VOICEBOX_SAMPLE_TARGET, voiceboxPromptForCount } from './shell/voiceBoxRecordConfig';
import { VoiceBoxRecordDetailSurface } from './components/shell/VoiceBoxRecordDetailSurface';
import { RealityCheckReport } from './components/shell/RealityCheckReport';
import { AuthPanel } from './components/shell/AuthPanel';
import { intentIngestionController } from './shell/IntentIngestionController';
import { heuristicShortcutScanner } from './shell/HeuristicShortcutScanner';
import { knowledgeRetrievalService } from './knowledge/KnowledgeRetrievalService';
import type { ShortcutTrigger } from './knowledge/KnowledgeBaseSchema';
import {
  getTrackedShellSessionId,
  trackShellSession,
} from './shell/shellBootstrap';
import {
  loadInputsFromSupabase,
} from './core/knowledge/sessionKnowledgeStore';
import {
  loadCanvasChromeFromSupabase,
  syncCanvasChromeToSupabase,
} from './lib/canvasChromeSettings';

/** Workspace canvas uses `workspaceCanvas` state (intent outputs), not AppMode. */
const LOCAL_STT_PLACEHOLDER = '__LOCAL_STT_PLACEHOLDER__';

export default function App({
  speakTextRef,
}: {
  speakTextRef: MutableRefObject<(text: string, overrideVoice?: string) => Promise<void>>;
}) {
  const publicPodcastId =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('podcast') : null;

  const {
    canvas: workspaceCanvas,
    payload,
    dataPhase,
    dataError,
    loadData,
    loadDataAfterWorkspaceConnect,
    retryLoadData,
    closeCanvas,
    goBack,
    dismissBackdrop,
    applyAgentIntent,
  } = useWorkspaceCanvas();

  const { surfaceMode, showOperatorShellChrome, showDeveloperHud, setSurfaceMode } = useShellState();
  const { osState: kernelState } = useKernelState();
  const {
    beginInteraction,
    recordInteraction,
    setScaffolding,
    resetTelemetry,
    recordBargein,
    flushTelemetry,
  } = useKernelTelemetry();
  const showDiagnosticsChrome = showOperatorShellChrome;

  const [mode, setMode] = useState<AppMode>("voice");
  const [vcuLaunchRequest, setVcuLaunchRequest] = useState<{
    view: VcuUniversityView;
    revision: number;
  } | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(() => getSupabaseUserId());
  const [trackedShellSessionId, setTrackedShellSessionId] = useState<string | null>(() => getTrackedShellSessionId());
  const { theme, setTheme, resetTheme } = useShellTheme(supabaseUserId);
  const [voiceRoute, setVoiceRouteState] = useState<VoiceRouteId>(() => getVoiceRoute());
  const [voicePlaybackEngine, setVoicePlaybackEngine] = useState<VoicePlaybackEngine>('idle');
  const [voicePlaybackDetail, setVoicePlaybackDetail] = useState<string | undefined>(undefined);
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [currentAudioCue, setCurrentAudioCue] = useState<ShellAudioCue | null>(null);
  const [queuedAudioCues, setQueuedAudioCues] = useState<ShellAudioCue[]>([]);
  /** True once the user explicitly picks Voice or Chat from the idle panel — hides the panel. */
  const [shellSessionStarted, setShellSessionStarted] = useState(false);
  /** Centered desktop welcome card after session starts (Vibe Coding University workspace). */
  const [desktopWelcomeOpen, setDesktopWelcomeOpen] = useState(false);
  const [desktopWelcomeDismissed, setDesktopWelcomeDismissed] = useState(false);
  const desktopWelcomeAudioFiredRef = useRef(false);
  /** True while the first-time Loyalty intro sequence is displayed. */
  const [showLoyaltyIntro, setShowLoyaltyIntro] = useState(false);
  const [knowledgePanelInitialTab, setKnowledgePanelInitialTab] = useState<'library' | 'upload'>('library');
  const [sessionEntryClassification, setSessionEntryClassification] =
    useState<SessionEntryClassification>(() => readSessionEntryClassification());
  /** Phone OTP session — gates shell chrome until verified (persisted via onboardingState). */
  const [authSessionActive, setAuthSessionActive] = useState(() => isOtpVerified());
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [guestNicknameOverlayOpen, setGuestNicknameOverlayOpen] = useState(false);
  const [guestNicknameDraft, setGuestNicknameDraft] = useState('');
  const [guestJoinSurfaceOpen, setGuestJoinSurfaceOpen] = useState(false);
  const guestPreferredInterfaceRef = useRef<'voice' | 'chat'>('voice');
  const [landingIntroPlaying, setLandingIntroPlaying] = useState(false);
  const postAuthOpenProjectBuilderRef = useRef(false);
  const [status, setStatus] = useState<SystemStatus>("connected");
  const [shellMenuStore, setShellMenuStore] = useState<ShellMenuStoreState>(() => ({
    registry_by_id: CENTRAL_SHELL_MENU_REGISTRY,
    context: {
      active_voice_route: getVoiceRoute(),
      active_voice_profile_id: null,
      voicebox_ready: false,
      workspace_connected: false,
      diagnostics_enabled: false,
      appearance_dirty: false,
      agent_identity_dirty: false,
      auth_status: 'guest',
      active_surface_mode: 'voice',
    },
    ui: {
      active_menu_id: null,
      menu_stack: [],
      is_open_by_menu_id: {},
      active_level_id_by_menu_id: {},
      selected_action_id_by_menu_id: {},
    },
    recording: {
      available_profiles: [],
      active_profile_id: null,
      sample_count_by_profile_id: {},
      recommended_sample_target: VOICEBOX_SAMPLE_TARGET,
      sample_prompt_sentences: VOICEBOX_SAMPLE_PROMPTS,
      selected_prompt_text: VOICEBOX_SAMPLE_PROMPTS[0],
      capture_status: 'idle',
      capture_chunks: [],
      last_saved_profile_id: null,
      last_saved_sample_at: null,
      last_error: null,
      ptt_binding_enabled: false,
      session_id: 0,
      voicebox_ready: null,
    },
    intent_ingestion: {
      status: 'idle',
      current_payload: null,
      active_baseline: null,
      pending_review: null,
      last_error: null,
    },
    revision: 1,
  }));
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [chatInput, setChatInput] = useState("");
  const [workspaceConnecting, setWorkspaceConnecting] = useState(false);
  /** Files imported by the user — injected into the next LLM system prompt. */
  const [importedFiles, setImportedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [localModelReadiness, setLocalModelReadiness] = useState<LocalModelReadiness | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [onboardingProfile, setOnboardingProfile] = useState(
    () => readOnboardingProfile(),
  );
  const { registry: authoritativeMenuRegistry } = useShellMenuRegistry();

  const applyVoiceRoute = useCallback((route: VoiceRouteId) => {
    setVoiceRoute(route);
    setVoiceRouteState(getVoiceRoute());
  }, []);

  const cycleVoiceRoute = useCallback(() => {
    const order: VoiceRouteId[] = ['voicebox', 'gemini', 'browser'];
    const current = getVoiceRoute();
    const next = order[(order.indexOf(current) + 1) % order.length];
    applyVoiceRoute(next);
  }, [applyVoiceRoute]);

  // Re-read profile when session restarts (e.g. after onboarding completes).
  useEffect(() => {
    setOnboardingProfile(readOnboardingProfile());
  }, [shellSessionStarted, sessionEntryClassification]);

  useEffect(() => {
    setVoiceRouteState(getVoiceRoute());
  }, []);

  useEffect(() => {
    if (!authSessionActive) {
      hydratedRemoteShellStateUserRef.current = null;
      setSupabaseUserId(null);
      return;
    }
    setSupabaseUserId(getSupabaseUserId());
  }, [authSessionActive]);

  const hydratedRemoteShellStateUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authSessionActive || !supabaseUserId) return;
    if (hydratedRemoteShellStateUserRef.current === supabaseUserId) return;
    hydratedRemoteShellStateUserRef.current = supabaseUserId;
    let cancelled = false;

    (async () => {
      await Promise.all([
        loadProfileFromSupabase(supabaseUserId),
        loadInputsFromSupabase(supabaseUserId),
      ]);
      if (cancelled) return;
      setOnboardingProfile(readOnboardingProfile());

      await loadVoiceRouteFromSupabase(supabaseUserId);
      if (!cancelled) {
        setVoiceRouteState(getVoiceRoute());
      }

      const remoteCanvasChrome = await loadCanvasChromeFromSupabase(supabaseUserId);
      if (
        !cancelled
        && remoteCanvasChrome
        && !isThemeOverlayCustomized(theme)
      ) {
        setTheme({
          overlayColor: remoteCanvasChrome.bgOverlayColor,
          overlayOpacity: remoteCanvasChrome.bgOverlayOpacity,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authSessionActive, supabaseUserId, setTheme, theme]);

  useEffect(() => {
    void trackShellSession(surfaceMode, supabaseUserId, sessionEntryClassification).then((sessionId) => {
      if (sessionId) {
        setTrackedShellSessionId(sessionId);
      }
    });
  }, [sessionEntryClassification, supabaseUserId, surfaceMode]);

  useEffect(() => {
    if (!supabaseUserId) return;
    void syncVoiceRouteToSupabase(supabaseUserId, voiceRoute);
  }, [supabaseUserId, voiceRoute]);

  useEffect(() => {
    if (!supabaseUserId) return;
    void syncCanvasChromeToSupabase(supabaseUserId, mapThemeToCanvasChrome(theme));
  }, [supabaseUserId, theme]);

  const {
    activeShellMenuEntry,
    activeShellMenuId,
    clearShellMenuSelectedAction,
    closeShellMenus,
    footerMenuOpen,
    headerMenuOpen,
    markShellMenuActionSelected,
    openShellMenuById,
    setFooterMenuOpen,
    setHeaderMenuOpen,
    setShellMenuLevel,
    setShellMenuRecordingState,
  } = useShellMenuRuntime(shellMenuStore, setShellMenuStore);

  const selectVoiceboxRecordingProfile = useCallback(
    (profileId: string | null) => {
      setShellMenuRecordingState((recording) => {
        const normalizedProfileId = profileId || null;
        const sampleCount = normalizedProfileId
          ? recording.sample_count_by_profile_id[normalizedProfileId] ?? 0
          : 0;
        return {
          ...recording,
          active_profile_id: normalizedProfileId,
          selected_prompt_text: voiceboxPromptForCount(sampleCount),
          capture_status: normalizedProfileId ? 'armed' : 'idle',
          last_error: null,
          ptt_binding_enabled: Boolean(normalizedProfileId),
        };
      });
    },
    [setShellMenuRecordingState],
  );

  const refreshVoiceboxRecordingState = useCallback(async () => {
    const ready = await VoiceboxClient.ensureVoiceboxReady();
    if (!ready) {
      setShellMenuRecordingState((recording) => ({
        ...recording,
        available_profiles: [],
        active_profile_id: null,
        sample_count_by_profile_id: {},
        selected_prompt_text: voiceboxPromptForCount(0),
        capture_status: 'idle',
        capture_chunks: [],
        last_error: 'Voice Box runtime is offline.',
        ptt_binding_enabled: false,
        voicebox_ready: false,
      }));
      return;
    }

    const profiles = await VoiceboxClient.listProfiles();
    const sampleCountByProfileId = profiles.reduce<Record<string, number>>((accumulator, profile) => {
      accumulator[profile.id] = profile.sample_count ?? 0;
      return accumulator;
    }, {});

    setShellMenuRecordingState((recording) => {
      const preferredProfileId =
        recording.active_profile_id && sampleCountByProfileId[recording.active_profile_id] !== undefined
          ? recording.active_profile_id
          : shellMenuStore.context.active_voice_profile_id &&
              sampleCountByProfileId[shellMenuStore.context.active_voice_profile_id] !== undefined
            ? shellMenuStore.context.active_voice_profile_id
            : profiles[0]?.id ?? null;
      const selectedCount = preferredProfileId ? sampleCountByProfileId[preferredProfileId] ?? 0 : 0;

      return {
        ...recording,
        available_profiles: profiles,
        active_profile_id: preferredProfileId,
        sample_count_by_profile_id: sampleCountByProfileId,
        selected_prompt_text: voiceboxPromptForCount(selectedCount),
        capture_status: recording.capture_status === 'recording' ? 'recording' : preferredProfileId ? 'armed' : 'idle',
        capture_chunks: recording.capture_status === 'recording' ? recording.capture_chunks : [],
        last_error: null,
        ptt_binding_enabled: Boolean(preferredProfileId),
        voicebox_ready: true,
      };
    });
  }, [setShellMenuRecordingState, shellMenuStore.context.active_voice_profile_id]);

  const handleProfileUpdate = useCallback((profile: import('./onboarding/onboardingState').OnboardingProfile) => {
    setOnboardingProfile(profile);
  }, []);

  const workspaceKernelGateOpenedRef = useRef(false);
  /** Latest visual context frame captured by the Rust kernel — base64 JPEG, or null when unavailable. */
  const latestFrameRef = useRef<string | null>(null);
  const handleLogout = useCallback(() => {
    resetOnboarding();
    setSupabaseUserId(null);
    setAuthSessionActive(false);
    window.location.reload();
  }, []);

  const handleAuthVerified = useCallback((phone: string) => {
    markOtpVerified();
    setAuthSessionActive(true);
    setAuthPanelOpen(false);
    const existing = readOnboardingProfile();
    const openProjectBuilder = postAuthOpenProjectBuilderRef.current;
    postAuthOpenProjectBuilderRef.current = false;
    const nextProfile: import('./onboarding/onboardingState').OnboardingProfile = {
      commander_name: existing?.commander_name?.trim() || 'Operator',
      interface_mode: guestPreferredInterfaceRef.current || existing?.interface_mode || 'voice',
      arrival_type: openProjectBuilder ? 'new' : 'returning',
      enrolled_at: existing?.enrolled_at ?? Date.now(),
      phone_number: phone,
    };
    writeOnboardingProfile(nextProfile);
    setOnboardingProfile(nextProfile);
    setGuestJoinSurfaceOpen(false);
    setShellSessionStarted(true);
    void syncProfileToSupabase(phone, nextProfile).then((userId) => {
      if (userId) {
        setSupabaseUserId(userId);
      }
    });
    if (openProjectBuilder) {
      queueMicrotask(() => setMode('coding_agent'));
    }
  }, []);

  const engageSessionEntry = useCallback(() => {
    markSessionEntryEngaged();
    setSessionEntryClassification('returning');
  }, []);

  const handleLandingIntroPlayPause = useCallback(async () => {
    try {
      const next = await toggleLandingWelcomePlayback(landingStartWelcomeAudioSrc(), () => {
        setLandingIntroPlaying(false);
      });
      setLandingIntroPlaying(next === 'playing');
    } catch (err) {
      console.warn('[landing welcome] Recording unavailable —', err);
      setLandingIntroPlaying(false);
    }
  }, []);

  const openGuestJoinSurface = useCallback(() => {
    stopLandingStartWelcome();
    setLandingIntroPlaying(false);
    setGuestJoinSurfaceOpen(true);
  }, []);

  const handleGuestSkipIntro = useCallback(() => {
    postAuthOpenProjectBuilderRef.current = false;
    openGuestJoinSurface();
  }, [openGuestJoinSurface]);

  /** Guest hero “skip intro” — stop welcome audio only; ShellVoiceIdlePanel opens the 3-path community menu. */
  const handleGuestSkipIntroToCommunityMenu = useCallback(() => {
    postAuthOpenProjectBuilderRef.current = false;
    stopLandingStartWelcome();
    setLandingIntroPlaying(false);
  }, []);

  const handleGuestSelectMode = useCallback(
    (selectedMode: 'voice' | 'chat') => {
      guestPreferredInterfaceRef.current = selectedMode;
      openGuestJoinSurface();
    },
    [openGuestJoinSurface],
  );

  const handleAuthenticatedSkipIntro = useCallback(() => {
    VoiceboxClient.stop();
    stopLandingStartWelcome();
    setLandingIntroPlaying(false);
    if (!hasSeenLoyaltyIntro()) {
      setShowLoyaltyIntro(true);
    } else {
      engageSessionEntry();
      setShellSessionStarted(true);
    }
  }, [engageSessionEntry]);

  const handleGuestContinueWithPhone = useCallback(() => {
    setGuestJoinSurfaceOpen(false);
    setAuthPanelOpen(true);
  }, []);

  const openWorkspaceHub = useCallback(() => {
    engageSessionEntry();
    setHeaderMenuOpen(false);
    setFooterMenuOpen(false);
    setMode('voice');
    void loadData('workspace_hub', undefined, { transitionMode: 'intent' });
  }, [engageSessionEntry, loadData]);

  /** If onboarding unlocked the workspace gate via `ExecuteTaskAction`, open setup once in the main shell. */
  useEffect(() => {
    if (!kernelState) return;
    if (!kernelPermits(kernelState, 'workspace_settings_overlay')) return;
    if (workspaceKernelGateOpenedRef.current) return;
    if (workspaceCanvas) return;
    workspaceKernelGateOpenedRef.current = true;
    engageSessionEntry();
    setShellSessionStarted(true);
    void loadData('workspace_onboarding', undefined, { transitionMode: 'intent' });
  }, [kernelState, workspaceCanvas, loadData, engageSessionEntry]);

  const shellApplyHandlers = useMemo<ShellApplyHandlers>(
    () => ({
      setSurfaceMode,
      setMenuState: (menuId, open) => {
        engageSessionEntry();
        if (open) {
          openShellMenuById(menuId);
          return;
        }
        closeShellMenus();
      },
      setVoiceChatMode: (m) => {
        if (m === 'chat') engageSessionEntry();
        closeShellMenus();
        setMode(m === 'chat' ? 'chat' : 'voice');
      },
      setAppTargetMode: (m) => {
        if (m === 'voice_settings') {
          openShellMenuById('voice-box');
          return;
        }
        if (m === 'disc_settings') {
          closeShellMenus();
          setMode('disc_settings');
          return;
        }
        openShellMenuById('agent-identity');
      },
      openWorkspace: openWorkspaceHub,
    }),
    [closeShellMenus, engageSessionEntry, openShellMenuById, openWorkspaceHub, setSurfaceMode],
  );

  const handleToggleVoiceChatFromShell = useCallback(() => {
    recordInteraction();
    const target: 'voice' | 'chat' = mode === 'chat' ? 'voice' : 'chat';
    if (!authSessionActive) {
      guestPreferredInterfaceRef.current = target;
    }
    tryApplyShellNavigationAction(
      { type: 'set_voice_chat_mode', mode: target === 'chat' ? 'chat' : 'voice' },
      readInterimShellAuthority(),
      shellApplyHandlers,
    );
  }, [authSessionActive, mode, recordInteraction, shellApplyHandlers]);

  const handleChatInputChange = useCallback(
    (value: string) => {
      if (!chatInput.trim() && value.trim()) {
        beginInteraction();
        recordInteraction();
      }
      setChatInput(value);
    },
    [beginInteraction, chatInput, recordInteraction],
  );

  const workspaceDisclosure = useMemo(
    () => resolveWorkspaceState({ isConnecting: workspaceConnecting }),
    [workspaceConnecting, workspaceCanvas, payload]
  );

  const powerChromeState = useMemo((): PowerChromeState => {
    const disconnected = status === 'offline' || workspaceDisclosure === 'error';
    if (disconnected) return 'disconnected';
    if (authSessionActive) return 'signed_in';
    const name = onboardingProfile?.commander_name?.trim();
    if (name) return 'signed_in';
    return 'idle';
  }, [status, workspaceDisclosure, onboardingProfile?.commander_name, authSessionActive]);

  const commanderName = onboardingProfile?.commander_name?.trim() || null;
  const promptContract = useMemo(
    () =>
      buildShellPromptContract({
        commanderName,
        interactionMode: mode === 'chat' ? 'chat' : 'voice',
        currentIntent: kernelState?.current_intent,
        availableSkills: kernelState?.available_skills ?? [],
      }),
    [commanderName, kernelState?.available_skills, kernelState?.current_intent, mode],
  );

  const activeVoiceLabel = voiceRouteLabel(voiceRoute);
  const voiceRouteDescription = useMemo(() => {
    if (voiceRoute === 'voicebox') {
      return isTauri
        ? 'Voicebox is the default sovereign voice route on desktop and stays tied to the platform-owner voice profile unless you switch it.'
        : 'Voicebox is preferred, but this environment falls back to Gemini when local desktop voice routing is unavailable.';
    }
    if (voiceRoute === 'browser') {
      return 'Browser Voice is active as the explicit built-in speech route.';
    }
    if (voicePlaybackEngine === 'browser_fallback') {
      return 'Gemini Voice remains selected, but recent playback fell back to Browser Voice because Gemini audio could not be decoded cleanly.';
    }
    return 'Gemini voice output is active for cloud TTS quality when local Voicebox is not selected.';
  }, [voicePlaybackEngine, voiceRoute]);

  const reasoningStatus = useMemo(() => {
    if (voicePlaybackEngine === 'browser_fallback') {
      return voicePlaybackDetail
        ? `Gemini route with browser fallback (${voicePlaybackDetail})`
        : 'Gemini route with browser fallback active';
    }
    if (!isTauri) {
      return 'Browser runtime using the same-origin Gemini gateway';
    }
    if (localModelReadiness?.status === 'running_ready') return 'Local Ollama kernel ready';
    if (localModelReadiness?.status === 'degraded') return 'Local Ollama kernel degraded';
    return 'Local shell runtime available';
  }, [localModelReadiness, voicePlaybackDetail, voicePlaybackEngine]);

  /** True only while the user is holding PTT (survives re-renders; drives onresult + onend). */
  const pttSessionActiveRef = useRef(false);
  /** Latest transcript for finalize (React state can lag behind onresult). */
  const transcriptRef = useRef('');
  const activeVoiceEngineRef = useRef<SovereignVoiceEngine | BrowserVoiceEngine | null>(null);
  const geminiVoiceEngineRef = useRef<GeminiVoiceEngine | null>(null);
  const activeAgentMessageIdRef = useRef<string | null>(null);
  const pttSessionIdRef = useRef(0);
  const pttSafetyTimeoutRef = useRef<number | null>(null);
  const voiceboxRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceboxRecorderStreamRef = useRef<MediaStream | null>(null);
  const voiceboxRecordingChunksRef = useRef<Blob[]>([]);
  const lastSubmittedVoiceTurnRef = useRef<{ sessionId: number; text: string } | null>(null);
  const beginInteractionRef = useRef(beginInteraction);
  const engageSessionEntryRef = useRef(engageSessionEntry);
  const submitIntentTextRef = useRef(
    async (_userText: string, _source: 'voice' | 'chat', _options?: { appendUserMessage?: boolean }) => {},
  );

  // Voice State
  const [voice, setVoice] = useState('Kore');

  // DISC Profile State
  const [discProfile, setDiscProfile] = useState<DISCProfile>({
    dominance: 5,
    influence: 7,
    steadiness: 6,
    conscientiousness: 8
  });

  /** Focused appearance controls (multi-level menu actions; not full-page dump forms). */
  const [appearanceTune, setAppearanceTune] = useState<
    null | 'overlay_color' | 'overlay_opacity' | 'overlay_width' | 'canvas_padding' | 'live_background'
  >(null);

  // Intent State
  const [agentIntent, setAgentIntent] = useState("");
  const [userIntent, setUserIntent] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("A successful interaction where the user's needs are met efficiently and the agent provides proactive value.");
  const [agentName, setAgentName] = useState("AI OS Assistant");
  const [agentCompany, setAgentCompany] = useState("");
  const [agentRole, setAgentRole] = useState("Assistant");
  const kernelVerbosityLevel: KernelVerbosityLevel =
    kernelState?.current_verbosity_level ?? 'book';
  const { captureFrame, persistMessage } = useTauriKernelBridge({
    activeAgentMessageIdRef,
    latestFrameRef,
    setAgentIntent,
    setMessages,
    setMode,
    setUserIntent,
    workspaceCanvasView: workspaceCanvas?.view,
  });

  useEffect(() => {
    setScaffolding(scaffoldingDensityForVerbosity(kernelVerbosityLevel));
  }, [kernelVerbosityLevel, setScaffolding]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void fetchLocalModelReadiness()
        .then((r) => {
          if (alive) setLocalModelReadiness(r);
        })
        .catch(() => {
          if (alive) setLocalModelReadiness(null);
        });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  const runShellIntentPipeline = useCallback((agentText: string) => {
    const { action, delegateWorkspaceCanvas } = routeShellAgentText(agentText);
    const auth = readInterimShellAuthority();
    const denial = getShellNavigationDenialMessage(action, auth);
    if (denial) {
      logShellCanvasAudit('shell_authority_denied', {
        subsystem: 'shell.shell_state',
        path: 'agent_intent',
        target: action.type === 'set_surface_mode' ? action.mode : undefined,
      });
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'agent',
            text: denial,
            timestamp: new Date(),
          },
        ]);
      }, 400);
      return;
    }

    if (action.type !== 'none') {
      window.setTimeout(() => applyShellNavigationAction(action, shellApplyHandlers), 400);
    }
    if (delegateWorkspaceCanvas) {
      window.setTimeout(() => applyAgentIntent(agentText), 1000);
    }
  }, [applyAgentIntent, shellApplyHandlers]);

  const getGeminiVoiceEngine = useCallback(() => {
    if (!geminiVoiceEngineRef.current) {
      geminiVoiceEngineRef.current = new GeminiVoiceEngine(
        undefined,
        undefined,
        undefined,
        (result: GeminiPlaybackResult) => {
          if (result.actualRoute === 'gemini') {
            setVoicePlaybackEngine('gemini');
            setVoicePlaybackDetail(undefined);
            return;
          }
          setVoicePlaybackEngine('browser_fallback');
          setVoicePlaybackDetail(result.detail);
        },
      );
    }
    return geminiVoiceEngineRef.current;
  }, []);

  const playAudioCue = useCallback(async (cue: ShellAudioCue) => {
    const trimmed = cue.text.trim();
    if (!trimmed) {
      setStatus('connected');
      setTranscription('');
      return;
    }

    stopLandingStartWelcome();
    setLandingIntroPlaying(false);
    setCurrentAudioCue({ ...cue, status: 'playing' });
    setStatus('speaking');
    try {
      if (voiceRoute === 'gemini') {
        const engine = getGeminiVoiceEngine();
        await engine.speak(trimmed, cue.overrideVoice);
      } else {
        setVoicePlaybackEngine(voiceRoute === 'browser' ? 'browser' : 'voicebox');
        setVoicePlaybackDetail(undefined);
        await VoiceboxClient.speak(
          trimmed,
          cue.overrideVoice ?? VoiceboxClient.getActiveProfileId() ?? undefined,
          voiceRoute === 'browser' ? { forceBrowserOnly: true } : undefined,
        );
      }
      setCurrentAudioCue((current) =>
        current?.id === cue.id ? { ...current, status: 'played' } : current,
      );
      setStatus('connected');
      setTranscription('');
    } catch (err) {
      console.error('TTS error:', err);
      setCurrentAudioCue((current) =>
        current?.id === cue.id ? { ...current, status: 'stopped' } : current,
      );
      setStatus('error');
      setTimeout(() => setStatus('connected'), 3000);
    }
  }, [getGeminiVoiceEngine, voiceRoute]);

  const speakText = useCallback(async (
    text: string,
    overrideVoice?: string,
    cueLabel?: string,
    cueSource: ShellAudioCueSource = 'agent',
  ) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus('connected');
      setTranscription('');
      return;
    }

    const cue = buildShellAudioCue(trimmed, overrideVoice, cueLabel, cueSource);
    if (!speakerEnabled) {
      setQueuedAudioCues((current) => [...current, cue]);
      setCurrentAudioCue((current) => current ?? cue);
      return;
    }

    await playAudioCue(cue);
  }, [playAudioCue, speakerEnabled]);

  speakTextRef.current = speakText;

  useEffect(() => {
    if (!authSessionActive) {
      setDesktopWelcomeDismissed(false);
      setDesktopWelcomeOpen(false);
      desktopWelcomeAudioFiredRef.current = false;
    }
  }, [authSessionActive]);

  useEffect(() => {
    if (!authSessionActive || !shellSessionStarted) return;
    if (workspaceCanvas) return;
    if (mode !== 'voice' && mode !== 'chat') return;
    if (desktopWelcomeDismissed) return;
    setDesktopWelcomeOpen(true);
  }, [
    authSessionActive,
    shellSessionStarted,
    workspaceCanvas,
    mode,
    desktopWelcomeDismissed,
  ]);

  useEffect(() => {
    if (!desktopWelcomeOpen) {
      desktopWelcomeAudioFiredRef.current = false;
      return;
    }
    if (desktopWelcomeAudioFiredRef.current) return;
    desktopWelcomeAudioFiredRef.current = true;
    void speakText(DESKTOP_WELCOME_VOICE_SCRIPT, undefined, 'Desktop welcome', 'landing');
  }, [desktopWelcomeOpen, speakText]);

  const handleDesktopWelcomeContinue = useCallback(() => {
    setDesktopWelcomeDismissed(true);
    setDesktopWelcomeOpen(false);
  }, []);

  const stopSpeech = useCallback(() => {
    stopLandingStartWelcome();
    setLandingIntroPlaying(false);
    VoiceboxClient.stop();
    if (geminiVoiceEngineRef.current) {
      void geminiVoiceEngineRef.current.stop();
    }
    setStatus((current) => (current === 'speaking' ? 'connected' : current));
    setCurrentAudioCue((current) => current ? { ...current, status: 'stopped' } : current);
    setTranscription('');
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    setSpeakerEnabled((current) => {
      if (current) {
        stopSpeech();
      }
      return !current;
    });
  }, [stopSpeech]);

  const handleOpenPodcasts = useCallback(() => {
    closeCanvas();
    setMode('podcasts');
  }, [closeCanvas]);

  const handleOpenKnowledgePanel = useCallback((initialTab: 'library' | 'upload' = 'library') => {
    setKnowledgePanelInitialTab(initialTab);
    setMode('knowledge');
  }, []);

  const showVoiceIdleOrientation = isVibePublicShellSurface({
    authSessionActive,
    shellSessionStarted,
    mode,
    workspaceCanvas,
    showDiagnosticsChrome,
    status,
    showLoyaltyIntro,
    currentAudioCue,
    isPTTActive,
    transcription,
    landingWelcomeActive: landingIntroPlaying,
  });

  const shellJourney = useShellJourney({
    authSessionActive,
    shellSessionStarted,
    sessionEntryClassification,
    mode,
    workspaceCanvas,
    showVibeHero: showVoiceIdleOrientation,
    voiceRouteLabel: activeVoiceLabel,
    loyaltyState: promptContract.loyaltyState,
  });

  const handlePlayPauseCue = useCallback(() => {
    const landingPlayback = getLandingWelcomePlayback();
    if (landingIntroPlaying || landingPlayback === 'paused') {
      void handleLandingIntroPlayPause();
      return;
    }
    if (showVoiceIdleOrientation && landingPlayback === 'idle' && status !== 'speaking' && !currentAudioCue?.text?.trim() && queuedAudioCues.length === 0) {
      void handleLandingIntroPlayPause();
      return;
    }

    if (status === 'speaking') {
      stopSpeech();
      return;
    }

    if (!speakerEnabled) {
      setSpeakerEnabled(true);
    }

    const nextQueuedCue = queuedAudioCues[0];
    if (nextQueuedCue) {
      setQueuedAudioCues((current) => current.slice(1));
      void playAudioCue(nextQueuedCue);
      return;
    }

    if (currentAudioCue) {
      void playAudioCue({ ...currentAudioCue, id: `${currentAudioCue.id}_replay_${Date.now()}` });
    }
  }, [
    currentAudioCue,
    handleLandingIntroPlayPause,
    landingIntroPlaying,
    playAudioCue,
    queuedAudioCues,
    showVoiceIdleOrientation,
    speakerEnabled,
    status,
    stopSpeech,
  ]);

  const submitIntentText = useCallback(
    async (
      userText: string,
      source: 'voice' | 'chat',
      options?: { appendUserMessage?: boolean }
    ) => {
      const trimmed = userText.trim();
      if (!trimmed) {
        resetTelemetry();
        setStatus('connected');
        if (source === 'voice') setTranscription('');
        return;
      }

      if (options?.appendUserMessage) {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: trimmed,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        persistMessage(userMsg);
      }

      setStatus('processing');

      try {
        const shellCmd = tryParseShellStateCommand(trimmed);
        if (shellCmd) {
          const nav = shellStateCommandToNavigationAction(shellCmd);
          const applied = tryApplyShellNavigationAction(
            nav,
            readInterimShellAuthority(),
            shellApplyHandlers,
          );
          if (applied.ok === false) {
            const denialText = applied.userMessage;
            logShellCanvasAudit('shell_authority_denied', {
              subsystem: 'shell.shell_state',
              path: source === 'voice' ? 'deterministic_voice' : 'deterministic_chat',
              target: shellCmd.type === 'surface' ? shellCmd.mode : undefined,
            });
            setMessages((prev) => [
              ...prev,
              {
                id: (Date.now() + 1).toString(),
                role: 'agent',
                text: denialText,
                timestamp: new Date(),
              },
            ]);
            setStatus('connected');
            if (source === 'voice') {
              setTranscription('');
              await speakText(denialText);
            }
            resetTelemetry();
            return;
          }
          const ack = shellStateCommandAck(shellCmd);
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: 'agent',
              text: ack,
              timestamp: new Date(),
            },
          ]);
          setStatus('connected');
          if (source === 'voice') setTranscription('');
          resetTelemetry();
          return;
        }

        beginInteraction();
        recordInteraction();
        if (isTauri) {
          try {
            await invoke('process_intent', { intent: trimmed });
          } catch (intentErr) {
            console.warn('[Shell] process_intent unavailable (browser mode or kernel offline):', intentErr);
          }
        }

        const useVibeHostPrompt = shouldUseVibeCodersHostPrompt({
          authSessionActive,
          showVoiceIdleOrientation,
          mode,
        });
        const vibeHostPromptParams = {
          snapshot: shellJourney,
          sessionEntryClassification,
          guestDisplayName: readVibeGuestDisplayName(),
          kernelCurrentIntent: kernelState?.current_intent ?? null,
        };

        const agentMessageId = (Date.now() + 1).toString();
        activeAgentMessageIdRef.current = agentMessageId;

        // ── Visual Grounding: call the same-origin Gemini gateway when a frame is available ──
        const frameBase64 = latestFrameRef.current;
        if (frameBase64 && !useVibeHostPrompt) {
          setMessages((prev) => [
            ...prev,
            { id: agentMessageId, role: 'agent', text: 'Analysing screen…', timestamp: new Date() },
          ]);
          try {
            const systemPrompt = buildGroundedSystemPrompt(
              onboardingProfile?.commander_name ?? null,
              promptContract.promptLines,
              true,
            );
            const groundedText = await geminiGenerateText({
              userText: trimmed,
              model: 'gemini-2.0-flash',
              systemInstruction: systemPrompt,
              maxOutputTokens: 200,
              temperature: 0.5,
              inlineImage: {
                mimeType: 'image/jpeg',
                data: frameBase64,
              },
            });
            if (groundedText) {
              activeAgentMessageIdRef.current = null;
              setMessages((prev) =>
                prev.map((msg) => msg.id === agentMessageId ? { ...msg, text: groundedText } : msg),
              );
              persistMessage({ id: agentMessageId, role: 'agent', text: groundedText, timestamp: new Date() });
              runShellIntentPipeline(groundedText);
              const telemetry = flushTelemetry();
              if (isTauri) {
                try {
                  await invoke('record_outcome', {
                    intent: trimmed,
                    completionTimeMs: telemetry.dwell_to_action_ms,
                    contextRatio: telemetry.context_ratio,
                  });
                } catch { /* non-critical telemetry */ }
              }
              await speakText(groundedText, voice);
              return;
            } else {
              // Gemini returned an empty response — fall through to Ollama
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === agentMessageId
                    ? { ...msg, text: 'No response from Gemini — switching to local model.' }
                    : msg,
                ),
              );
            }
          } catch (geminiErr) {
            logGeminiGatewayFallback('Visual grounding', geminiErr);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? { ...msg, text: 'Screen analysis unavailable — switching to text response.' }
                  : msg,
              ),
            );
          }
        } else if (frameBase64 && useVibeHostPrompt) {
          setMessages((prev) => [
            ...prev,
            { id: agentMessageId, role: 'agent', text: 'Looking at your screen…', timestamp: new Date() },
          ]);
          try {
            const systemPrompt = buildVibeCodersScreenBuddyPrompt(
              shellJourney,
              readVibeGuestDisplayName(),
              kernelState?.current_intent ?? null,
            );
            const groundedText = await geminiGenerateText({
              userText: trimmed,
              model: 'gemini-2.0-flash',
              systemInstruction: systemPrompt,
              maxOutputTokens: 200,
              temperature: 0.55,
              inlineImage: {
                mimeType: 'image/jpeg',
                data: frameBase64,
              },
            });
            if (groundedText) {
              activeAgentMessageIdRef.current = null;
              setMessages((prev) =>
                prev.map((msg) => msg.id === agentMessageId ? { ...msg, text: groundedText } : msg),
              );
              persistMessage({ id: agentMessageId, role: 'agent', text: groundedText, timestamp: new Date() });
              runShellIntentPipeline(groundedText);
              resetTelemetry();
              await speakText(groundedText, voice);
              return;
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? { ...msg, text: 'No response from Gemini — switching to local model.' }
                  : msg,
              ),
            );
          } catch (geminiErr) {
            logGeminiGatewayFallback('Vibe screen buddy', geminiErr);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? { ...msg, text: 'Screen peek unavailable — try again in a moment.' }
                  : msg,
              ),
            );
          }
        } else {
          // No frame available — run text-only Gemini through the same-origin gateway
          setMessages((prev) => [
            ...prev,
            { id: agentMessageId, role: 'agent', text: 'Thinking…', timestamp: new Date() },
          ]);
          try {
            const systemPrompt = useVibeHostPrompt
              ? buildVibeCodersHostSystemPrompt(vibeHostPromptParams)
              : buildGroundedSystemPrompt(
                  onboardingProfile?.commander_name ?? null,
                  promptContract.promptLines,
                  false,
                );
            const groundedText = await geminiGenerateText({
              userText: trimmed,
              model: 'gemini-2.0-flash',
              systemInstruction: systemPrompt,
              maxOutputTokens: 200,
              temperature: 0.5,
            });
            if (groundedText) {
              activeAgentMessageIdRef.current = null;
              setMessages((prev) =>
                prev.map((msg) => msg.id === agentMessageId ? { ...msg, text: groundedText } : msg),
              );
              persistMessage({ id: agentMessageId, role: 'agent', text: groundedText, timestamp: new Date() });
              runShellIntentPipeline(groundedText);
              resetTelemetry();
              await speakText(groundedText, voice);
              return;
            } else {
              // Empty response — fall through to Ollama
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === agentMessageId
                    ? { ...msg, text: 'No response from Gemini — switching to local model.' }
                    : msg,
                ),
              );
            }
          } catch (geminiTextErr) {
            logGeminiGatewayFallback('Text-only', geminiTextErr);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? { ...msg, text: 'Cloud response unavailable — switching to local model.' }
                  : msg,
              ),
            );
          }
        }

        // ── Fallback: local Ollama kernel ──
        if (!isTauri) {
          // In browser mode without the local desktop kernel, explain the missing gateway/local fallback.
          activeAgentMessageIdRef.current = null;
          const browserMsg =
            'Cloud response unavailable. Configure GEMINI_API_KEY on the app host, or open the Tauri desktop app for the local kernel.';
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== agentMessageId),
            { id: (Date.now() + 1).toString(), role: 'agent', text: browserMsg, timestamp: new Date() },
          ]);
          setStatus('connected');
          if (source === 'voice') setTranscription('');
          resetTelemetry();
          return;
        }

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== agentMessageId),
          { id: agentMessageId, role: 'agent', text: 'Thinking with local Ollama kernel...', timestamp: new Date() },
        ]);

        console.log(`${source === 'voice' ? 'Voice' : 'Chat'} submit to Rust kernel:`, trimmed);
        let kernelResponse: string;
        try {
          if (!isTauri) {
            console.warn('Browser Mode: Tauri invoke not available, gracefully degrading.');
            activeAgentMessageIdRef.current = null;
            setMessages((prev) => [
              ...prev.filter((m) => m.id !== agentMessageId),
              { id: (Date.now() + 1).toString(), role: 'agent', text: 'Browser mode: Tauri kernel not available. Running in UI development mode.', timestamp: new Date() },
            ]);
            setStatus('connected');
            if (source === 'voice') setTranscription('');
            resetTelemetry();
            return;
          }

          kernelResponse = await invoke<string>('execute_blind_action', {
            intentText: trimmed,
            systemPrompt: useVibeHostPrompt
              ? buildVibeCodersHostSystemPrompt(vibeHostPromptParams)
              : buildSystemPrompt({
                  agentName,
                  agentRole,
                  agentIntent,
                  userIntent,
                  desiredOutcome,
                  discProfile,
                  source,
                  commanderName,
                  loyaltyPromptLines: promptContract.promptLines,
                  fileContext: importedFiles.length > 0 ? importedFiles : undefined,
                }),
          });
        } catch (ollamaErr) {
          console.warn('[Ollama] execute_blind_action failed:', ollamaErr);
          activeAgentMessageIdRef.current = null;
          const offlineMsg = 'Local model is offline. Start Ollama (`ollama serve`) and pull a model to enable local responses.';
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== agentMessageId),
            { id: (Date.now() + 1).toString(), role: 'agent', text: offlineMsg, timestamp: new Date() },
          ]);
          setStatus('connected');
          if (source === 'voice') setTranscription('');
          resetTelemetry();
          return;
        }
        let resolvedResponse = kernelResponse.trim();
        activeAgentMessageIdRef.current = null;

        // Tool-call parsing: handle {"tool":"read_file","path":"..."} etc.
        const toolCallMatch = resolvedResponse.match(/\{"tool":"(\w+)"[^}]*\}/);
        if (toolCallMatch) {
          try {
            const toolCall = JSON.parse(toolCallMatch[0]) as { tool: string; path?: string };
            let toolResult = '';
            if (toolCall.tool === 'read_file' && toolCall.path) {
              toolResult = await invoke<string>('read_file', { path: toolCall.path });
            } else if (toolCall.tool === 'list_directory' && toolCall.path) {
              const entries = await invoke<Array<{ name: string; is_dir: boolean; size_bytes: number | null }>>(
                'list_directory',
                { path: toolCall.path }
              );
              toolResult = entries
                .map((e) => `${e.is_dir ? '[DIR]' : '[FILE]'} ${e.name}${e.size_bytes != null ? ' (' + e.size_bytes + ' bytes)' : ''}`)
                .join('\n');
            } else if (toolCall.tool === 'pick_file') {
              const picked = await invoke<[string, string] | null>('pick_file');
              if (picked) {
                const [pickedPath, content] = picked;
                const name = pickedPath.split('\\').join('/').split('/').filter(Boolean).pop() ?? pickedPath;
                setImportedFiles((prev) => [...prev.filter((f) => f.name !== name), { name, content }]);
                toolResult = content;
              } else {
                toolResult = '(no file selected)';
              }
            } else if (toolCall.tool === 'trigger_account_creation') {
              setMode('create_account');
              toolResult = 'Account creation UI has been displayed to the user.';
            }
            if (toolResult) {
              // Re-invoke with the file result appended
              try {
                const followUp = await invoke<string>('execute_blind_action', {
                  intentText: `Tool result for ${toolCallMatch[0]}: ${toolResult.slice(0, 4000)}`,
                  systemPrompt: useVibeHostPrompt
                    ? buildVibeCodersHostSystemPrompt(vibeHostPromptParams)
                    : buildSystemPrompt({
                        agentName, agentRole, agentIntent, userIntent, desiredOutcome, discProfile, source,
                        commanderName,
                        loyaltyPromptLines: promptContract.promptLines,
                      }),
                });
                resolvedResponse = followUp.trim() || resolvedResponse;
              } catch (followUpErr) {
                console.warn('[Ollama] follow-up execute_blind_action failed:', followUpErr);
              }
            }
          } catch (toolErr) {
            console.warn('Tool-call execution failed:', toolErr);
          }
        }

        if (resolvedResponse) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? {
                    ...msg,
                    text: resolvedResponse,
                  }
                : msg,
            ),
          );
          // Persist the completed agent message (not during streaming — only final text)
          persistMessage({
            id: agentMessageId,
            role: 'agent',
            text: resolvedResponse,
            timestamp: new Date(),
          });
          runShellIntentPipeline(resolvedResponse);
          const telemetry = flushTelemetry();
          if (isTauri) {
            try {
              await invoke('record_outcome', {
                intent: trimmed,
                completionTimeMs: telemetry.dwell_to_action_ms,
                contextRatio: telemetry.context_ratio,
              });
            } catch { /* non-critical telemetry */ }
          }
          await speakText(resolvedResponse, voice);
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === agentMessageId
                ? {
                    ...msg,
                    text: 'Local kernel returned an empty response.',
                  }
                : msg,
            ),
          );
          setStatus('connected');
          resetTelemetry();
        }
      } catch (err) {
        resetTelemetry();
        activeAgentMessageIdRef.current = null;
        console.error('Kernel execution failed:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        const isIpcError = errMsg.includes('window not found') || errMsg.includes('IPC') || errMsg.includes('not found');
        const errorText = (!isTauri || isIpcError)
          ? 'Running in browser mode. Configure GEMINI_API_KEY on the app host for cloud responses, or open the Tauri desktop app for full local model support.'
          : source === 'voice'
            ? "I'm sorry, the local kernel encountered an error. Make sure Ollama is running (`ollama serve`) with a model like llama3.2 pulled."
            : 'Kernel error on chat. Ensure Ollama is running with a model loaded.';
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'agent',
            text: errorText,
            timestamp: new Date(),
          },
        ]);
        setStatus('connected');
        if (source === 'voice') setTranscription('');
      } finally {
        // Safety net: always restore status and clear transcription in case an inner path exits
        // without resetting (e.g. an unexpected throw inside a catch block).
        setStatus((prev) => prev === 'processing' ? 'connected' : prev);
        if (source === 'voice') setTranscription((prev) => prev === 'Listening...' ? '' : prev);
      }
    },
    [
      beginInteraction,
      flushTelemetry,
      recordInteraction,
      resetTelemetry,
      runShellIntentPipeline,
      shellApplyHandlers,
      speakText,
      voice,
      agentName,
      agentRole,
      agentIntent,
      userIntent,
      desiredOutcome,
      discProfile,
      commanderName,
      promptContract,
      authSessionActive,
      shellSessionStarted,
      mode,
      workspaceCanvas,
      showDiagnosticsChrome,
      status,
      showLoyaltyIntro,
      currentAudioCue,
      isPTTActive,
      transcription,
      onboardingProfile,
      importedFiles,
      landingIntroPlaying,
      shellJourney,
      showVoiceIdleOrientation,
      sessionEntryClassification,
      kernelState,
    ],
  );

  const handleExplainVibeTopic = useCallback(
    (topic: VibeTopicId) => {
      engageSessionEntry();
      const script = VIBE_TOPIC_SCRIPTED_RESPONSES[topic];
      const userLine = vibeTopicUserPromptLine(topic);
      const baseId = `${Date.now()}_${topic}`;
      setMessages((prev) => [
        ...prev,
        { id: `u_${baseId}`, role: 'user', text: userLine, timestamp: new Date() },
        { id: `a_${baseId}`, role: 'agent', text: script, timestamp: new Date() },
      ]);
      const topicCue: Record<VibeTopicId, string> = {
        university: 'University',
        community: 'Community',
        coding_platform: 'Coding platform',
      };
      void speakText(script, undefined, `About ${topicCue[topic]}`, 'onboarding');
    },
    [engageSessionEntry, speakText],
  );

  submitIntentTextRef.current = submitIntentText;
  beginInteractionRef.current = beginInteraction;
  engageSessionEntryRef.current = engageSessionEntry;

  useEffect(() => {
    // Choose voice engine based on environment
    // Tauri desktop: SovereignVoiceEngine (Rust kernel + Whisper)
    // Browser: BrowserVoiceEngine (Web Speech API)
    const EngineClass = isTauri ? SovereignVoiceEngine : BrowserVoiceEngine;
    
    const engine = new EngineClass(
      (nextStatus) => {
        setStatus(nextStatus);
      },
      (text, isFinal) => {
        const trimmed = text.trim();
        if (trimmed === LOCAL_STT_PLACEHOLDER) {
          setStatus('connected');
          setTranscription('Local STT placeholder active. Real transcription is not enabled yet.');
          return;
        }
        transcriptRef.current = trimmed;
        setTranscription(trimmed);
        if (!isFinal) return;
        if (!trimmed || trimmed === "I didn't catch that. Could you repeat?") {
          setStatus('connected');
          setTranscription('');
          return;
        }
        const normalized = trimmed.replace(/\s+/g, ' ').trim().toLowerCase();
        const currentSessionId = pttSessionIdRef.current;
        if (
          lastSubmittedVoiceTurnRef.current?.sessionId === currentSessionId &&
          lastSubmittedVoiceTurnRef.current.text === normalized
        ) {
          console.warn('[Voice] Ignoring duplicate final transcript for current PTT session');
          return;
        }
        lastSubmittedVoiceTurnRef.current = { sessionId: currentSessionId, text: normalized };
        beginInteractionRef.current();
        engageSessionEntryRef.current();
        void submitIntentTextRef.current(trimmed, 'voice', { appendUserMessage: true });
      },
    );

    activeVoiceEngineRef.current = engine;
    console.log(`Voice engine initialized: ${isTauri ? 'SovereignVoiceEngine (Tauri)' : 'BrowserVoiceEngine (Web Speech API)'}`);
    
    return () => {
      activeVoiceEngineRef.current = null;
      engine.cleanup();
    };
  }, []);

  /** Open the native file picker, read the chosen file, and inject it into context. */
  const handleImportFile = async () => {
    try {
      const result = await invoke<[string, string] | null>('pick_file');
      if (!result) return; // user cancelled
      const [filePath, content] = result;
      const name = filePath.split('\\').join('/').split('/').filter(Boolean).pop() ?? filePath;
      setImportedFiles((prev) => {
        // Replace if same name, otherwise append
        const filtered = prev.filter((f) => f.name !== name);
        return [...filtered, { name, content }];
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'agent',
          text: `File imported: ${name}. I now have its contents in context — ask me anything about it.`,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('File import failed:', err);
    }
  };

  const activateVoiceboxProfile = useCallback(async (newVoiceId: string) => {
    setVoice(newVoiceId);
    await VoiceboxClient.setActiveProfile(newVoiceId);
    const confirmationText = `Voice profile set. How does this sound?`;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'agent',
      text: confirmationText,
      timestamp: new Date()
    }]);
    await speakText(confirmationText, newVoiceId);
  }, [speakText]);

  const handleDISCChange = (key: keyof DISCProfile, value: number) => {
    setDiscProfile(prev => ({ ...prev, [key]: value }));
  };

  const startVoiceboxRecordCaptureSession = useCallback(
    async (sessionId: number) => {
      const activeProfileId = shellMenuStore.recording.active_profile_id;
      const referenceText = shellMenuStore.recording.selected_prompt_text;
      if (!activeProfileId) {
        pttSessionActiveRef.current = false;
        setIsPTTActive(false);
        setStatus('connected');
        setTranscription('');
        setShellMenuRecordingState((recording) => ({
          ...recording,
          capture_status: 'error',
          capture_chunks: [],
          last_error: 'Select a profile before recording.',
          ptt_binding_enabled: false,
        }));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1 },
        });
        const recorder = new MediaRecorder(stream);
        voiceboxRecorderStreamRef.current = stream;
        voiceboxRecorderRef.current = recorder;
        voiceboxRecordingChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size === 0) {
            return;
          }
          voiceboxRecordingChunksRef.current = [...voiceboxRecordingChunksRef.current, event.data];
          setShellMenuRecordingState((recording) => ({
            ...recording,
            capture_chunks: [...recording.capture_chunks, event.data],
          }));
        };

        recorder.onstop = async () => {
          voiceboxRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
          voiceboxRecorderStreamRef.current = null;
          voiceboxRecorderRef.current = null;
          setStatus('processing');
          setTranscription('');

          setShellMenuRecordingState((recording) => ({
            ...recording,
            capture_status: 'saving',
          }));

          try {
            const chunks = voiceboxRecordingChunksRef.current;
            if (chunks.length === 0) {
              throw new Error('No audio captured. Hold the button longer.');
            }

            const blob = new Blob(chunks, { type: recorder.mimeType });
            const arrayBuffer = await blob.arrayBuffer();
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass({ sampleRate: 16000 });
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            const pcmData = audioBuffer.getChannelData(0);
            const wavBytes = VoiceboxClient.encodeWav(pcmData, 16000);
            await VoiceboxClient.addSample(activeProfileId, wavBytes, referenceText);
            await audioCtx.close();

            // Intent Ingestion Hookup
            const payload = intentIngestionController.completeIntentIngestionCapture({
              id: `capture_${Date.now()}`,
              transcript: referenceText,
              duration_ms: chunks.length * 250,
            });
            const baseline = intentIngestionController.bindIntentToProjectBaseline(payload);
            const handoff = intentIngestionController.buildIntentReviewHandoff(payload, baseline);

            // No mock scanner evidence: real project files are not attached to this voice capture.
            const shortcutReport = await heuristicShortcutScanner.scanProject(baseline, {});
            handoff.shortcut_report = shortcutReport;

            // Map shortcut report to triggers
            const triggers: ShortcutTrigger[] = [];
            if (shortcutReport.ui_fragility.length > 0) triggers.push('ui_fragility');
            if (shortcutReport.mock_data_hallucinations.length > 0) triggers.push('mock_data_hallucinations');
            if (shortcutReport.repeated_code.length > 0) triggers.push('repeated_code');
            if (shortcutReport.suppressed_exceptions.length > 0) triggers.push('suppressed_exceptions');

            // Retrieve educational lessons
            const lessons = await knowledgeRetrievalService.getLessonsForShortcuts(triggers);
            handoff.educational_lessons = lessons;

            let mvp_success_probability: number | null = null;
            let probability_disclosed: boolean | null = null;
            try {
              const { sovereignAgentService } = await import('./shell/SovereignAgentService');
              const analysis = await sovereignAgentService.analyzeIntent(handoff);
              if (analysis.confidence_score !== undefined && analysis.confidence_score !== null) {
                mvp_success_probability = Math.round(analysis.confidence_score * 100);
              }
              probability_disclosed = analysis.probability_disclosed;
            } catch (e) {
              console.error('Failed to get sovereign analysis:', e);
            }

            setShellMenuStore((prev) => ({
              ...prev,
              intent_ingestion: {
                ...prev.intent_ingestion,
                status: 'handoff_ready',
                current_payload: payload,
                active_baseline: baseline,
                pending_review: handoff,
                last_error: null,
                mvp_success_probability,
                probability_disclosed,
              },
              revision: prev.revision + 1,
            }));

            setShellMenuRecordingState((recording) => {
              const nextCount = (recording.sample_count_by_profile_id[activeProfileId] ?? 0) + 1;
              return {
                ...recording,
                sample_count_by_profile_id: {
                  ...recording.sample_count_by_profile_id,
                  [activeProfileId]: nextCount,
                },
                selected_prompt_text: voiceboxPromptForCount(nextCount),
                capture_status: 'saved',
                capture_chunks: [],
                last_saved_profile_id: activeProfileId,
                last_saved_sample_at: new Date().toISOString(),
                last_error: null,
                ptt_binding_enabled: true,
                session_id: sessionId,
              };
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setShellMenuRecordingState((recording) => ({
              ...recording,
              capture_status: 'error',
              capture_chunks: [],
              last_error: message,
              ptt_binding_enabled: true,
            }));
          } finally {
            voiceboxRecordingChunksRef.current = [];
            setStatus('connected');
          }
        };

        setShellMenuRecordingState((recording) => ({
          ...recording,
          capture_status: 'recording',
          capture_chunks: [],
          last_error: null,
          ptt_binding_enabled: true,
          session_id: sessionId,
        }));
        setStatus('listening');
        setTranscription('Recording sample...');
        recorder.start(250);
      } catch (error) {
        voiceboxRecorderStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceboxRecorderStreamRef.current = null;
        voiceboxRecorderRef.current = null;
        voiceboxRecordingChunksRef.current = [];
        pttSessionActiveRef.current = false;
        setIsPTTActive(false);
        setStatus('connected');
        setTranscription('');
        setShellMenuRecordingState((recording) => ({
          ...recording,
          capture_status: 'error',
          capture_chunks: [],
          last_error: error instanceof Error ? error.message : 'Microphone access denied.',
          ptt_binding_enabled: Boolean(recording.active_profile_id),
        }));
      }
    },
    [
      setShellMenuStore,
      setShellMenuRecordingState,
      shellMenuStore.recording.active_profile_id,
      shellMenuStore.recording.selected_prompt_text,
    ],
  );

  const startPTTSession = useCallback(async () => {
    if (!micEnabled) {
      setStatus('connected');
      return;
    }
    if (pttSessionActiveRef.current) return;
    const engine = activeVoiceEngineRef.current;
    if (!engine) {
      setStatus("error");
      return;
    }

    try {
      // Barge-in: user pressed mic while AI was still speaking
      const bargein = VoiceboxClient.checkAndClearBargein();
      if (bargein) {
        recordBargein({
          completion_pct: bargein.completionPct,
          elapsed_ms: bargein.elapsedMs,
          disc_signal: bargein.discSignal,
        });
        console.log(
          `[Barge-in] completionPct=${(bargein.completionPct * 100).toFixed(0)}% signal=${bargein.discSignal}`
        );
      }

      beginInteraction();
      recordInteraction();
      captureFrame(); // Snap the current UI before the user speaks — feeds Visual Grounding.
      setIsPTTActive(true);
      pttSessionActiveRef.current = true;
      pttSessionIdRef.current += 1;
      const currentSessionId = pttSessionIdRef.current;

      // Safety timeout: auto-reset if stuck for more than 30 seconds
      if (pttSafetyTimeoutRef.current) {
        window.clearTimeout(pttSafetyTimeoutRef.current);
      }
      pttSafetyTimeoutRef.current = window.setTimeout(() => {
        if (pttSessionActiveRef.current) {
          console.warn('[PTT Safety] Session stuck - auto-resetting');
          pttSessionActiveRef.current = false;
          setIsPTTActive(false);
          setTranscription('');
          setStatus('connected');
        }
      }, 30000);

      if (
        (
          shellMenuStore.ui.active_menu_id === 'voice-box' &&
          shellMenuStore.ui.selected_action_id_by_menu_id['voice-box'] === 'open_voicebox_record' &&
          shellMenuStore.recording.ptt_binding_enabled
        ) ||
        voiceboxRecorderRef.current
      ) {
        await startVoiceboxRecordCaptureSession(currentSessionId);
        return;
      }

      transcriptRef.current = '';
      lastSubmittedVoiceTurnRef.current = null;
      setTranscription('Listening...');
      await engine.startListening();
    } catch (err) {
      console.error('Sovereign voice start failed:', err);
      
      // Clear safety timeout
      if (pttSafetyTimeoutRef.current) {
        window.clearTimeout(pttSafetyTimeoutRef.current);
        pttSafetyTimeoutRef.current = null;
      }
      
      pttSessionActiveRef.current = false;
      setIsPTTActive(false);
      setTranscription('');
      setStatus('connected');
      
      // Show user-friendly error message
      const errorMsg = err instanceof Error ? err.message : 'Voice recognition unavailable';
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'agent',
            text: errorMsg,
            timestamp: new Date(),
          },
        ]);
      }, 400);
    }
  }, [
    beginInteraction,
    captureFrame,
    micEnabled,
    recordInteraction,
    recordBargein,
    shellMenuStore.recording.ptt_binding_enabled,
    shellMenuStore.ui.active_menu_id,
    shellMenuStore.ui.selected_action_id_by_menu_id,
    startVoiceboxRecordCaptureSession,
  ]);

  const handlePTTDown = async (e: PointerEvent<HTMLButtonElement>) => {
    // Primary button only (mouse); touch/pen use button id 0
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    try {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (capErr) {
        console.warn('Pointer capture unavailable (PTT still works):', capErr);
      }
      await startPTTSession();
    } catch {
      /* pointer capture only */
    }
  };

  const stopPTTSession = useCallback(async () => {
    if (!pttSessionActiveRef.current) return;
    const sessionId = pttSessionIdRef.current;
    pttSessionActiveRef.current = false;
    setIsPTTActive(false);

    // Clear safety timeout
    if (pttSafetyTimeoutRef.current) {
      window.clearTimeout(pttSafetyTimeoutRef.current);
      pttSafetyTimeoutRef.current = null;
    }

    if (voiceboxRecorderRef.current) {
      setStatus('processing');
      setTranscription('Saving sample...');
      if (voiceboxRecorderRef.current.state !== 'inactive') {
        voiceboxRecorderRef.current.stop();
      }
      return;
    }

    // Give the PCM pipeline a brief cushion before finalize on release.
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    if (pttSessionIdRef.current !== sessionId) return;

    try {
      await activeVoiceEngineRef.current?.stopListening();
    } catch (err) {
      console.error('Sovereign voice stop failed:', err);
      setStatus('connected');
      setTranscription('');
    }
  }, []);

  const handleToggleMic = useCallback(() => {
    setMicEnabled((current) => {
      if (current && pttSessionActiveRef.current) {
        void stopPTTSession();
      }
      return !current;
    });
  }, [stopPTTSession]);

  const handlePTTUp = async (e: PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* not capturing */
    }
    await stopPTTSession();
  };

  useEffect(() => {
    const handleWindowPointerRelease = () => {
      void stopPTTSession();
    };
    const handleWindowMouseRelease = () => {
      void stopPTTSession();
    };
    const handleWindowTouchRelease = () => {
      void stopPTTSession();
    };

    window.addEventListener('pointerup', handleWindowPointerRelease);
    window.addEventListener('pointercancel', handleWindowPointerRelease);
    window.addEventListener('mouseup', handleWindowMouseRelease);
    window.addEventListener('touchend', handleWindowTouchRelease);
    window.addEventListener('touchcancel', handleWindowTouchRelease);
    return () => {
      window.removeEventListener('pointerup', handleWindowPointerRelease);
      window.removeEventListener('pointercancel', handleWindowPointerRelease);
      window.removeEventListener('mouseup', handleWindowMouseRelease);
      window.removeEventListener('touchend', handleWindowTouchRelease);
      window.removeEventListener('touchcancel', handleWindowTouchRelease);
    };
  }, [stopPTTSession]);

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatPermitted) return;
    if (!chatInput.trim()) return;

    beginInteraction();
    recordInteraction();
    engageSessionEntry();
    const userText = chatInput;
    setChatInput("");
    
    // Intent Ingestion Hookup for Chat
    const payload = intentIngestionController.completeIntentIngestionCapture({
      id: `capture_${Date.now()}`,
      transcript: userText,
      duration_ms: 0,
    });
    const baseline = intentIngestionController.bindIntentToProjectBaseline(payload);
    const handoff = intentIngestionController.buildIntentReviewHandoff(payload, baseline);

    // No mock scanner evidence: real project files are not attached to this chat capture.
    const shortcutReport = await heuristicShortcutScanner.scanProject(baseline, {});
    handoff.shortcut_report = shortcutReport;

    // Map shortcut report to triggers
    const triggers: ShortcutTrigger[] = [];
    if (shortcutReport.ui_fragility.length > 0) triggers.push('ui_fragility');
    if (shortcutReport.mock_data_hallucinations.length > 0) triggers.push('mock_data_hallucinations');
    if (shortcutReport.repeated_code.length > 0) triggers.push('repeated_code');
    if (shortcutReport.suppressed_exceptions.length > 0) triggers.push('suppressed_exceptions');

    // Retrieve educational lessons
    const lessons = await knowledgeRetrievalService.getLessonsForShortcuts(triggers);
    handoff.educational_lessons = lessons;

    let mvp_success_probability: number | null = null;
    let probability_disclosed: boolean | null = null;
    try {
      const { sovereignAgentService } = await import('./shell/SovereignAgentService');
      const analysis = await sovereignAgentService.analyzeIntent(handoff);
      if (analysis.confidence_score !== undefined && analysis.confidence_score !== null) {
        mvp_success_probability = Math.round(analysis.confidence_score * 100);
      }
      probability_disclosed = analysis.probability_disclosed;
    } catch (e) {
      console.error('Failed to get sovereign analysis:', e);
    }

    setShellMenuStore((prev) => ({
      ...prev,
      intent_ingestion: {
        ...prev.intent_ingestion,
        status: 'handoff_ready',
        current_payload: payload,
        active_baseline: baseline,
        pending_review: handoff,
        last_error: null,
        mvp_success_probability,
        probability_disclosed,
      },
      revision: prev.revision + 1,
    }));
  };

  const workspaceSurfaceOpen =
    workspaceCanvas?.view === 'workspace_hub' ||
    workspaceCanvas?.view === 'workspace_onboarding' ||
    workspaceCanvas?.view === 'workspace_calendar_hub' ||
    workspaceCanvas?.view === 'workspace_mail_hub' ||
    workspaceCanvas?.view === 'workspace_drive_hub' ||
    workspaceCanvas?.view === 'workspace_contacts_hub' ||
    workspaceCanvas?.view === 'workspace_search_hub';

  const statusDisplay =
    status === 'connected' ? 'ready' : status === 'offline' ? 'offline' : status;

  const loyaltyBadgeLabel = useMemo(
    () => (promptContract.loyaltyState === 'user_first' ? 'User Loyalty' : 'Platform Loyalty'),
    [promptContract.loyaltyState],
  );

  const shellHeaderSubtitle = useMemo(() => {
    if (landingIntroPlaying) {
      return 'Public welcome audio · landing-welcome.wav';
    }
    if (!speakerEnabled && queuedAudioCues.length > 0) {
      return 'Speaker muted · Cue ready';
    }

    switch (status) {
      case 'listening':
        return micEnabled ? 'Mic live' : 'Mic muted';
      case 'processing':
        return 'Thinking';
      case 'speaking':
        return currentAudioCue?.label ?? (
          voicePlaybackEngine === 'browser_fallback' ? 'Browser fallback playing' : 'Playing reply'
        );
      case 'error':
        return 'Voice error';
      case 'offline':
        return 'Voice offline';
      case 'connected':
      default:
        if (!speakerEnabled) {
          return 'Speaker muted';
        }
        if (currentAudioCue?.status === 'queued') {
          return `${currentAudioCue.label} · Queued`;
        }
        if (currentAudioCue?.status === 'played') {
          return `${currentAudioCue.label} · Ready to replay`;
        }
        if (voicePlaybackEngine === 'browser_fallback') {
          return 'Browser fallback active';
        }
        return micEnabled ? '' : 'Mic muted';
    }
  }, [currentAudioCue, landingIntroPlaying, micEnabled, queuedAudioCues.length, speakerEnabled, status, voicePlaybackEngine]);

  const shellIdentityCueLabel = landingIntroPlaying
    ? 'Public welcome audio · landing-welcome.wav'
    : currentAudioCue?.label;

  const shellIdentityAudioCues = useMemo(() => {
    const welcomeLabel = 'Public welcome audio · landing-welcome.wav';
    const base = [
      ...(currentAudioCue ? [{ id: currentAudioCue.id, label: currentAudioCue.label, status: currentAudioCue.status }] : []),
      ...queuedAudioCues.map((cue) => ({ id: cue.id, label: cue.label, status: cue.status })),
    ];
    if (landingIntroPlaying) {
      return [{ id: 'landing_welcome_public', label: welcomeLabel, status: 'playing' as const }, ...base];
    }
    return base;
  }, [currentAudioCue, queuedAudioCues, landingIntroPlaying]);

  const displayStatusDetail = useMemo(() => {
    if (showDiagnosticsChrome) return undefined;
    if (landingIntroPlaying) {
      return 'Welcome audio playing';
    }
    if (mode === 'chat') {
      if (kernelVerbosityLevel === 'start_button') return undefined;
      if (kernelVerbosityLevel === 'sentence') return 'Type to send';
      return 'Type below to send';
    }
    if (!micEnabled) {
      return 'Mic off';
    }
    if (!speakerEnabled && queuedAudioCues.length > 0) {
      return `${queuedAudioCues.length} cue${queuedAudioCues.length === 1 ? '' : 's'} waiting`;
    }
    if (!workspaceCanvas && mode === 'voice' && status === 'connected') {
      if (kernelVerbosityLevel === 'start_button') return undefined;
      if (kernelVerbosityLevel === 'sentence') return 'Speak';
      if (kernelVerbosityLevel === 'paragraph') return 'Speak or type';
      return undefined;
    }
    switch (status) {
      case 'offline':
        return 'Speech not available — use Chat';
      case 'connected':
        if (kernelVerbosityLevel === 'start_button') return undefined;
        if (kernelVerbosityLevel === 'sentence') return 'Speak';
        return 'Hold to speak';
      case 'listening':
        return 'Release when finished';
      case 'processing':
        return 'Assistant is working';
      case 'speaking':
        return currentAudioCue?.label ?? 'Playing reply';
      case 'error':
        return 'Try again or use Chat';
      default:
        return undefined;
    }
  }, [currentAudioCue, kernelVerbosityLevel, landingIntroPlaying, micEnabled, mode, queuedAudioCues.length, showDiagnosticsChrome, speakerEnabled, status, workspaceCanvas]);

  const shellTheme = useMemo<ShellGlassTheme>(
    () => ({
      chromeClassName: 'bg-[var(--panel-bg)] backdrop-blur-md',
      panelClassName: 'border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[0_24px_80px_-24px_rgba(15,23,42,0.85)]',
      accentBadgeClassName: 'border border-[var(--panel-accent-border)] bg-[var(--panel-accent-bg)] text-[var(--panel-accent-text)]',
      textClassName: 'text-[var(--panel-text)]',
      mutedTextClassName: 'text-[var(--panel-text-muted)]',
      statusOkClassName: 'text-[var(--panel-accent-text)]',
      statusMutedClassName: 'text-[var(--panel-text-muted)]',
      statusErrorClassName: 'text-rose-300',
      inputClassName: 'border border-[var(--panel-input-border)] bg-[var(--panel-input-bg)] text-[var(--panel-text)] placeholder:text-[var(--panel-text-muted)] backdrop-blur-md',
      primaryButtonClassName: 'border border-[var(--panel-accent-border)] bg-[var(--panel-accent-bg)] text-[var(--panel-accent-text)] backdrop-blur-md hover:opacity-90',
      secondaryButtonClassName: 'border border-[var(--panel-border)] bg-[var(--panel-surface)] text-[var(--panel-text)] backdrop-blur-md hover:opacity-90',
    }),
    [],
  );

  const kernelAllowsComponent = useCallback(
    (component: string, fallback = true) => {
      if (!kernelState) return fallback;
      if (kernelState.permitted_ui_components.length === 0) return fallback;
      return kernelPermits(kernelState, component);
    },
    [kernelState],
  );

  const chatPermitted = kernelAllowsComponent('chat_input');
  const voicePttPermitted = kernelAllowsComponent('voice_ptt');
  const headerMenuPermitted = kernelAllowsComponent('shell_header_menu');
  /** Guest landing always shows governed header menus; authenticated still follows kernel contract. */
  const headerMenuChromeAllowed = !authSessionActive || headerMenuPermitted;
  const footerMenuPermitted = kernelAllowsComponent('shell_footer_user_menu');

  const shellMenuRegistry = useMemo<Record<ShellMenuId, ShellMenuRegistryEntry>>(() => {
    const headerSystemMenu =
      authoritativeMenuRegistry['shell-header-system'] ?? CENTRAL_SHELL_MENU_REGISTRY['shell-header-system'];
    const footerUserMenu =
      authoritativeMenuRegistry['shell-footer-user'] ?? CENTRAL_SHELL_MENU_REGISTRY['shell-footer-user'];
    const systemControlsMenu =
      authoritativeMenuRegistry['system-controls'] ?? CENTRAL_SHELL_MENU_REGISTRY['system-controls'];

    let merged: Record<ShellMenuId, ShellMenuRegistryEntry> = {
      ...CENTRAL_SHELL_MENU_REGISTRY,
      ...authoritativeMenuRegistry,
      'shell-header-system': {
        ...headerSystemMenu,
        record: {
          ...headerSystemMenu.record,
          levels: headerSystemMenu.record.levels.map((level) => ({
            ...level,
            items: level.items.map((item) =>
              item.action_id === 'open_api_health'
                ? { ...item, disabled: !showDiagnosticsChrome }
                : item,
            ),
          })),
        },
      },
      'shell-footer-user': {
        ...footerUserMenu,
        record: {
          ...footerUserMenu.record,
          levels: footerUserMenu.record.levels.map((level) => ({
            ...level,
            items: level.items.map((item) =>
              item.action_id === 'open_workspace'
                ? { ...item, badge: workspaceSurfaceOpen ? 'active' : undefined }
                : item,
            ),
          })),
        },
      },
      'system-controls': {
        ...systemControlsMenu,
        record: {
          ...systemControlsMenu.record,
          levels: systemControlsMenu.record.levels.map((level) => ({
            ...level,
            items: level.items.map((item) => {
              if (item.action_id === 'open_menu_voice_control') {
                return {
                  ...item,
                  badge: activeVoiceLabel.replace(/\s+Voice$/i, ''),
                };
              }
              if (item.action_id === 'system_logout') {
                return {
                  ...item,
                  disabled: powerChromeState !== 'signed_in',
                };
              }
              return item;
            }),
          })),
        },
      },
    };

    if (!authSessionActive) {
      const guestEntry = merged['guest-entry'];
      if (guestEntry?.record?.levels?.[0]) {
        const badge = sessionEntryClassification === 'new' ? 'First visit' : 'Returning';
        merged = {
          ...merged,
          'guest-entry': {
            ...guestEntry,
            record: {
              ...guestEntry.record,
              levels: guestEntry.record.levels.map((level, idx) =>
                idx === 0
                  ? {
                      ...level,
                      items: level.items.map((item, j) =>
                        j === 0 ? { ...item, badge } : item,
                      ),
                    }
                  : level,
              ),
            },
          },
        };
      }
    }

    return filterShellMenuRegistryForAuth(merged, authSessionActive ? 'authenticated' : 'guest');
  }, [
    authoritativeMenuRegistry,
    activeVoiceLabel,
    powerChromeState,
    showDiagnosticsChrome,
    workspaceSurfaceOpen,
    authSessionActive,
    sessionEntryClassification,
  ]);

  useEffect(() => {
    setShellMenuStore((prev) => ({
      ...prev,
      registry_by_id: shellMenuRegistry,
    }));
  }, [shellMenuRegistry]);

  useEffect(() => {
    const activeSurfaceMode: ShellMenuStoreState['context']['active_surface_mode'] =
      workspaceSurfaceOpen
        ? 'workspace'
        : mode === 'chat'
          ? 'chat'
          : mode === 'voice_control'
            ? 'voice_control'
            : mode === 'voice_settings'
              ? 'voice_settings'
              : mode === 'appearance'
                ? 'appearance'
                : mode === 'intent_settings'
                  ? 'agent_identity'
                  : mode === 'knowledge'
                    ? 'knowledge'
                    : mode === 'podcasts'
                      ? 'podcasts'
                      : mode === 'transparency'
                        ? 'transparency'
                        : mode === 'api_health'
                          ? 'api_health'
                          : mode === 'create_account'
                            ? 'create_account'
                            : mode === 'coding_agent'
                              ? 'coding_agent'
                              : 'voice';

    setShellMenuStore((prev) => ({
      ...prev,
      context: {
        ...prev.context,
        auth_status: authSessionActive ? 'authenticated' : 'guest',
        active_voice_route: voiceRoute,
        active_voice_profile_id: voice || null,
        voicebox_ready: voiceRoute !== 'voicebox' || Boolean(voice),
        workspace_connected: workspaceSurfaceOpen,
        diagnostics_enabled: showDiagnosticsChrome,
        appearance_dirty:
          theme.backgroundType !== 'canvas' ||
          theme.overlayColor !== '#020617' ||
          theme.overlayOpacity !== 0.72 ||
          theme.colorScheme !== 'dark' ||
          theme.overlayWidthPercent !== 95 ||
          theme.overlayPadding !== 16,
        agent_identity_dirty: Boolean(
          agentIntent.trim() ||
          userIntent.trim() ||
          desiredOutcome.trim() ||
          agentName.trim() ||
          agentCompany.trim() ||
          agentRole.trim(),
        ),
        active_surface_mode: activeSurfaceMode,
      },
    }));
  }, [
    agentCompany,
    agentIntent,
    agentName,
    agentRole,
    authSessionActive,
    desiredOutcome,
    mode,
    showDiagnosticsChrome,
    theme,
    userIntent,
    voice,
    voiceRoute,
    workspaceSurfaceOpen,
  ]);

  const headerSystemMenuRecord = shellMenuStore.registry_by_id['shell-header-system'].record;
  const footerUserMenuRecord = shellMenuStore.registry_by_id['shell-footer-user'].record;
  const shellIntentLabel =
    workspaceCanvas?.view
      ? `canvas:${workspaceCanvas.view}`
      : kernelState?.current_intent && kernelState.current_intent !== 'idle'
        ? kernelState.current_intent
        : undefined;
  const transcriptMessages = useMemo<ShellTranscriptMessage[]>(
    () =>
      messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        timestampLabel: message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })),
    [messages],
  );
  const latestAgentOutcome = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === 'agent' && message.text.trim())?.text,
    [messages],
  );
  const shellMenuAgentDisclosureLine = 'Shell Intent: Greet Customer · Skill: Determine Intent · Outcome: Route To Destination';
  const shellMenuDisclosureSummary = useMemo(
    () => {
      const availableSkills = kernelState?.available_skills?.filter((skill) => skill.trim()) ?? [];
      const shellIntent = !authSessionActive && showVoiceIdleOrientation
        ? 'Greet Customer'
        : kernelState?.current_intent?.trim() || 'Determine Intent';
      const desiredOutcome = !authSessionActive && showVoiceIdleOrientation
        ? 'Route To Destination'
        : latestAgentOutcome
          ? stripIntentLineForDisplay(latestAgentOutcome).slice(0, 120)
          : 'Route To Destination';

      return {
        shellIntent,
        availableSkills: availableSkills.length > 0 ? availableSkills : ['Determine Intent'],
        desiredOutcome,
        userRole: authSessionActive ? 'Verified operator' : 'Guest / prospective student',
        journeyPosition: shellJourney.primaryLabel,
        sourceRef: headerSystemMenuRecord.data_source_ref,
      };
    },
    [
      authSessionActive,
      headerSystemMenuRecord.data_source_ref,
      kernelState?.available_skills,
      kernelState?.current_intent,
      latestAgentOutcome,
      shellJourney.primaryLabel,
      showVoiceIdleOrientation,
    ],
  );
  useEffect(() => {
    voiceboxRecordingChunksRef.current = shellMenuStore.recording.capture_chunks;
  }, [shellMenuStore.recording.capture_chunks]);

  const openVcuDesktop = useCallback((view: VcuUniversityView) => {
    closeShellMenus();
    if (shellMenuStore.context.auth_status === 'guest') {
      setAuthPanelOpen(true);
      return;
    }
    setMode('voice');
    setVcuLaunchRequest((current) => ({
      view,
      revision: (current?.revision ?? 0) + 1,
    }));
  }, [closeShellMenus, setAuthPanelOpen, shellMenuStore.context.auth_status]);

  const { handleShellMenuAction } = useShellMenuActions({
    activeShellMenuId,
    activeMenuId: shellMenuStore.ui.active_menu_id,
    authStatus: shellMenuStore.context.auth_status,
    powerChromeState,
    showDiagnosticsChrome,
    engageSessionEntry,
    closeShellMenus,
    markShellMenuActionSelected,
    openGuestJoinSurface,
    openShellMenuById,
    openVcuDesktop,
    openWorkspaceHub,
    handleOpenPodcasts,
    handleOpenKnowledgePanel,
    handleLogout,
    applyVoiceRoute,
    refreshVoiceboxRecordingState,
    selectVoiceboxRecordingProfile,
    activateVoiceboxProfile,
    resetTheme,
    setAppearanceTune,
    setAuthPanelOpen,
    setGuestNicknameDraft,
    setGuestNicknameOverlayOpen,
    setMessages,
    setMode,
    setShellMenuRecordingState,
    setShellSessionStarted,
    setTheme,
  });

  const renderShellMenuDetailSurface = useCallback(
    (surfaceId: string) => {
      switch (surfaceId) {
        case 'intent.reality.check.v1':
          if (shellMenuStore.intent_ingestion.status === 'handoff_ready') {
            return (
              <RealityCheckReport 
                ingestionState={shellMenuStore.intent_ingestion} 
                onApplyFix={(points) => {
                  setShellMenuStore(prev => {
                    const currentProb = prev.intent_ingestion.mvp_success_probability || 0;
                    return {
                      ...prev,
                      intent_ingestion: {
                        ...prev.intent_ingestion,
                        mvp_success_probability: Math.min(100, currentProb + points)
                      },
                      revision: prev.revision + 1
                    };
                  });
                }}
              />
            );
          }
          return null;
        case 'voicebox.record.capture.v1': {
          const activeProfileId = shellMenuStore.recording.active_profile_id;
          const activeSampleCount = activeProfileId
            ? shellMenuStore.recording.sample_count_by_profile_id[activeProfileId] ?? 0
            : 0;

          return (
            <VoiceBoxRecordDetailSurface
              profiles={shellMenuStore.recording.available_profiles}
              activeProfileId={activeProfileId}
              sampleCount={activeSampleCount}
              sampleTarget={shellMenuStore.recording.recommended_sample_target}
              promptText={shellMenuStore.recording.selected_prompt_text}
              captureStatus={shellMenuStore.recording.capture_status}
              lastError={shellMenuStore.recording.last_error}
              voiceboxReady={shellMenuStore.recording.voicebox_ready}
              pttBindingEnabled={shellMenuStore.recording.ptt_binding_enabled}
              onSelectProfile={(profileId) => selectVoiceboxRecordingProfile(profileId || null)}
            />
          );
        }
        case 'system.profile.v1':
          return (
            <UserProfilePanel
              onBack={() => clearShellMenuSelectedAction('system-controls')}
              powerState={powerChromeState}
              onSave={handleProfileUpdate}
              onCreateAccount={() => { closeShellMenus(); setMode('create_account'); }}
            />
          );
        case 'agent.identity.name.v1':
          return (
            <div className="flex flex-col gap-3">
              <SovereignTextInput value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'agent.identity.company.v1':
          return (
            <div className="flex flex-col gap-3">
              <SovereignTextInput value={agentCompany} onChange={(e) => setAgentCompany(e.target.value)} />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'agent.identity.role.v1':
          return (
            <div className="flex flex-col gap-3">
              <SovereignTextInput value={agentRole} onChange={(e) => setAgentRole(e.target.value)} />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'agent.identity.agent_intent.v1':
          return (
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-[6rem] w-full rounded-xl border p-3 text-sm"
                style={{
                  background: 'var(--panel-input-bg)',
                  borderColor: 'var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                value={agentIntent}
                onChange={(e) => setAgentIntent(e.target.value)}
              />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'agent.identity.user_intent.v1':
          return (
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-[6rem] w-full rounded-xl border p-3 text-sm"
                style={{
                  background: 'var(--panel-input-bg)',
                  borderColor: 'var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
              />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'agent.identity.desired_outcome.v1':
          return (
            <div className="flex flex-col gap-3">
              <textarea
                className="min-h-[6rem] w-full rounded-xl border p-3 text-sm"
                style={{
                  background: 'var(--panel-input-bg)',
                  borderColor: 'var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
              />
              <button
                type="button"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => clearShellMenuSelectedAction('agent-identity')}
              >
                Done
              </button>
            </div>
          );
        case 'system.scripts.v1':
          return <AdminPanel onBack={() => clearShellMenuSelectedAction('system-controls')} />;
        default:
          return null;
      }
    },
    [
      agentCompany,
      agentIntent,
      agentName,
      agentRole,
      clearShellMenuSelectedAction,
      closeShellMenus,
      desiredOutcome,
      handleProfileUpdate,
      powerChromeState,
      selectVoiceboxRecordingProfile,
      shellMenuStore.recording,
      shellMenuStore.intent_ingestion,
      setAgentCompany,
      setAgentIntent,
      setAgentName,
      setAgentRole,
      setDesiredOutcome,
      setShellMenuStore,
      setUserIntent,
      userIntent,
    ],
  );
  useEffect(() => {
    if (workspaceCanvas) {
      setHeaderMenuOpen(false);
      setFooterMenuOpen(false);
    }
  }, [workspaceCanvas]);
  useEffect(() => {
    if (mode !== 'voice' && mode !== 'chat') {
      setHeaderMenuOpen(false);
      setFooterMenuOpen(false);
    }
  }, [mode]);
  const voiceCenterStage = showVoiceIdleOrientation ? (
    <div className="absolute inset-0">
      <ShellVoiceIdlePanel
        workspaceState={workspaceDisclosure}
        sessionEntry={sessionEntryClassification}
        eyebrow="Vibe Coding University"
        introAudioPlaying={landingIntroPlaying}
        onIntroPlayPause={() => void handleLandingIntroPlayPause()}
        onSkipIntro={authSessionActive ? handleAuthenticatedSkipIntro : handleGuestSkipIntro}
        onSkipIntroFromHero={
          authSessionActive ? handleAuthenticatedSkipIntro : handleGuestSkipIntroToCommunityMenu
        }
        openCommunityMenuOnHeroSkip={!authSessionActive}
        onCreateAccount={() => {
          engageSessionEntry();
          postAuthOpenProjectBuilderRef.current = false;
          stopLandingStartWelcome();
          setLandingIntroPlaying(false);
          setGuestJoinSurfaceOpen(false);
          setAuthPanelOpen(true);
        }}
        onLogin={() => {
          engageSessionEntry();
          postAuthOpenProjectBuilderRef.current = false;
          stopLandingStartWelcome();
          setLandingIntroPlaying(false);
          setGuestJoinSurfaceOpen(false);
          setAuthPanelOpen(true);
        }}
        onRequestAudiencePath={() => {
          engageSessionEntry();
          openGuestJoinSurface();
        }}
        onOpenMenu={() => {
          engageSessionEntry();
          setFooterMenuOpen(false);
          setHeaderMenuOpen((current) => !current);
        }}
        onSelectMode={
          authSessionActive
            ? (selectedMode) => {
                engageSessionEntry();
                setShellSessionStarted(true);
                setMode(selectedMode);
              }
            : handleGuestSelectMode
        }
        onExplainVibeTopic={handleExplainVibeTopic}
      />
    </div>
  ) : (
    <div className="flex flex-col items-center gap-6">
      {(status === 'processing' || status === 'speaking' || (isPTTActive && status === 'listening')) && (
        <div className="relative flex items-center justify-center px-8 py-7">
          <OrbitalVisualizer isActive status={status} />
        </div>
      )}
    </div>
  );

  const handleFooterProfilePress = useCallback(() => {
    if (!authSessionActive) {
      engageSessionEntry();
      setHeaderMenuOpen(false);
      setFooterMenuOpen(false);
      openShellMenuById('guest-entry');
      return;
    }
    if (!footerMenuPermitted) {
      setMode('create_account');
      return;
    }
    engageSessionEntry();
    setHeaderMenuOpen(false);
    setFooterMenuOpen((current) => !current);
  }, [
    authSessionActive,
    engageSessionEntry,
    footerMenuPermitted,
    openShellMenuById,
    setFooterMenuOpen,
    setHeaderMenuOpen,
    setMode,
  ]);

  if (publicPodcastId) {
    return (
      <Suspense fallback={null}>
        <LazyPublicPodcastPage episodeId={publicPodcastId} />
      </Suspense>
    );
  }

  return (
    <div
      className="fixed inset-0 font-sans overflow-hidden selection:bg-blue-500/30"
      style={themeToCssVars(theme)}
      data-color-scheme={theme.colorScheme}
      data-kernel-verbosity={kernelVerbosityLevel}
    >
      {/* Dynamic background + overlay tint */}
      <ShellBackground theme={theme} />
      <ShellIdentityBar
        sessionLabel={authSessionActive ? 'Local Session' : 'AI OS'}
        shellInteractionMode={mode === 'chat' ? 'chat' : 'voice'}
        sessionContextLabel={workspaceCanvas?.view ? workspaceCanvas.view.replace(/_/g, ' ') : 'Home'}
        workspaceState={workspaceDisclosure as any}
        canvasView={workspaceCanvas?.view}
        voiceInputAvailable={voicePttPermitted}
        intentSummary={shellIntentLabel}
        localModelReadiness={localModelReadiness}
        showDiagnosticsChrome={showDiagnosticsChrome}
        commanderName={commanderName ?? undefined}
        onOpenSystemControls={
          authSessionActive ? () => openShellMenuById('system-controls') : () => openShellMenuById('guest-entry')
        }
        onOpenTransparency={() => setMode('transparency')}
        headerMenuRecord={headerMenuChromeAllowed ? headerSystemMenuRecord : undefined}
        headerMenuOpen={headerMenuOpen}
        onToggleHeaderMenu={() => {
          engageSessionEntry();
          setFooterMenuOpen(false);
          setHeaderMenuOpen((current) => !current);
        }}
        onCloseHeaderMenu={() => setHeaderMenuOpen(false)}
        powerChromeState={powerChromeState}
        voiceModelLabel={activeVoiceLabel}
        headerPillLabel={shellJourney.primaryLabel}
        headerPillTitle={`${activeVoiceLabel.replace(/\s+Voice$/i, '')}. ${shellJourney.disclosureLine}`}
        loyaltySummary={loyaltyBadgeLabel}
        availableSkillsCount={authSessionActive ? kernelState?.available_skills?.length ?? 0 : 0}
        statusSubtitle={shellHeaderSubtitle}
        playbackActive={status === 'speaking' || landingIntroPlaying}
        micEnabled={micEnabled}
        speakerEnabled={speakerEnabled}
        currentCueLabel={shellIdentityCueLabel}
        audioCues={shellIdentityAudioCues}
        onTogglePlayback={handlePlayPauseCue}
        onToggleMic={handleToggleMic}
        onToggleSpeaker={handleToggleSpeaker}
      />

      {shellMenuStore.context.auth_status === 'authenticated' && !activeShellMenuEntry && (
        <div className="absolute inset-0 z-[var(--z-shell-workspace-canvas)] pointer-events-none">
          <div className="pointer-events-auto h-full w-full">
            <VirtualDesktopEnvironment
              authStatus={shellMenuStore.context.auth_status}
              launchUniversityView={vcuLaunchRequest?.view ?? null}
              launchRevision={vcuLaunchRequest?.revision ?? 0}
            />
          </div>
        </div>
      )}

      <DesktopWelcomeOverlay open={desktopWelcomeOpen} onContinue={handleDesktopWelcomeContinue} />

      <ShellContentZone
        theme={shellTheme}
        mode={mode === 'chat' ? 'chat' : 'voice'}
        messages={transcriptMessages}
        transcription={transcription}
        centerStage={voiceCenterStage}
        chatEndRef={chatEndRef}
        voiceCenterFullBleed={showVoiceIdleOrientation}
      />

      <AnimatePresence>
        {activeShellMenuEntry &&
        (activeShellMenuEntry.menu_id === 'guest-entry' ||
          activeShellMenuEntry.menu_id !== 'shell-header-system' ||
          headerMenuChromeAllowed) ? (
          <motion.div
            key={`shell-menu-layer-${activeShellMenuEntry.menu_id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-[var(--shell-header-height)] bottom-[var(--shell-footer-height)] z-[var(--z-shell-modal-backdrop)]"
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(8px)' }}
              onClick={() => closeShellMenus()}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="relative h-full"
            >
              <ShellMenuController
                record={activeShellMenuEntry.record}
                onSelect={handleShellMenuAction}
                onClose={closeShellMenus}
                variant="shell-layer"
                className="h-full"
                activeLevelId={shellMenuStore.ui.active_level_id_by_menu_id[activeShellMenuEntry.menu_id]}
                onActiveLevelChange={(levelId) => setShellMenuLevel(activeShellMenuEntry.menu_id, levelId)}
                selectedActionId={shellMenuStore.ui.selected_action_id_by_menu_id[activeShellMenuEntry.menu_id]}
                onClearSelectedAction={() => clearShellMenuSelectedAction(activeShellMenuEntry.menu_id)}
                disclosureSummary={shellMenuDisclosureSummary}
                onBackMenu={
                  shellMenuStore.ui.menu_stack.length > 1
                    ? () => {
                        setShellMenuStore((prev) => ({
                          ...prev,
                          ui: {
                            ...prev.ui,
                            menu_stack: prev.ui.menu_stack.slice(0, -1),
                            active_menu_id: prev.ui.menu_stack[prev.ui.menu_stack.length - 2] || null,
                          },
                        }));
                      }
                    : undefined
                }
                renderDetailSurface={(surface) => renderShellMenuDetailSurface(surface.surface_id)}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'visual' && (
          <motion.div
            key="visual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center backdrop-blur-md z-[var(--z-shell-chrome)]"
            style={{ background: 'color-mix(in srgb, var(--panel-bg) 72%, transparent)' }}
          >
            <CrystalOverlay onClose={() => setMode('voice')} />
          </motion.div>
        )}

        {mode === 'disc_settings' && (
          <ShellOverlayFrame overlayKey="disc_settings" onClose={() => setMode('voice')} align="top">
            <DISCSettingsOverlay
              profile={discProfile}
              onChange={handleDISCChange}
              onClose={() => setMode('voice')}
            />
          </ShellOverlayFrame>
        )}

        {mode === 'intent_settings' && (
          <ShellOverlayFrame overlayKey="intent_settings" onClose={() => setMode('voice')} align="center">
            <SovereignCard className="max-w-lg w-full border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl">
              <SovereignTitle level={2} className="text-[var(--panel-heading)]">
                ARCH communication protocol
              </SovereignTitle>
              <SovereignDescription className="mt-2 text-[var(--panel-text-muted)]">
                Governed responses follow Acknowledge → Reflect → Context → Handoff. The shell weaves these elements invisibly into natural language; this surface is the operator reference only.
              </SovereignDescription>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-[var(--panel-text)]">
                <li>
                  <span className="font-semibold text-[var(--panel-heading)]">Acknowledge</span> — confirm what was heard without debating it.
                </li>
                <li>
                  <span className="font-semibold text-[var(--panel-heading)]">Reflect</span> — restate intent in your own words.
                </li>
                <li>
                  <span className="font-semibold text-[var(--panel-heading)]">Context</span> — surface the minimum relevant framing.
                </li>
                <li>
                  <span className="font-semibold text-[var(--panel-heading)]">Handoff</span> — end with a clear next step or deliverable.
                </li>
              </ul>
              <button
                type="button"
                className="mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => setMode('voice')}
              >
                Close
              </button>
            </SovereignCard>
          </ShellOverlayFrame>
        )}

        {appearanceTune && (
          <ShellOverlayFrame
            overlayKey={`appearance_tune_${appearanceTune}`}
            onClose={() => setAppearanceTune(null)}
            align="center"
          >
            <SovereignCard
              className={`w-full border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl ${
                appearanceTune === 'live_background' ? 'max-w-2xl' : 'max-w-md'
              }`}
            >
              <SovereignTitle level={2} className="text-[var(--panel-heading)]">
                {appearanceTune === 'overlay_color' && 'Overlay tint color'}
                {appearanceTune === 'overlay_opacity' && 'Overlay opacity'}
                {appearanceTune === 'overlay_width' && 'Overlay width'}
                {appearanceTune === 'canvas_padding' && 'Canvas padding'}
                {appearanceTune === 'live_background' && 'Live shell backgrounds'}
              </SovereignTitle>
              {appearanceTune === 'live_background' && (
                <>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                    Choose a governed canvas effect. The shell updates immediately; use Done when you are finished.
                  </p>
                  <LiveBackgroundAppearancePicker
                    activeId={theme.canvasBackgroundId}
                    onPick={(id) =>
                      setTheme({
                        backgroundType: 'canvas',
                        customBgKind: null,
                        customBgPath: null,
                        canvasBackgroundId: id,
                      })
                    }
                  />
                </>
              )}
              {appearanceTune === 'overlay_color' && (
                <div className="mt-4 flex flex-col gap-3">
                  <input
                    type="color"
                    value={theme.overlayColor}
                    onChange={(e) => setTheme({ overlayColor: e.target.value })}
                    className="h-12 w-full cursor-pointer rounded-lg border"
                    style={{ borderColor: 'var(--panel-input-border)', background: 'var(--panel-input-bg)' }}
                  />
                </div>
              )}
              {appearanceTune === 'overlay_opacity' && (
                <div className="mt-4 flex flex-col gap-2">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={theme.overlayOpacity}
                    onChange={(e) => setTheme({ overlayOpacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm text-[var(--panel-text-muted)]">{Math.round(theme.overlayOpacity * 100)}%</span>
                </div>
              )}
              {appearanceTune === 'overlay_width' && (
                <div className="mt-4 flex flex-col gap-2">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={1}
                    value={theme.overlayWidthPercent}
                    onChange={(e) => setTheme({ overlayWidthPercent: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                  <span className="text-sm text-[var(--panel-text-muted)]">{theme.overlayWidthPercent}% viewport</span>
                </div>
              )}
              {appearanceTune === 'canvas_padding' && (
                <div className="mt-4 flex flex-col gap-2">
                  <input
                    type="range"
                    min={0}
                    max={48}
                    step={1}
                    value={theme.overlayPadding}
                    onChange={(e) => setTheme({ overlayPadding: parseInt(e.target.value, 10) })}
                    className="w-full"
                  />
                  <span className="text-sm text-[var(--panel-text-muted)]">{theme.overlayPadding}px</span>
                </div>
              )}
              <button
                type="button"
                className="mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--panel-accent-bg)',
                  border: '1px solid var(--panel-accent-border)',
                  color: 'var(--panel-accent-text)',
                }}
                onClick={() => setAppearanceTune(null)}
              >
                Done
              </button>
            </SovereignCard>
          </ShellOverlayFrame>
        )}

        {mode === 'create_account' && (
          <ShellOverlayFrame overlayKey="create_account" onClose={() => setMode('voice')} align="center">
            <div className="bg-[var(--panel-surface)] border border-[var(--panel-border)] rounded-xl p-8 max-w-md w-full shadow-2xl flex flex-col gap-6">
              <h2 className="text-xl font-semibold text-[var(--panel-heading)]">Create Account</h2>
              <p className="text-[var(--panel-text)] text-sm">
                This path is for account setup from inside the shell. New visitors usually start from the Vibe landing,
                use Play or Skip intro, then join with a quick phone code.
              </p>
              <div className="flex flex-col gap-3">
                <input type="text" placeholder="Email" className="bg-[var(--panel-input-bg)] border border-[var(--panel-input-border)] text-[var(--panel-text)] p-2 rounded-md" />
                <input type="password" placeholder="Password" className="bg-[var(--panel-input-bg)] border border-[var(--panel-input-border)] text-[var(--panel-text)] p-2 rounded-md" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setMode('voice')} className="px-4 py-2 text-[var(--panel-text-muted)] hover:text-[var(--panel-text)]">Cancel</button>
                <button 
                  onClick={() => {
                    markOtpVerified();
                    setAuthSessionActive(true);
                    setMode('voice');
                  }} 
                  className="px-4 py-2 bg-[var(--panel-accent-bg)] text-[var(--panel-accent-text)] rounded-md font-medium"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </ShellOverlayFrame>
        )}

        {mode === 'api_health' && (
          <ShellOverlayFrame overlayKey="api_health" onClose={() => setMode('voice')} reserveFooterSpace={false}>
            <Suspense fallback={null}>
              <LazyApiHealthOverlay onClose={() => setMode('voice')} />
            </Suspense>
          </ShellOverlayFrame>
        )}

        {mode === 'transparency' && (
          <Suspense fallback={null}>
            <LazyShellTransparencyDrawer
              voiceRoute={voiceRoute}
              voiceLabel={activeVoiceLabel}
              voiceDescription={voiceRouteDescription}
              reasoningStatus={reasoningStatus}
              interactionMode={mode === 'chat' ? 'chat' : 'voice'}
              currentIntent={shellIntentLabel}
              availableSkills={kernelState?.available_skills ?? []}
              promptContract={promptContract}
              currentAction={workspaceCanvas?.view ? `workspace:${workspaceCanvas.view}` : mode === 'chat' ? 'chat_conversation' : 'voice_conversation'}
              currentOutcome={latestAgentOutcome ? stripIntentLineForDisplay(latestAgentOutcome).slice(0, 180) : undefined}
              onClose={() => setMode('voice')}
            />
          </Suspense>
        )}

        {mode === 'knowledge' && (
          <Suspense fallback={null}>
            <LazySessionKnowledgePanel
              initialTab={knowledgePanelInitialTab}
              onClose={() => setMode('voice')}
              userId={supabaseUserId}
              sessionId={trackedShellSessionId}
            />
          </Suspense>
        )}

        {mode === 'user_storage' && (
          <ShellOverlayFrame overlayKey="user_storage" onClose={() => setMode('voice')}>
            <Suspense fallback={null}>
              <LazyUserStoragePanel
                theme={theme}
                onClose={() => setMode('voice')}
                onOpenKnowledge={() => handleOpenKnowledgePanel('library')}
                onOpenAppearance={() => {
                  setMode('voice');
                  openShellMenuById('appearance');
                }}
                onOpenWorkspace={openWorkspaceHub}
                onOpenPodcasts={handleOpenPodcasts}
              />
            </Suspense>
          </ShellOverlayFrame>
        )}

        {mode === 'coding_agent' && (
          <ShellOverlayFrame overlayKey="coding_agent" onClose={() => setMode('voice')} align="top">
            <Suspense fallback={null}>
              <LazyCodingAgentPanel onClose={() => setMode('voice')} />
            </Suspense>
          </ShellOverlayFrame>
        )}

        {mode === 'podcasts' && (
          <ShellOverlayFrame overlayKey="podcasts" onClose={() => setMode('voice')} reserveFooterSpace={false} fullScreen>
            <Suspense fallback={null}>
              <LazyPodcastLibraryPanel onClose={() => setMode('voice')} />
            </Suspense>
          </ShellOverlayFrame>
        )}

        {workspaceCanvas && (
          <motion.div
            key={`ws-canvas-${workspaceCanvas.view}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-start sm:items-center justify-center backdrop-blur-[2px] overflow-y-auto pt-[calc(var(--shell-header-height)+0.75rem)] pb-[var(--shell-footer-height)] z-[var(--z-shell-workspace-canvas)] min-h-0"
            style={{ background: 'color-mix(in srgb, var(--panel-bg) 5%, transparent)' }}
            onClick={dismissBackdrop}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center px-2">
              <Suspense fallback={null}>
                {workspaceCanvas.view === 'workspace_onboarding' &&
                  payload?.view === 'workspace_onboarding' && (
                    <LazyWorkspaceOnboardingSurface
                      workspaceState={payload.workspaceState}
                      connecting={workspaceConnecting}
                      onConnect={async () => {
                        setWorkspaceConnecting(true);
                        try {
                          setWorkspaceUserConnected(true);
                          await loadDataAfterWorkspaceConnect();
                        } finally {
                          setWorkspaceConnecting(false);
                        }
                      }}
                      onContinueWithout={closeCanvas}
                      onClose={closeCanvas}
                    />
                  )}
                {workspaceCanvas.view === 'workspace_hub' && payload?.view === 'workspace_hub' && (
                  <LazyWorkspaceHubSurface
                    connected={shouldShowWorkspaceHub(payload.workspaceState)}
                    mode="hub"
                    dataPhase={dataPhase}
                    onClose={closeCanvas}
                    onOpenCalendar={() => void loadData('workspace_calendar_hub')}
                    onOpenMail={() => void loadData('workspace_mail_hub')}
                    onOpenDrive={() => void loadData('workspace_drive_hub')}
                    onOpenContacts={() => void loadData('workspace_contacts_hub')}
                    onOpenSearch={() => void loadData('workspace_search_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_hub')}
                  />
                )}
                {workspaceCanvas.view === 'workspace_calendar_hub' && payload?.view === 'workspace_calendar_hub' && (
                  <LazyWorkspaceHubSurface
                    connected
                    mode="calendar"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    calendarRead={payload.calendarRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_calendar_hub')}
                  />
                )}
                {workspaceCanvas.view === 'workspace_mail_hub' && payload?.view === 'workspace_mail_hub' && (
                  <LazyWorkspaceHubSurface
                    connected
                    mode="mail"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    mailSearch={payload.mailSearch}
                    mailRead={payload.mailRead}
                    openMailMessageId={payload.openMailMessageId}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onReadMail={(messageId) => void loadData('workspace_mail_hub', { mailMessageId: messageId })}
                    onClearMailRead={() => void loadData('workspace_mail_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_mail_hub')}
                  />
                )}
                {workspaceCanvas.view === 'workspace_drive_hub' && payload?.view === 'workspace_drive_hub' && (
                  <LazyWorkspaceHubSurface
                    connected
                    mode="drive"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    toolRead={payload.toolRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_drive_hub')}
                  />
                )}
                {workspaceCanvas.view === 'workspace_contacts_hub' && payload?.view === 'workspace_contacts_hub' && (
                  <LazyWorkspaceHubSurface
                    connected
                    mode="contacts"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    toolRead={payload.toolRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_contacts_hub')}
                  />
                )}
                {workspaceCanvas.view === 'workspace_search_hub' && payload?.view === 'workspace_search_hub' && (
                  <LazyWorkspaceHubSurface
                    connected
                    mode="search"
                    dataPhase={dataPhase}
                    dataError={dataError}
                    toolRead={payload.toolRead}
                    onClose={closeCanvas}
                    onBackToHub={() => void loadData('workspace_hub')}
                    onWorkspaceGoogleAuthChange={() => void loadData('workspace_search_hub')}
                  />
                )}
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandRail
        rail={{
          mode: mode === 'chat' ? 'chat' : 'voice',
          primaryAction: mode === 'chat' ? 'send' : 'ptt',
          systemStatus: status === 'listening' ? 'listening' : status === 'processing' ? 'processing' : status === 'speaking' ? 'speaking' : 'idle',
          intent: shellIntentLabel,
        }}
        mode={mode === 'chat' ? 'chat' : 'voice'}
        chatInput={chatInput}
        onChatInputChange={handleChatInputChange}
        onChatSubmit={handleChatSubmit}
        onChatMicPress={() => void startPTTSession()}
        onChatMicRelease={() => void stopPTTSession()}
        onToggleVoiceChat={handleToggleVoiceChatFromShell}
        isPTTActive={isPTTActive}
        onPTTDown={(e) => void handlePTTDown(e)}
        onPTTUp={(e) => void handlePTTUp(e)}
        displayStatus={statusDisplay}
        displayStatusDetail={displayStatusDetail}
        footerJourneyLine={headerMenuOpen ? shellMenuAgentDisclosureLine : undefined}
        loyaltySummary={loyaltyBadgeLabel}
        statusTone={status === 'error' ? 'error' : status === 'offline' ? 'muted' : 'ok'}
        showDiagnosticsChrome={showDiagnosticsChrome}
        footerMenuRecord={authSessionActive ? footerUserMenuRecord : undefined}
        footerMenuOpen={footerMenuOpen}
        onToggleFooterMenu={() => {
          engageSessionEntry();
          setHeaderMenuOpen(false);
          setFooterMenuOpen((current) => !current);
        }}
        onProfilePress={handleFooterProfilePress}
      />

      {/* File import badge — shown when files are in context AND kernel permits file_upload */}
      {kernelPermits(kernelState, 'file_upload') && importedFiles.length > 0 && (
        <div className="fixed bottom-[calc(var(--shell-footer-height)+3.5rem)] left-1/2 -translate-x-1/2 flex items-center gap-2 z-[var(--z-shell-chrome)]">
          {importedFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs rounded-full px-3 py-1"
            >
              <FileText size={12} />
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button
                onClick={() => setImportedFiles((prev) => prev.filter((x) => x.name !== f.name))}
                className="text-cyan-400/60 hover:text-cyan-400 ml-0.5"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Import file button — surfaces only when the active NodeContract permits file_upload */}
      {kernelPermits(kernelState, 'file_upload') && (
        <button
          onClick={() => void handleImportFile()}
          title="Import a file into AI context"
          className="fixed bottom-[calc(var(--shell-footer-height)+0.6rem)] right-6 z-[var(--z-shell-chrome)] flex items-center justify-center w-9 h-9 rounded-full border transition-all hover:opacity-90"
          style={{
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
            color: 'var(--panel-text-muted)',
          }}
        >
          <Paperclip size={16} />
        </button>
      )}

      {!authSessionActive && guestJoinSurfaceOpen ? (
        <ShellOverlayFrame
          overlayKey="guest_vibe_join"
          onClose={() => setGuestJoinSurfaceOpen(false)}
          align="center"
        >
          <VibeJoinCommunityCard
            preferredModeLabel={guestPreferredInterfaceRef.current}
            onContinueWithPhone={handleGuestContinueWithPhone}
            onBack={() => setGuestJoinSurfaceOpen(false)}
          />
        </ShellOverlayFrame>
      ) : null}

      {!authSessionActive && guestNicknameOverlayOpen ? (
        <ShellOverlayFrame
          overlayKey="guest_display_name"
          onClose={() => setGuestNicknameOverlayOpen(false)}
          align="center"
        >
          <div
            className="flex w-full max-w-md flex-col gap-5 rounded-2xl border p-6 shadow-2xl"
            style={{
              background: 'var(--panel-bg)',
              borderColor: 'var(--panel-border)',
            }}
          >
            <SovereignTitle level={2} className="text-[var(--panel-heading)]">
              What should we call you?
            </SovereignTitle>
            <SovereignDescription className="text-[var(--panel-text-muted)]">
              Optional nickname saved on this device only. The host can use it in greetings before you verify with
              phone.
            </SovereignDescription>
            <input
              type="text"
              value={guestNicknameDraft}
              onChange={(e) => setGuestNicknameDraft(e.target.value.slice(0, 48))}
              maxLength={48}
              placeholder="e.g. Alex"
              autoComplete="nickname"
              className="w-full rounded-xl border px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--panel-accent-border)]"
              style={{
                background: 'var(--panel-input-bg)',
                borderColor: 'var(--panel-input-border)',
                color: 'var(--panel-text)',
              }}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <SovereignButton
                variant="secondary"
                className="sm:min-w-[7rem]"
                onClick={() => {
                  writeVibeGuestDisplayName(null);
                  setGuestNicknameDraft('');
                }}
              >
                Clear
              </SovereignButton>
              <SovereignButton
                variant="secondary"
                className="sm:min-w-[7rem]"
                onClick={() => setGuestNicknameOverlayOpen(false)}
              >
                Cancel
              </SovereignButton>
              <SovereignButton
                variant="primary"
                className="sm:min-w-[7rem]"
                onClick={() => {
                  writeVibeGuestDisplayName(guestNicknameDraft);
                  setGuestNicknameOverlayOpen(false);
                }}
              >
                Save
              </SovereignButton>
            </div>
          </div>
        </ShellOverlayFrame>
      ) : null}

      {!authSessionActive && authPanelOpen ? (
        <AuthPanel
          variant="vibe"
          onClose={() => {
            postAuthOpenProjectBuilderRef.current = false;
            setAuthPanelOpen(false);
          }}
          onVerified={handleAuthVerified}
        />
      ) : null}

      {showDeveloperHud ? <ScopeMetricsDevHud /> : null}

      {/* First-time Loyalty Intro Sequence */}
      <AnimatePresence>
        {showLoyaltyIntro && (
          <LoyaltyIntroSequence
            speakText={(text, cueLabel) => void speakText(text, undefined, cueLabel, 'onboarding')}
            stopSpeech={stopSpeech}
            onComplete={() => {
              setShowLoyaltyIntro(false);
              engageSessionEntry();
              setShellSessionStarted(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

