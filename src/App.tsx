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
import { listen } from '@tauri-apps/api/event';

/** True when running inside a Tauri desktop window; false in browser dev mode. */
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
import { getContextBlock } from './core/knowledge/sessionKnowledgeStore';
import { useShellTheme, themeToCssVars } from './shell/useShellTheme';
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
import { VirtualDesktopEnvironment } from './components/shell/VirtualDesktopEnvironment';
import { ShellMenuController } from './components/shell/ShellMenuController';
import { UserProfilePanel } from './components/shell/UserProfilePanel';
import { AdminPanel } from './components/shell/AdminPanel';
import { SHADCN_BACKGROUND_ITEMS } from './components/background/shadcnBackgroundCatalog';
import type { PowerChromeState } from './components/shell/ShellSystemControls';
import { getVoiceRoute, setVoiceRoute, voiceRouteLabel, type VoiceRouteId } from './config/voiceRoutePreference';
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
} from './onboarding/onboardingState';
import { buildShellPromptContract } from './shell/shellPromptContract';
import type { ShellMenuId } from './shell/shellMenuContract';
import { CENTRAL_SHELL_MENU_REGISTRY, filterShellMenuRegistryForAuth } from './shell/shellMenuRegistry';
import type { ShellMenuRegistryEntry, ShellMenuStoreState } from './shell/shellMenuStoreTypes';
import { VOICEBOX_SAMPLE_PROMPTS, VOICEBOX_SAMPLE_TARGET, voiceboxPromptForCount } from './shell/voiceBoxRecordConfig';
import { VoiceBoxRecordDetailSurface } from './components/shell/VoiceBoxRecordDetailSurface';
import { RealityCheckReport } from './components/shell/RealityCheckReport';
import { OnboardingGate } from './components/onboarding/OnboardingGate';
import { AuthPanel } from './components/shell/AuthPanel';
import { intentIngestionController } from './shell/IntentIngestionController';
import { heuristicShortcutScanner } from './shell/HeuristicShortcutScanner';
import { knowledgeRetrievalService } from './knowledge/KnowledgeRetrievalService';
import type { ShortcutTrigger } from './knowledge/KnowledgeBaseSchema';

type SystemStatus =
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "offline";

type VoicePlaybackEngine =
  | 'idle'
  | 'gemini'
  | 'voicebox'
  | 'browser'
  | 'browser_fallback';

type ShellAudioCueSource = 'agent' | 'onboarding' | 'system';

type ShellAudioCue = {
  id: string;
  text: string;
  label: string;
  source: ShellAudioCueSource;
  status: 'queued' | 'playing' | 'played' | 'stopped';
  createdAt: string;
  overrideVoice?: string;
};

async function tryQuitApplication(): Promise<void> {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  } catch {
    try {
      window.close();
    } catch {
      /* noop */
    }
  }
}

type AppMode =
  | "voice"
  | "chat"
  | "visual"
  | "voice_settings"
  | "disc_settings"
  | "intent_settings"
  | "api_health"
  | "appearance"
  | "voice_control"
  | "knowledge"
  | "user_storage"
  | "transparency"
  | "podcasts"
  | "create_account"
  | "coding_agent";

/** Workspace canvas uses `workspaceCanvas` state (intent outputs), not AppMode. */
const LOCAL_STT_PLACEHOLDER = '__LOCAL_STT_PLACEHOLDER__';

const VIBE_TOPIC_USER_PROMPTS: Record<VibeTopicId, string> = {
  university:
    'What is Vibe Coding University in this AI OS? Explain clearly for someone new, as if speaking aloud — at most four short sentences, no lists or markdown.',
  community:
    'What is the Vibe Code Community? Explain clearly for someone new, as if speaking aloud — at most four short sentences, no lists or markdown.',
  coding_platform:
    'What is the Vibe Coding Platform in this AI OS? Explain clearly for someone new, as if speaking aloud — at most four short sentences, no lists or markdown.',
};

function scaffoldingDensityForVerbosity(level: KernelVerbosityLevel): number {
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

interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

function buildShellAudioCue(
  text: string,
  overrideVoice?: string,
  label?: string,
  source: ShellAudioCueSource = 'agent',
): ShellAudioCue {
  const normalizedLabel =
    label?.trim() ||
    text
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72) ||
    'Audio cue';

  return {
    id: `cue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    label: normalizedLabel,
    source,
    status: 'queued',
    createdAt: new Date().toISOString(),
    overrideVoice,
  };
}

interface DISCProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

interface SystemPromptContext {
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

function buildSystemPrompt(ctx: SystemPromptContext): string {
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
    `You operate inside a voice and chat interface. ${ctx.source === 'voice' ? 'The user is speaking to you via local speech-to-text. Respond in natural spoken language — no markdown, bullet points, or code blocks unless specifically requested.' : 'The user is typing to you. Keep responses concise and clear.'}`,
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
    `Never refer to yourself as a text-based assistant or claim you cannot hear — you are integrated into a real-time local voice pipeline.`,
    `Keep responses concise (1–3 sentences for voice, slightly longer for chat). Lead with the answer.`,
    toolHint,
    fileBlock,
  ].join(' ');
}

/**
 * System prompt for the Visual Grounding path — used when a UI screenshot is attached
 * to the Gemini multimodal request. Enforces the ARCH protocol with spatial awareness.
 */
function buildGroundedSystemPrompt(
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
    `[A] ACKNOWLEDGE — One sentence. Validate you heard the intent.`,
    `[R] REFLECT — One sentence. Repeat the core intent back AND explicitly reference a specific UI element visible in the screenshot (button, panel, label, etc.) so ${name} knows you see what they see.`,
    `[C] CONTEXT — One sentence. State one relevant system fact, capability, or boundary.`,
    `[H] HANDOFF — One sentence. End with a single closed question to advance the conversation state.`,
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

const VoiceSettingsOverlay = ({ 
  currentVoice, 
  onSelect, 
  onClose 
}: { 
  currentVoice: string; 
  onSelect: (voiceId: string) => void; 
  onClose: () => void;
}) => {
  const [tab, setTab] = useState<'my_voices' | 'add_voice' | 'new_profile'>('my_voices');
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [vbReady, setVbReady] = useState<boolean | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [activeRecordProfileId, setActiveRecordProfileId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [sampleCount, setSampleCount] = useState<Record<string, number>>({});
  const [recordingStatus, setRecordingStatus] = useState('');
  const activeSampleCount = activeRecordProfileId ? (sampleCount[activeRecordProfileId] ?? 0) : 0;
  const currentSentenceIndex = activeSampleCount;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const SAMPLE_TARGET = 5;

  const SAMPLE_SENTENCES = [
    "I am calibrating my voice profile for the local sovereign AI operating system.",
    "Artificial intelligence is transforming the way we interact with technology.",
    "Large language models process complex instructions and generate natural responses.",
    "A truly private AI runs entirely on local hardware without sending data to the cloud.",
    "The system is now learning the unique characteristics and intonations of my voice."
  ];

  useEffect(() => {
    let alive = true;
    (async () => {
      const ready = await VoiceboxClient.ensureVoiceboxReady();
      if (!alive) return;
      setVbReady(ready);
      if (ready) {
        try {
          const list = await VoiceboxClient.listProfiles();
          if (alive) {
            setProfiles(list);
            const counts: Record<string, number> = {};
            list.forEach(p => { counts[p.id] = p.sample_count ?? 0; });
            setSampleCount(counts);
          }
        } catch {
          // Voicebox returned an error; show empty state gracefully
        }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const handleCreateProfile = async () => {
    const name = newProfileName.trim();
    if (!name) return;
    try {
      const profile = await VoiceboxClient.createProfile(name);
      setProfiles(prev => [...prev, profile]);
      setSampleCount(prev => ({ ...prev, [profile.id]: 0 }));
      setNewProfileName('');
      setActiveRecordProfileId(profile.id);
      setTab('add_voice');
    } catch (err) {
      console.error('Create profile failed:', err);
    }
  };

  const startRecording = async () => {
    if (!activeRecordProfileId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingStatus('Processing…');
        try {
          if (chunks.length === 0) {
            throw new Error("No audio captured. Hold the button longer.");
          }
          const blob = new Blob(chunks, { type: recorder.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          
          // Decode WebM to PCM
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass({ sampleRate: 16000 });
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const pcmData = audioBuffer.getChannelData(0);
          
          // Encode to WAV bytes expected by Voicebox
          const wavBytes = VoiceboxClient.encodeWav(pcmData, 16000);
          
          const refText = SAMPLE_SENTENCES[currentSentenceIndex % SAMPLE_SENTENCES.length];
          await VoiceboxClient.addSample(activeRecordProfileId!, wavBytes, refText);
          setSampleCount(prev => ({
            ...prev,
            [activeRecordProfileId!]: (prev[activeRecordProfileId!] ?? 0) + 1,
          }));
          setRecordingStatus('Sample saved!');
          setTimeout(() => setRecordingStatus(''), 1500);
        } catch (err: any) {
          setRecordingStatus(`Upload failed: ${err?.message || String(err)}`);
          console.error(err);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingStatus('Recording… speak clearly');
    } catch {
      setRecordingStatus('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };
  
  return (
    <SovereignCard className="relative z-20 w-full mx-0">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
          <Volume2 className="w-6 h-6 text-emerald-600" />
        </div>
        <SovereignTitle level={2}>Voice Settings</SovereignTitle>
        <SovereignDescription>
          {vbReady === false ? 'Voicebox offline — using system TTS fallback' : 'Sovereign voice cloning · local · private'}
        </SovereignDescription>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
        {(['my_voices', 'add_voice', 'new_profile'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
              tab === t ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t === 'my_voices' ? 'My Voices' : t === 'add_voice' ? 'Add Samples' : 'New Profile'}
          </button>
        ))}
      </div>

      {/* Tab: My Voices */}
      {tab === 'my_voices' && (
        <div>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading profiles…</p>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No voice profiles yet.</p>
              <SovereignButton
                onClick={() => setTab('new_profile')}
                variant="primary"
              >
                <Plus className="w-4 h-4 mr-2" /> Create your first voice
              </SovereignButton>
            </div>
          ) : (
            <SovereignGrid columns={2} className="gap-3">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`w-full flex flex-col items-start gap-1 p-5 rounded-2xl border transition-all ${
                    currentVoice === p.id
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-bold text-base ${currentVoice === p.id ? 'text-emerald-400' : 'text-gray-200'}`}>
                      {p.name}
                    </span>
                    {currentVoice === p.id && (
                      <div className="bg-emerald-500 rounded-full p-1">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {(sampleCount[p.id] ?? p.sample_count ?? 0)} sample{(sampleCount[p.id] ?? p.sample_count ?? 0) === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </SovereignGrid>
          )}
        </div>
      )}

      {/* Tab: Add Samples */}
      {tab === 'add_voice' && (
        <div className="flex flex-col items-center gap-5">
          {/* Profile selector */}
          {profiles.length > 0 && (
            <select
              className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              value={activeRecordProfileId ?? ''}
              onChange={(e) => setActiveRecordProfileId(e.target.value || null)}
            >
              <option value="" className="bg-zinc-900">— select a profile —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-zinc-900">{p.name}</option>
              ))}
            </select>
          )}

          {profiles.length === 0 && (
            <p className="text-gray-500 text-sm text-center">
              Create a profile first, then record samples here.
            </p>
          )}

          {activeRecordProfileId && (
            <>
              {/* Progress bar */}
              <div className="w-full">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Samples recorded</span>
                  <span>{activeSampleCount} / {SAMPLE_TARGET} recommended</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (activeSampleCount / SAMPLE_TARGET) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Record button */}
              <button
                onPointerDown={startRecording}
                onPointerUp={stopRecording}
                onPointerLeave={stopRecording}
                disabled={!activeRecordProfileId}
                className={`flex flex-col items-center justify-center gap-2 w-28 h-28 rounded-full border-4 transition-all select-none touch-none ${
                  recording
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 scale-95'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:scale-105'
                }`}
              >
                {recording ? <StopCircle className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                <span className="text-xs font-bold">{recording ? 'Release' : 'Hold'}</span>
              </button>

              {recordingStatus && (
                <p className="text-sm text-gray-400">{recordingStatus}</p>
              )}

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Read this aloud</p>
                <p className="text-sm text-gray-200 font-medium">"{SAMPLE_SENTENCES[currentSentenceIndex % SAMPLE_SENTENCES.length]}"</p>
              </div>

              <p className="text-xs text-gray-500 text-center max-w-xs">
                Hold the button and speak naturally. Record at least {SAMPLE_TARGET} samples for best quality.
              </p>
            </>
          )}
        </div>
      )}

      {/* Tab: New Profile */}
      {tab === 'new_profile' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">Give your voice profile a name (e.g. "My Voice", "Formal Mode").</p>
          <SovereignTextInput
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateProfile(); }}
            placeholder="Profile name"
          />
          <SovereignButton
            onClick={() => void handleCreateProfile()}
            disabled={!newProfileName.trim()}
            variant="primary"
          >
            Create Profile
          </SovereignButton>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-white/10">
        <SovereignButton onClick={onClose} variant="secondary" className="w-full">
          Done
        </SovereignButton>
      </div>
    </SovereignCard>
  );
};

const DISCSettingsOverlay = ({ 
  profile, 
  onChange, 
  onClose 
}: { 
  profile: DISCProfile; 
  onChange: (key: keyof DISCProfile, value: number) => void; 
  onClose: () => void;
}) => {
  const traits: { key: keyof DISCProfile; label: string; color: string; description: string }[] = [
    { key: 'dominance', label: 'Dominance', color: '#10B981', description: 'Direct, results-oriented, and firm' },
    { key: 'influence', label: 'Influence', color: '#34D399', description: 'Outgoing, enthusiastic, and optimistic' },
    { key: 'steadiness', label: 'Steadiness', color: '#059669', description: 'Patient, accommodating, and humble' },
    { key: 'conscientiousness', label: 'Conscientiousness', color: '#6EE7B7', description: 'Analytical, reserved, and precise' },
  ];

  // Simple Radar Chart Calculation
  const size = 200;
  const center = size / 2;
  const radius = size * 0.4;
  
  const getPoint = (value: number, angle: number) => {
    const r = (value / 10) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };

  const points = traits.map((t, i) => getPoint(profile[t.key], (i * Math.PI * 2) / 4 - Math.PI / 2)).join(' ');

  return (
    <SovereignCard className="relative z-20 w-full mx-0 flex flex-col md:flex-row gap-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div className="flex-1">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-6 h-6 text-emerald-600" />
          </div>
          <SovereignTitle level={2}>DISC Profile</SovereignTitle>
          <SovereignDescription>Adjust my behavioral personality traits</SovereignDescription>
        </div>

        <div className="space-y-6">
          {traits.map((trait) => (
            <div key={trait.key} className="space-y-2">
              <div className="flex justify-between items-end">
                <div>
                  <span className="font-bold text-gray-200">{trait.label}</span>
                  <p className="text-[10px] text-gray-500 leading-none mt-1">{trait.description}</p>
                </div>
                <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">{profile[trait.key]}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1"
                value={profile[trait.key]}
                onChange={(e) => onChange(trait.key, parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-white/10">
          <SovereignButton onClick={onClose} variant="primary" className="w-full">
            Save Profile
          </SovereignButton>
        </div>
      </div>

      <div className="w-full md:w-80 flex flex-col items-center justify-center bg-black/20 rounded-[2rem] p-8 border border-white/5">
        <div className="relative w-full aspect-square flex items-center justify-center">
          <svg width={size} height={size} className="overflow-visible">
            {/* Background Circles */}
            {[2, 4, 6, 8, 10].map((v) => (
              <circle 
                key={v} 
                cx={center} 
                cy={center} 
                r={(v / 10) * radius} 
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="1" 
              />
            ))}
            {/* Axis Lines */}
            {traits.map((_, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              return (
                <line 
                  key={i}
                  x1={center}
                  y1={center}
                  x2={center + radius * Math.cos(angle)}
                  y2={center + radius * Math.sin(angle)}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Data Polygon */}
            <polygon 
              points={points} 
              fill="rgba(16, 185, 129, 0.2)" 
              stroke="#10b981" 
              strokeWidth="3" 
              strokeLinejoin="round"
            />
            {/* Labels */}
            {traits.map((t, i) => {
              const angle = (i * Math.PI * 2) / 4 - Math.PI / 2;
              const x = center + (radius + 25) * Math.cos(angle);
              const y = center + (radius + 25) * Math.sin(angle);
              return (
                <text 
                  key={t.key}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[10px] font-black uppercase tracking-tighter fill-gray-500"
                >
                  {t.label[0]}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 w-full">
          {traits.map(t => (
            <div key={t.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </SovereignCard>
  );
};

const IntentSettingsOverlay = ({ 
  agentIntent, 
  userIntent, 
  desiredOutcome,
  agentName,
  agentCompany,
  agentRole,
  onAgentIntentChange, 
  onUserIntentChange, 
  onDesiredOutcomeChange,
  onAgentNameChange,
  onAgentCompanyChange,
  onAgentRoleChange,
  onClose 
}: { 
  agentIntent: string; 
  userIntent: string; 
  desiredOutcome: string;
  agentName: string;
  agentCompany: string;
  agentRole: string;
  onAgentIntentChange: (val: string) => void; 
  onUserIntentChange: (val: string) => void; 
  onDesiredOutcomeChange: (val: string) => void;
  onAgentNameChange: (val: string) => void;
  onAgentCompanyChange: (val: string) => void;
  onAgentRoleChange: (val: string) => void;
  onClose: () => void;
}) => {
  const [activeSection, setActiveSection] = useState<'identity' | 'agent_intent' | 'user_intent' | 'desired_outcome'>('identity');

  return (
    <div
      className="mx-auto flex w-full max-w-[72rem] overflow-hidden rounded-[2rem]"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        boxShadow: '0 24px 80px rgba(2,6,23,0.35)',
      }}
    >
      <div
        className="w-[18rem] shrink-0 border-r p-4"
        style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface)' }}
      >
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--panel-text-muted)' }}>
            System configuration
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
            Choose the configuration intent first, then edit only that Level 2 pane.
          </p>
        </div>
        <div className="space-y-2">
          {[
            ['identity', 'Agent Identity', 'Name, company, and role.'],
            ['agent_intent', 'Agent Intent', 'Define the operating goal.'],
            ['user_intent', 'User Intent', 'Capture what the user wants.'],
            ['desired_outcome', 'Desired Outcome', 'Declare what success looks like.'],
          ].map(([id, label, description]) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id as typeof activeSection)}
                className="w-full rounded-2xl px-4 py-3 text-left transition-opacity hover:opacity-95"
                style={{
                  background: active ? 'var(--panel-accent-bg)' : 'var(--panel-bg)',
                  border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
                }}
              >
                <p className="text-sm font-semibold" style={{ color: active ? 'var(--panel-accent-text)' : 'var(--panel-heading)' }}>
                  {label}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: active ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }}>
                  {description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--panel-border)' }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
              Level 2
            </p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--panel-heading)' }}>
              {activeSection === 'identity'
                ? 'Agent Identity'
                : activeSection === 'agent_intent'
                  ? 'Agent Intent'
                  : activeSection === 'user_intent'
                    ? 'User Intent'
                    : 'Desired Outcome'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-90"
            style={{
              background: 'var(--panel-surface)',
              border: '1px solid var(--panel-border)',
              color: 'var(--panel-text-muted)',
            }}
            aria-label="Close system configuration"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {activeSection === 'identity' ? (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: 'var(--panel-accent-text)' }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                  Agent identity
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                    Name
                  </label>
                  <input
                    value={agentName}
                    onChange={(e) => onAgentNameChange(e.target.value)}
                    placeholder="Agent Name"
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--panel-input-bg)',
                      border: '1px solid var(--panel-input-border)',
                      color: 'var(--panel-text)',
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                    Company
                  </label>
                  <input
                    value={agentCompany}
                    onChange={(e) => onAgentCompanyChange(e.target.value)}
                    placeholder="Company"
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--panel-input-bg)',
                      border: '1px solid var(--panel-input-border)',
                      color: 'var(--panel-text)',
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                    Role
                  </label>
                  <input
                    value={agentRole}
                    onChange={(e) => onAgentRoleChange(e.target.value)}
                    placeholder="Role"
                    className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--panel-input-bg)',
                      border: '1px solid var(--panel-input-border)',
                      color: 'var(--panel-text)',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeSection === 'agent_intent' ? (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                Agent intent
              </p>
              <textarea 
                value={agentIntent}
                onChange={(e) => onAgentIntentChange(e.target.value)}
                placeholder="What is the agent's primary goal?"
                className="mt-4 h-36 w-full rounded-2xl px-4 py-4 text-sm outline-none"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
              />
            </div>
          ) : null}

          {activeSection === 'user_intent' ? (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                User intent
              </p>
              <textarea 
                value={userIntent}
                onChange={(e) => onUserIntentChange(e.target.value)}
                placeholder="What is the user trying to achieve?"
                className="mt-4 h-36 w-full rounded-2xl px-4 py-4 text-sm outline-none"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
              />
            </div>
          ) : null}

          {activeSection === 'desired_outcome' ? (
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--panel-text-muted)' }}>
                Desired outcome
              </p>
              <textarea 
                value={desiredOutcome}
                onChange={(e) => onDesiredOutcomeChange(e.target.value)}
                placeholder="What is the definition of success for this session?"
                className="mt-4 h-36 w-full rounded-2xl px-4 py-4 text-sm outline-none"
                style={{
                  background: 'var(--panel-input-bg)',
                  border: '1px solid var(--panel-input-border)',
                  color: 'var(--panel-text)',
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t pt-4 md:flex-row" style={{ borderColor: 'var(--panel-border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-95"
            style={{
              background: 'var(--panel-surface)',
              border: '1px solid var(--panel-border)',
              color: 'var(--panel-text)',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-95"
            style={{
              background: 'var(--panel-accent-bg)',
              border: '1px solid var(--panel-accent-border)',
              color: 'var(--panel-accent-text)',
            }}
          >
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Components ---

/** Voice pipeline: emerald = listening + speaking; amber/yellow = reasoning (processing). */
function OrbitalPalette(status: SystemStatus): {
  barMuted: string;
  barPeak: string;
  glow: string;
  logoBg: string;
  logoText: string;
  statusLabel: string;
  statusDetail: string;
  statusHeadingClass: string;
} {
  switch (status) {
    case 'listening':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.18)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Listening',
        statusDetail: 'Capturing your voice',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'processing':
      return {
        barMuted: '#fde047',
        barPeak: '#eab308',
        glow: 'rgba(234, 179, 8, 0.2)',
        logoBg: 'bg-amber-400',
        logoText: 'text-amber-950',
        statusLabel: 'Reasoning',
        statusDetail: 'Model is thinking',
        statusHeadingClass: 'text-amber-600',
      };
    case 'speaking':
      return {
        barMuted: '#34d399',
        barPeak: '#059669',
        glow: 'rgba(16, 185, 129, 0.2)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Speaking',
        statusDetail: 'Voice response',
        statusHeadingClass: 'text-emerald-600',
      };
    case 'error':
      return {
        barMuted: '#fca5a5',
        barPeak: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.15)',
        logoBg: 'bg-red-500',
        logoText: 'text-white',
        statusLabel: 'Error',
        statusDetail: 'Something went wrong',
        statusHeadingClass: 'text-red-600',
      };
    case 'offline':
      return {
        barMuted: '#a1a1aa',
        barPeak: '#71717a',
        glow: 'rgba(113, 113, 122, 0.12)',
        logoBg: 'bg-zinc-400',
        logoText: 'text-white',
        statusLabel: 'Offline',
        statusDetail: 'Voice unavailable',
        statusHeadingClass: 'text-zinc-500',
      };
    default:
      return {
        barMuted: '#6ee7b7',
        barPeak: '#10b981',
        glow: 'rgba(16, 185, 129, 0.08)',
        logoBg: 'bg-emerald-500',
        logoText: 'text-white',
        statusLabel: 'Ready',
        statusDetail: 'Tap and hold to speak',
        statusHeadingClass: 'text-emerald-600',
      };
  }
}

const OrbitalVisualizer = ({ isActive, status }: { isActive: boolean; status: SystemStatus }) => {
  const bars = 48;
  const palette = OrbitalPalette(status);

  return (
    <div className="relative w-32 h-40 md:w-40 md:h-48 shrink-0">
      {/* Central Logo + live system state — pinned to true center (matches bar hub) */}
      <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center text-center px-0.5">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-zinc-400 font-bold text-xs md:text-sm tracking-widest">AI</span>
            <div
              className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}
            >
              O
            </div>
            <div
              className={`${palette.logoBg} ${palette.logoText} px-1 py-px rounded text-xs md:text-sm font-bold transition-colors duration-300`}
            >
              S
            </div>
          </div>
          <div className="flex flex-col items-center text-center max-w-[9rem] md:max-w-[11rem] mx-auto">
            <span
              className={`inline-block pl-[0.15em] text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] tabular-nums ${palette.statusHeadingClass}`}
            >
              {palette.statusLabel}
            </span>
            <span className="text-[8px] md:text-[9px] text-zinc-500 mt-px leading-tight font-medium px-0.5">
              {palette.statusDetail}
            </span>
          </div>
        </div>
      </div>

      {/* Animated Bars — hub at container center */}
      <div className="absolute inset-0 z-[1] overflow-visible">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 md:w-1 rounded-full left-1/2 bottom-1/2"
            style={{
              height: '24%',
              transform: `translateX(-50%) rotate(${(i * 360) / bars}deg) translateY(-108%)`,
              transformOrigin: 'bottom center',
            }}
            animate={isActive ? {
              height: [
                '24%',
                `${24 + Math.random() * 28}%`,
                '24%'
              ],
              opacity: [0.45, 1, 0.45],
              backgroundColor: [palette.barMuted, palette.barPeak, palette.barMuted],
            } : {
              height: '24%',
              opacity: 0.18,
              backgroundColor: palette.barMuted,
            }}
            transition={{
              duration: 0.5 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Glow Effect — centered on hub, behind bars */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-0 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: palette.glow }}
        animate={isActive ? {
          scale: [1, 1.06, 1],
          opacity: [0.28, 0.65, 0.28]
        } : {
          scale: 1,
          opacity: 0.2
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

const CrystalOverlay = ({ onClose }: { onClose: () => void }) => (
  <SovereignCard className="relative z-20 w-full mx-0 text-center">
    <div className="mb-8 flex justify-center">
      <div className="w-16 h-1 bg-emerald-500/20 rounded-full" />
    </div>
    <SovereignTitle level={2} className="mb-4">Visual mode</SovereignTitle>
    <SovereignDescription className="mb-4 max-w-lg mx-auto text-base">
      The shell is voice-first: speak or type here, use Menu for settings, and open Google Workspace only when you
      need it — it stays subordinate to the shell.
    </SovereignDescription>
    <SovereignDescription variant="muted" className="mb-8 max-w-lg mx-auto">
      This screen is optional. Use it when you want a larger layout; most day-to-day use stays in the voice shell.
      If your browser cannot use the microphone, switch to <strong className="text-white">Chat</strong> (bottom
      left) to type instead.
    </SovereignDescription>
    <SovereignButton onClick={onClose} variant="primary" className="px-10">
      Continue in voice
    </SovereignButton>
  </SovereignCard>
);

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

  const { showOperatorShellChrome, showDeveloperHud, setSurfaceMode } = useShellState();
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
  const { theme, setTheme, resetTheme } = useShellTheme();
  const [voiceRoute, setVoiceRouteState] = useState<VoiceRouteId>(() => getVoiceRoute());
  const [voicePlaybackEngine, setVoicePlaybackEngine] = useState<VoicePlaybackEngine>('idle');
  const [voicePlaybackDetail, setVoicePlaybackDetail] = useState<string | undefined>(undefined);
  const [micEnabled, setMicEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [currentAudioCue, setCurrentAudioCue] = useState<ShellAudioCue | null>(null);
  const [queuedAudioCues, setQueuedAudioCues] = useState<ShellAudioCue[]>([]);
  /** True once the user explicitly picks Voice or Chat from the idle panel — hides the panel. */
  const [shellSessionStarted, setShellSessionStarted] = useState(false);
  /** True while the first-time Loyalty intro sequence is displayed. */
  const [showLoyaltyIntro, setShowLoyaltyIntro] = useState(false);
  const [knowledgePanelInitialTab, setKnowledgePanelInitialTab] = useState<'library' | 'upload'>('library');
  const [sessionEntryClassification, setSessionEntryClassification] =
    useState<SessionEntryClassification>(() => readSessionEntryClassification());
  /** Phone OTP session — gates shell chrome until verified (persisted via onboardingState). */
  const [authSessionActive, setAuthSessionActive] = useState(() => isOtpVerified());
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [gateVoiceIntroActive, setGateVoiceIntroActive] = useState(false);
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

  // Hydrate conversation history from SQLite on boot
  useEffect(() => {
    Promise.all([
      invoke<Array<{ message_id: string; role: string; text: string; timestamp_ms: number }>>('get_conversation_history').catch(() => []),
      invoke<Record<string, string>>('get_active_intent_state').catch(() => ({}))
    ]).then(([history, intentState]) => {
      if (intentState.agentIntent) setAgentIntent(intentState.agentIntent);
      if (intentState.userIntent) setUserIntent(intentState.userIntent);
      
      const greeting = intentState.greetingMessage || "Welcome to AI OS. How can I help you today?";

      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.message_id,
            role: m.role as 'user' | 'agent',
            text: m.text,
            timestamp: new Date(m.timestamp_ms),
          }))
        );
      } else {
        setMessages([{
          id: '1',
          role: 'agent',
          text: greeting,
          timestamp: new Date(),
        }]);
      }
    });
  }, []);

  /** Fire-and-forget: persist a finalised message to SQLite. No-op in browser mode. */
  function persistMessage(msg: Message) {
    if (!isTauri) return;
    void invoke('append_conversation_message', {
      message: {
        message_id: msg.id,
        role: msg.role,
        text: msg.text,
        timestamp_ms: msg.timestamp.getTime(),
      },
    }).catch(() => { /* DB write failed — not critical */ });
  }

  const [chatInput, setChatInput] = useState("");
  const [workspaceConnecting, setWorkspaceConnecting] = useState(false);
  /** Files imported by the user — injected into the next LLM system prompt. */
  const [importedFiles, setImportedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [localModelReadiness, setLocalModelReadiness] = useState<LocalModelReadiness | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [onboardingProfile, setOnboardingProfile] = useState(
    () => readOnboardingProfile(),
  );

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

  const openShellMenuById = useCallback((menuId: ShellMenuId) => {
    setShellMenuStore((prev) => {
      const entry = prev.registry_by_id[menuId];
      if (!entry) {
        return prev;
      }
      const nextLevelId =
        prev.ui.active_level_id_by_menu_id[menuId] ?? entry.record.levels[0]?.level_id ?? '';
      return {
        ...prev,
        ui: {
          ...prev.ui,
          active_menu_id: menuId,
          menu_stack:
            entry.parent_menu_id && entry.launch_mode === 'push_child'
              ? [...prev.ui.menu_stack.filter((id) => id !== menuId), menuId]
              : [menuId],
          is_open_by_menu_id: { [menuId]: true },
          active_level_id_by_menu_id: {
            ...prev.ui.active_level_id_by_menu_id,
            [menuId]: nextLevelId,
          },
        },
        revision: prev.revision + 1,
      };
    });
  }, []);

  const closeShellMenus = useCallback(() => {
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        active_menu_id: null,
        menu_stack: [],
        is_open_by_menu_id: {},
      },
      recording:
        prev.recording.capture_status === 'recording'
          ? prev.recording
          : {
              ...prev.recording,
              capture_status: 'idle',
              ptt_binding_enabled: false,
            },
      revision: prev.revision + 1,
    }));
  }, []);

  const setHeaderMenuOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = shellMenuStore.ui.is_open_by_menu_id['shell-header-system'] === true;
      const value = typeof next === 'function' ? next(current) : next;
      if (value) {
        openShellMenuById('shell-header-system');
        return;
      }
      closeShellMenus();
    },
    [closeShellMenus, openShellMenuById, shellMenuStore.ui.is_open_by_menu_id],
  );

  const setFooterMenuOpen = useCallback(
    (next: boolean | ((current: boolean) => boolean)) => {
      const current = shellMenuStore.ui.is_open_by_menu_id['shell-footer-user'] === true;
      const value = typeof next === 'function' ? next(current) : next;
      if (value) {
        openShellMenuById('shell-footer-user');
        return;
      }
      closeShellMenus();
    },
    [closeShellMenus, openShellMenuById, shellMenuStore.ui.is_open_by_menu_id],
  );

  const headerMenuOpen = shellMenuStore.ui.is_open_by_menu_id['shell-header-system'] === true;
  const footerMenuOpen = shellMenuStore.ui.is_open_by_menu_id['shell-footer-user'] === true;
  const setShellMenuRecordingState = useCallback(
    (
      updater:
        | Partial<ShellMenuStoreState['recording']>
        | ((recording: ShellMenuStoreState['recording']) => ShellMenuStoreState['recording']),
    ) => {
      setShellMenuStore((prev) => ({
        ...prev,
        recording:
          typeof updater === 'function'
            ? updater(prev.recording)
            : { ...prev.recording, ...updater },
        revision: prev.revision + 1,
      }));
    },
    [],
  );

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
    setAuthSessionActive(false);
    window.location.reload();
  }, []);

  const handleAuthVerified = useCallback((phone: string) => {
    markOtpVerified();
    setAuthSessionActive(true);
    setAuthPanelOpen(false);
    setGateVoiceIntroActive(false);
    const existing = readOnboardingProfile();
    const openProjectBuilder = postAuthOpenProjectBuilderRef.current;
    postAuthOpenProjectBuilderRef.current = false;
    writeOnboardingProfile({
      commander_name: existing?.commander_name?.trim() || 'Operator',
      interface_mode: existing?.interface_mode ?? 'voice',
      arrival_type: openProjectBuilder ? 'new' : 'returning',
      enrolled_at: existing?.enrolled_at ?? Date.now(),
      phone_number: phone,
    });
    setShellSessionStarted(true);
    if (openProjectBuilder) {
      queueMicrotask(() => setMode('coding_agent'));
    }
  }, []);

  const engageSessionEntry = useCallback(() => {
    markSessionEntryEngaged();
    setSessionEntryClassification('returning');
  }, []);

  /** Called when the user clicks "Start AI OS" on the landing panel. */
  const handleLandingStart = useCallback(() => {
    if (!hasSeenLoyaltyIntro()) {
      setShowLoyaltyIntro(true);
    } else {
      engageSessionEntry();
      setShellSessionStarted(true);
    }
  }, [engageSessionEntry]);

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

  /**
   * Ask the Rust kernel to snapshot the webview and store the result.
   * Fire-and-forget — failures are silently swallowed; the frame ref stays stale rather than crashing.
   */
  const captureFrame = useCallback(() => {
    if (!isTauri) return;
    invoke<string>('capture_visual_context')
      .then((b64) => { latestFrameRef.current = b64; })
      .catch(() => { /* window minimised */ });
  }, []);

  // Re-capture whenever the active canvas view changes (new workspace surface opened).
  useEffect(() => {
    captureFrame();
  }, [workspaceCanvas?.view, captureFrame]);

  useEffect(() => {
    if (!isTauri) return undefined;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen('open_coding_agent', () => {
        if (!cancelled) setMode('coding_agent');
      });
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

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
    tryApplyShellNavigationAction(
      { type: 'set_voice_chat_mode', mode: target === 'chat' ? 'chat' : 'voice' },
      readInterimShellAuthority(),
      shellApplyHandlers,
    );
  }, [mode, recordInteraction, shellApplyHandlers]);

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
    null | 'overlay_color' | 'overlay_opacity' | 'overlay_width' | 'canvas_padding'
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

  // Tauri IPC Listener for real-time LLM token streaming from Rust kernel
  // This enables the "lightning fast" streaming UX described in the blueprint
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      // Check if the Tauri IPC bridge exists on the window object
      const isTauriRuntime = '__TAURI_IPC__' in window;

      if (!isTauriRuntime) {
        console.warn("Browser Mode Detected: Skipping Tauri event listener setup.");
        return;
      }

      try {
        const unlistenFn = await listen<string>('llm_token', (event) => {
          console.log("New LLM token from kernel:", event.payload);
          
          // Append token to the latest agent message for streaming effect
          setMessages(prev => {
            const targetId = activeAgentMessageIdRef.current;
            if (!targetId) return prev;
            const targetIndex = prev.findIndex((msg) => msg.id === targetId && msg.role === 'agent');
            if (targetIndex === -1) return prev;
            const targetMessage = prev[targetIndex];
            const updatedTarget = {
              ...targetMessage,
              text: targetMessage.text.replace('Thinking with local Ollama kernel...', '') + event.payload
            };
            return [
              ...prev.slice(0, targetIndex),
              updatedTarget,
              ...prev.slice(targetIndex + 1),
            ];
          });
        });

        if (cancelled) {
          // Cleanup already ran before the await resolved — remove listener immediately
          activeAgentMessageIdRef.current = null;
          unlistenFn();
        } else {
          unlisten = () => {
            activeAgentMessageIdRef.current = null;
            unlistenFn();
          };
        }
      } catch (err) {
        console.error('Failed to setup Tauri event listener:', err);
      }
    };

    setupListener();

    return () => {
      cancelled = true;
      unlisten?.();
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

  const stopSpeech = useCallback(() => {
    VoiceboxClient.stop();
    if (geminiVoiceEngineRef.current) {
      void geminiVoiceEngineRef.current.stop();
    }
    setStatus((current) => (current === 'speaking' ? 'connected' : current));
    setCurrentAudioCue((current) => current ? { ...current, status: 'stopped' } : current);
    setTranscription('');
  }, []);

  const handlePlayPauseCue = useCallback(() => {
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
  }, [currentAudioCue, playAudioCue, queuedAudioCues, speakerEnabled, status, stopSpeech]);

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

        const agentMessageId = (Date.now() + 1).toString();
        activeAgentMessageIdRef.current = agentMessageId;

        // ── Visual Grounding: call the same-origin Gemini gateway when a frame is available ──
        const frameBase64 = latestFrameRef.current;
        if (frameBase64) {
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
            console.warn('[Visual Grounding] Gemini gateway multimodal failed, falling back to local kernel:', geminiErr);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === agentMessageId
                  ? { ...msg, text: 'Screen analysis unavailable — switching to text response.' }
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
            const systemPrompt = buildGroundedSystemPrompt(
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
            console.warn('[Gemini gateway text-only] failed, falling back to Ollama:', geminiTextErr);
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
            systemPrompt: buildSystemPrompt({
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
                  systemPrompt: buildSystemPrompt({
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
    ],
  );

  const handleExplainVibeTopic = useCallback(
    (topic: VibeTopicId) => {
      engageSessionEntry();
      void submitIntentText(VIBE_TOPIC_USER_PROMPTS[topic], 'voice', { appendUserMessage: true });
    },
    [engageSessionEntry, submitIntentText],
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

            // Run deterministic shortcut scanner
            const shortcutReport = await heuristicShortcutScanner.scanProject(baseline, {
              'src/App.tsx': '<div style={{ marginTop: "43px" }} />', // Simulated file content
              'src/api.ts': 'catch (e) {}', // Simulated file content
            });
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

    // Run deterministic shortcut scanner
    const shortcutReport = await heuristicShortcutScanner.scanProject(baseline, {
      'src/App.tsx': '<div style={{ marginTop: "43px" }} />', // Simulated file content
      'src/api.ts': 'catch (e) {}', // Simulated file content
    });
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
    () => promptContract.loyaltyLabel.toLowerCase().includes('user') ? 'User Loyalty' : 'Platform Loyalty',
    [promptContract.loyaltyLabel],
  );

  const shellHeaderSubtitle = useMemo(() => {
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
  }, [currentAudioCue, micEnabled, queuedAudioCues.length, speakerEnabled, status, voicePlaybackEngine]);

  const displayStatusDetail = useMemo(() => {
    if (showDiagnosticsChrome) return undefined;
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
  }, [currentAudioCue, kernelVerbosityLevel, micEnabled, mode, queuedAudioCues.length, showDiagnosticsChrome, speakerEnabled, status, workspaceCanvas]);

  const showVoiceIdleOrientation =
    !shellSessionStarted &&
    mode === 'voice' &&
    !workspaceCanvas &&
    !showDiagnosticsChrome &&
    status !== 'processing' &&
    (status !== 'speaking' || showLoyaltyIntro || currentAudioCue?.source === 'onboarding') &&
    !(isPTTActive && status === 'listening') &&
    !transcription.trim();

  const shellTheme = useMemo<ShellGlassTheme>(
    () => ({
      chromeClassName: 'bg-slate-950/58 backdrop-blur-md',
      panelClassName: 'border-white/15 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.85)]',
      accentBadgeClassName: 'border border-emerald-300/25 bg-emerald-400/20 text-emerald-100',
      textClassName: 'text-slate-50',
      mutedTextClassName: 'text-slate-300/70',
      statusOkClassName: 'text-emerald-300',
      statusMutedClassName: 'text-slate-300/60',
      statusErrorClassName: 'text-rose-300',
      inputClassName: 'border border-white/15 bg-slate-950/55 text-slate-50 placeholder:text-slate-400/60 backdrop-blur-md',
      primaryButtonClassName: 'border border-emerald-300/35 bg-emerald-500/85 text-white backdrop-blur-md hover:bg-emerald-400/90',
      secondaryButtonClassName: 'border border-white/15 bg-white/8 text-slate-100 backdrop-blur-md hover:bg-white/12',
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
  const footerMenuPermitted = kernelAllowsComponent('shell_footer_user_menu');
  const [dynamicMenuRegistry, setDynamicMenuRegistry] = useState<Record<ShellMenuId, ShellMenuRegistryEntry>>(CENTRAL_SHELL_MENU_REGISTRY);

  useEffect(() => {
    // Load the menu registry dynamically from the database on boot via the new resolve_intent_menu command.
    invoke<Record<ShellMenuId, ShellMenuRegistryEntry>>('resolve_intent_menu')
      .then((registry) => {
        if (registry && Object.keys(registry).length > 0) {
          setDynamicMenuRegistry(registry);
        }
      })
      .catch((err) => {
        console.warn('Failed to resolve intent menu from backend, falling back to central registry:', err);
      });
  }, [authSessionActive]); // Re-resolve when OTP session changes

  const shellMenuRegistry = useMemo<Record<ShellMenuId, ShellMenuRegistryEntry>>(() => {
    const headerSystemMenu = dynamicMenuRegistry['shell-header-system'];
    const footerUserMenu = dynamicMenuRegistry['shell-footer-user'];
    const systemControlsMenu = dynamicMenuRegistry['system-controls'];

    const merged = {
      ...dynamicMenuRegistry,
      'shell-header-system': headerSystemMenu ? {
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
      } : undefined,
      'shell-footer-user': footerUserMenu ? {
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
      } : undefined,
      'system-controls': systemControlsMenu ? {
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
      } : undefined,
    } as Record<ShellMenuId, ShellMenuRegistryEntry>;

    return filterShellMenuRegistryForAuth(merged, authSessionActive ? 'authenticated' : 'guest');
  }, [dynamicMenuRegistry, activeVoiceLabel, powerChromeState, showDiagnosticsChrome, workspaceSurfaceOpen, authSessionActive]);

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
  const activeShellMenuId = shellMenuStore.ui.active_menu_id;
  const activeShellMenuEntry = activeShellMenuId
    ? shellMenuStore.registry_by_id[activeShellMenuId]
    : null;
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
  useEffect(() => {
    voiceboxRecordingChunksRef.current = shellMenuStore.recording.capture_chunks;
  }, [shellMenuStore.recording.capture_chunks]);

  const setShellMenuLevel = useCallback((menuId: ShellMenuId, levelId: string) => {
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        active_level_id_by_menu_id: {
          ...prev.ui.active_level_id_by_menu_id,
          [menuId]: levelId,
        },
        selected_action_id_by_menu_id: {
          ...prev.ui.selected_action_id_by_menu_id,
          [menuId]: undefined,
        },
      },
      revision: prev.revision + 1,
    }));
  }, []);

  const clearShellMenuSelectedAction = useCallback((menuId: ShellMenuId) => {
    setShellMenuStore((prev) => {
      const nextSelectedActions = { ...prev.ui.selected_action_id_by_menu_id };
      delete nextSelectedActions[menuId];
      return {
        ...prev,
        ui: {
          ...prev.ui,
          selected_action_id_by_menu_id: nextSelectedActions,
        },
        recording:
          menuId === 'voice-box'
            ? {
                ...prev.recording,
                capture_status:
                  prev.recording.capture_status === 'recording' ? prev.recording.capture_status : 'idle',
                ptt_binding_enabled:
                  prev.recording.capture_status === 'recording' ? prev.recording.ptt_binding_enabled : false,
              }
            : prev.recording,
        revision: prev.revision + 1,
      };
    });
  }, []);

  const markShellMenuActionSelected = useCallback((menuId: ShellMenuId | null, actionId: string) => {
    if (!menuId) {
      return;
    }
    setShellMenuStore((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        selected_action_id_by_menu_id: {
          ...prev.ui.selected_action_id_by_menu_id,
          [menuId]: actionId,
        },
      },
      revision: prev.revision + 1,
    }));
  }, []);

  const handleShellMenuAction = useCallback(
    async (actionId: string) => {
      engageSessionEntry();
      setShellSessionStarted(true);
      markShellMenuActionSelected(activeShellMenuId ?? shellMenuStore.ui.active_menu_id, actionId);

      switch (actionId) {
        case 'open_workspace':
          openWorkspaceHub();
          return;
        case 'open_user_storage':
          closeShellMenus();
          setMode('user_storage');
          return;
        case 'open_voice_control':
        case 'open_menu_voice_control':
          setMode('voice');
          openShellMenuById('voice-control');
          return;
        case 'open_menu_voice_box':
          setMode('voice');
          openShellMenuById('voice-box');
          return;
        case 'open_podcasts':
          handleOpenPodcasts();
          return;
        case 'open_menu_appearance':
          setMode('voice');
          openShellMenuById('appearance');
          return;
        case 'open_menu_agent_identity':
          setMode('voice');
          openShellMenuById('agent-identity');
          return;
        case 'open_arch_protocol_reference':
          closeShellMenus();
          setMode('intent_settings');
          return;
        case 'open_disc_settings':
          closeShellMenus();
          setMode('disc_settings');
          return;
        case 'open_api_health':
          closeShellMenus();
          if (showDiagnosticsChrome) {
            setMode('api_health');
          }
          return;
        case 'open_knowledge':
          handleOpenKnowledgePanel('library');
          return;
        case 'open_transparency':
          closeShellMenus();
          setMode('transparency');
          return;
        case 'open_coding_agent':
          closeShellMenus();
          setMode('coding_agent');
          return;
        case 'system_logout':
          if (powerChromeState === 'signed_in') {
            closeShellMenus();
            handleLogout();
          }
          return;
        case 'system_quit_app':
          await tryQuitApplication();
          return;
        case 'set_voice_route_gemini':
          applyVoiceRoute('gemini');
          return;
        case 'set_voice_route_voicebox':
          applyVoiceRoute('voicebox');
          return;
        case 'set_voice_route_browser':
          applyVoiceRoute('browser');
          return;
        case 'appearance_set_dark_mode':
          setTheme({ colorScheme: 'dark' });
          return;
        case 'appearance_set_light_mode':
          setTheme({ colorScheme: 'light' });
          return;
        case 'appearance_reset_defaults':
          resetTheme();
          return;
        case 'appearance_set_background_live_effects':
          setTheme({ backgroundType: 'canvas', customBgKind: null, customBgPath: null });
          return;
        case 'appearance_open_overlay_color':
          closeShellMenus();
          setAppearanceTune('overlay_color');
          return;
        case 'appearance_open_overlay_opacity':
          closeShellMenus();
          setAppearanceTune('overlay_opacity');
          return;
        case 'appearance_open_overlay_width':
          closeShellMenus();
          setAppearanceTune('overlay_width');
          return;
        case 'appearance_open_canvas_padding':
          closeShellMenus();
          setAppearanceTune('canvas_padding');
          return;
        case 'appearance_open_custom_background': {
          if (!isTauri) return;
          const result = await invoke<[string, string] | null>('pick_file');
          if (!result?.[0]) return;
          const path = result[0];
          const ext = path.split('.').pop()?.toLowerCase() ?? '';
          const video = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
          setTheme({
            backgroundType: 'custom',
            customBgPath: path,
            customBgKind: video ? 'video' : 'image',
          });
          return;
        }
        case 'appearance_open_background_library': {
          const idx = SHADCN_BACKGROUND_ITEMS.findIndex((i) => i.id === theme.canvasBackgroundId);
          const next = SHADCN_BACKGROUND_ITEMS[(Math.max(0, idx) + 1) % SHADCN_BACKGROUND_ITEMS.length];
          setTheme({
            backgroundType: 'canvas',
            customBgKind: null,
            customBgPath: null,
            canvasBackgroundId: next.id,
          });
          return;
        }
        case 'open_voicebox_profiles': {
          await refreshVoiceboxRecordingState();
          setMode('voice');
          openShellMenuById('voice-box');
          return;
        }
        case 'open_voicebox_create': {
          await refreshVoiceboxRecordingState();
          setMode('voice');
          openShellMenuById('voice-box');
          return;
        }
        case 'open_voicebox_upload': {
          const archivePath = await VoiceboxClient.pickArchivePath();
          if (!archivePath) return;
          const profile = await VoiceboxClient.importProfileArchive(archivePath);
          await refreshVoiceboxRecordingState();
          selectVoiceboxRecordingProfile(profile.id);
          await activateVoiceboxProfile(profile.id);
          return;
        }
        case 'open_voicebox_record':
          setShellMenuRecordingState((recording) => ({
            ...recording,
            capture_status: recording.active_profile_id ? 'armed' : 'idle',
            capture_chunks: [],
            last_error: null,
            ptt_binding_enabled: Boolean(recording.active_profile_id),
          }));
          await refreshVoiceboxRecordingState();
          return;
        default:
          return;
      }
    },
    [
      activateVoiceboxProfile,
      activeShellMenuId,
      agentCompany,
      agentIntent,
      agentName,
      agentRole,
      applyVoiceRoute,
      closeShellMenus,
      desiredOutcome,
      engageSessionEntry,
      handleLogout,
      handleOpenKnowledgePanel,
      handleOpenPodcasts,
      markShellMenuActionSelected,
      openShellMenuById,
      openWorkspaceHub,
      powerChromeState,
      resetTheme,
      refreshVoiceboxRecordingState,
      setAppearanceTune,
      selectVoiceboxRecordingProfile,
      setTheme,
      setShellMenuRecordingState,
      shellMenuStore.ui.active_menu_id,
      showDiagnosticsChrome,
      theme,
      userIntent,
      isTauri,
    ],
  );
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
        onOpenMenu={() => {
          engageSessionEntry();
          setFooterMenuOpen(false);
          setHeaderMenuOpen((current) => !current);
        }}
        onSelectMode={(selectedMode) => {
          engageSessionEntry();
          setShellSessionStarted(true);
          setMode(selectedMode);
        }}
        onStart={handleLandingStart}
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
      setAuthPanelOpen(true);
      return;
    }
    if (!footerMenuPermitted) {
      setMode('create_account');
      return;
    }
    engageSessionEntry();
    setHeaderMenuOpen(false);
    setFooterMenuOpen((current) => !current);
  }, [authSessionActive, engageSessionEntry, footerMenuPermitted, setFooterMenuOpen, setHeaderMenuOpen, setMode]);

  if (publicPodcastId) {
    return (
      <Suspense fallback={null}>
        <LazyPublicPodcastPage episodeId={publicPodcastId} />
      </Suspense>
    );
  }

  if (!authSessionActive) {
    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden font-sans selection:bg-emerald-500/30"
        style={themeToCssVars(theme)}
        data-color-scheme={theme.colorScheme}
      >
        <ShellBackground theme={theme} />

        {/* Shell chrome is always present — governance requires header + footer on every surface */}
        <ShellIdentityBar
          sessionLabel="AI OS"
          shellInteractionMode="voice"
          sessionContextLabel="Home"
          workspaceState={workspaceDisclosure as any}
          canvasView={null}
          voiceInputAvailable={voicePttPermitted}
          intentSummary={shellIntentLabel}
          localModelReadiness={localModelReadiness}
          showDiagnosticsChrome={showDiagnosticsChrome}
          commanderName={undefined}
          onOpenSystemControls={undefined}
          onOpenTransparency={undefined}
          headerMenuRecord={undefined}
          headerMenuOpen={false}
          onToggleHeaderMenu={() => setAuthPanelOpen(true)}
          onCloseHeaderMenu={() => {}}
          powerChromeState={powerChromeState}
          voiceModelLabel={activeVoiceLabel}
          loyaltySummary={loyaltyBadgeLabel}
          availableSkillsCount={0}
          statusSubtitle={shellHeaderSubtitle}
          playbackActive={status === 'speaking'}
          micEnabled={micEnabled}
          speakerEnabled={speakerEnabled}
          currentCueLabel={currentAudioCue?.label}
          audioCues={[
            ...(currentAudioCue ? [{ id: currentAudioCue.id, label: currentAudioCue.label, status: currentAudioCue.status }] : []),
            ...queuedAudioCues.map((cue) => ({ id: cue.id, label: cue.label, status: cue.status })),
          ]}
          onTogglePlayback={handlePlayPauseCue}
          onToggleMic={handleToggleMic}
          onToggleSpeaker={handleToggleSpeaker}
        />

        <AnimatePresence>
          {gateVoiceIntroActive && (
            <LoyaltyIntroSequence
              key="gate-intro"
              speakText={(text, cueLabel) => void speakText(text, undefined, cueLabel, 'onboarding')}
              stopSpeech={stopSpeech}
              onComplete={() => {
                setGateVoiceIntroActive(false);
                // Only open auth if the intro was triggered by "Join the Community".
                // "Explore AI OS" (vibe check) sets postAuthOpenProjectBuilderRef to null
                // to signal we should return to the gate rather than push to auth.
                if (postAuthOpenProjectBuilderRef.current) {
                  setAuthPanelOpen(true);
                }
              }}
            />
          )}
        </AnimatePresence>

        {!gateVoiceIntroActive ? (
          <OnboardingGate
            onVibeCheck={() => {
              // Path 1 — DEMONSTRATE_CAPABILITIES: show voice intro, return to gate after.
              postAuthOpenProjectBuilderRef.current = false;
              setGateVoiceIntroActive(true);
            }}
            onJoinCommunity={() => {
              // Path 2 — SALES_FUNNEL + FRICTIONLESS_ONBOARDING: skip intro, open auth directly.
              postAuthOpenProjectBuilderRef.current = true;
              setGateVoiceIntroActive(false);
              setAuthPanelOpen(true);
            }}
            onReturningUser={() => {
              // Path 3 — ACCESS_SYSTEM_DESKTOP: open auth to restore existing session.
              postAuthOpenProjectBuilderRef.current = false;
              setGateVoiceIntroActive(false);
              setAuthPanelOpen(true);
            }}
          />
        ) : null}

        <CommandRail
          rail={{
            mode: 'voice',
            primaryAction: 'ptt',
            systemStatus: status === 'listening' ? 'listening' : status === 'processing' ? 'processing' : status === 'speaking' ? 'speaking' : 'idle',
            intent: shellIntentLabel,
          }}
          mode="voice"
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
          loyaltySummary={loyaltyBadgeLabel}
          statusTone={status === 'error' ? 'error' : status === 'offline' ? 'muted' : 'ok'}
          showDiagnosticsChrome={showDiagnosticsChrome}
          footerMenuRecord={undefined}
          footerMenuOpen={false}
          onProfilePress={() => setAuthPanelOpen(true)}
        />

        {authPanelOpen ? (
          <AuthPanel
            onClose={() => {
              postAuthOpenProjectBuilderRef.current = false;
              setAuthPanelOpen(false);
            }}
            onVerified={handleAuthVerified}
          />
        ) : null}
        {showDeveloperHud ? <ScopeMetricsDevHud /> : null}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 font-sans overflow-hidden selection:bg-emerald-500/30"
      style={themeToCssVars(theme)}
      data-color-scheme={theme.colorScheme}
      data-kernel-verbosity={kernelVerbosityLevel}
    >
      {/* Dynamic background + overlay tint */}
      <ShellBackground theme={theme} />
      <ShellIdentityBar
        sessionLabel="Local Session"
        shellInteractionMode={mode === 'chat' ? 'chat' : 'voice'}
        sessionContextLabel={workspaceCanvas?.view ? workspaceCanvas.view.replace(/_/g, ' ') : 'Home'}
        workspaceState={workspaceDisclosure as any}
        canvasView={workspaceCanvas?.view}
        voiceInputAvailable={voicePttPermitted}
        intentSummary={shellIntentLabel}
        localModelReadiness={localModelReadiness}
        showDiagnosticsChrome={showDiagnosticsChrome}
        commanderName={commanderName ?? undefined}
        onOpenSystemControls={() => openShellMenuById('system-controls')}
        onOpenTransparency={() => setMode('transparency')}
        headerMenuRecord={headerMenuPermitted ? headerSystemMenuRecord : undefined}
        headerMenuOpen={headerMenuOpen}
        onToggleHeaderMenu={() => {
          engageSessionEntry();
          setFooterMenuOpen(false);
          setHeaderMenuOpen((current) => !current);
        }}
        onCloseHeaderMenu={() => setHeaderMenuOpen(false)}
        powerChromeState={powerChromeState}
        voiceModelLabel={activeVoiceLabel}
        loyaltySummary={loyaltyBadgeLabel}
        availableSkillsCount={kernelState?.available_skills?.length ?? 0}
        statusSubtitle={shellHeaderSubtitle}
        playbackActive={status === 'speaking'}
        micEnabled={micEnabled}
        speakerEnabled={speakerEnabled}
        currentCueLabel={currentAudioCue?.label}
        audioCues={[
          ...(currentAudioCue ? [{ id: currentAudioCue.id, label: currentAudioCue.label, status: currentAudioCue.status }] : []),
          ...queuedAudioCues.map((cue) => ({ id: cue.id, label: cue.label, status: cue.status })),
        ]}
        onTogglePlayback={handlePlayPauseCue}
        onToggleMic={handleToggleMic}
        onToggleSpeaker={handleToggleSpeaker}
      />

      {shellMenuStore.context.auth_status === 'authenticated' && !activeShellMenuEntry && (
        <div className="absolute inset-0 z-[var(--z-shell-workspace-canvas)] pointer-events-none">
          <div className="pointer-events-auto h-full w-full">
            <VirtualDesktopEnvironment authStatus={shellMenuStore.context.auth_status} />
          </div>
        </div>
      )}

      <ShellContentZone
        theme={shellTheme}
        mode={mode === 'chat' ? 'chat' : 'voice'}
        messages={transcriptMessages}
        transcription={transcription}
        centerStage={voiceCenterStage}
        chatEndRef={chatEndRef}
      />

      <AnimatePresence>
        {activeShellMenuEntry && (activeShellMenuEntry.menu_id !== 'shell-header-system' || headerMenuPermitted) ? (
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
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-[var(--z-shell-chrome)]"
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
            <SovereignCard className="max-w-md w-full border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl">
              <SovereignTitle level={2} className="text-[var(--panel-heading)]">
                {appearanceTune === 'overlay_color' && 'Overlay tint color'}
                {appearanceTune === 'overlay_opacity' && 'Overlay opacity'}
                {appearanceTune === 'overlay_width' && 'Overlay width'}
                {appearanceTune === 'canvas_padding' && 'Canvas padding'}
              </SovereignTitle>
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
                The AI Agent has triggered the account creation flow. Please sign up to authenticate and unlock the Virtual Desktop Environment.
              </p>
              <div className="flex flex-col gap-3">
                <input type="text" placeholder="Email" className="bg-[var(--panel-input-bg)] border border-[var(--panel-input-border)] text-[var(--panel-text)] p-2 rounded-md" />
                <input type="password" placeholder="Password" className="bg-[var(--panel-input-bg)] border border-[var(--panel-input-border)] text-[var(--panel-text)] p-2 rounded-md" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setMode('voice')} className="px-4 py-2 text-[var(--panel-text-muted)] hover:text-[var(--panel-text)]">Cancel</button>
                <button 
                  onClick={() => {
                    invoke('initialize_smart_contract').catch(console.warn);
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
            <LazySessionKnowledgePanel initialTab={knowledgePanelInitialTab} onClose={() => setMode('voice')} />
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
            className="absolute inset-0 flex items-start sm:items-center justify-center bg-zinc-900/[0.05] backdrop-blur-[2px] overflow-y-auto pt-[calc(var(--shell-header-height)+0.75rem)] pb-[var(--shell-footer-height)] z-[var(--z-shell-workspace-canvas)] min-h-0"
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
          className="fixed bottom-[calc(var(--shell-footer-height)+0.6rem)] right-6 z-[var(--z-shell-chrome)] flex items-center justify-center w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-cyan-300 transition-all"
        >
          <Paperclip size={16} />
        </button>
      )}

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

