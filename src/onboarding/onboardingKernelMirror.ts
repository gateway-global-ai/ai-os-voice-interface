/**
 * Mirrors `src-tauri/src/state_machine/onboarding.rs` when Tauri `process_intent`
 * is unavailable (e.g. Vite in a normal browser). Keeps the same intent JSON shape.
 */
import { CHECKME_EXTERNAL_OTP_MARKER } from '../config/identityVerification';
import type { CategoryNode, OsStateSnapshot } from '../kernel/types';

export type MirrorPhase =
  | 'landing'
  | 'mode_select'
  | 'commander_name'
  | 'returning_phone'
  | 'returning_otp'
  /** Client-side injected step: Model Arena — shown before planet_overview */
  | 'model_arena'
  /** Client-side injected step: Intent Engine Demo — shown before planet_overview */
  | 'intent_demo'
  /** Client-side injected step: 3P Focus System Intro — shown before planet_overview */
  | 'three_p_intro'
  /** Client-side injected step: Viral Invite Loop — shown before planet_overview */
  | 'invite'
  | 'planet_overview'
  | 'complete';

const UI: Record<MirrorPhase, string> = {
  landing: 'onboarding_landing',
  mode_select: 'onboarding_mode_select',
  commander_name: 'onboarding_commander_name',
  returning_phone: 'onboarding_returning_phone',
  returning_otp: 'onboarding_returning_otp',
  // Client-side injected — no kernel permit required; handled by OnboardingFlow.injectedStep
  model_arena: 'onboarding_model_arena',
  intent_demo: 'onboarding_intent_demo',
  three_p_intro: 'onboarding_three_p_intro',
  invite: 'onboarding_invite',
  planet_overview: 'onboarding_planet_overview',
  complete: 'onboarding_complete',
};

function demoPlanetNodes(): CategoryNode[] {
  return [
    {
      id: 'lessons',
      category_name: 'Lessons',
      tasks: [
        {
          id: 'intro',
          title: 'Introduction to AI OS',
          description: 'A quick tour of what AI OS is.',
          status: 'pending',
          requires_action: false,
        },
      ],
    },
    {
      id: 'onboarding_tasks',
      category_name: 'Onboarding Tasks',
      tasks: [
        {
          id: 'config_workspace',
          title: 'Configure Google Workspace',
          description: 'Connect Google Workspace for calendar, email, and drive.',
          status: 'pending',
          requires_action: true,
        },
      ],
    },
  ];
}

export function snapshotFromMirrorPhase(phase: MirrorPhase): OsStateSnapshot {
  return {
    current_intent: 'onboarding',
    status: 'active',
    active_context_pointer: '',
    current_verbosity_level: 'sentence',
    permitted_ui_components: [UI[phase]],
    available_skills: [],
    active_project_nodes: phase === 'planet_overview' ? demoPlanetNodes() : null,
  };
}

/** Map first permitted id → mirror phase (inverse of snapshotFromMirrorPhase). */
export function phaseFromSnapshot(s: OsStateSnapshot | null): MirrorPhase {
  const id = s?.permitted_ui_components?.[0];
  const rev: Record<string, MirrorPhase> = {
    onboarding_landing: 'landing',
    onboarding_mode_select: 'mode_select',
    onboarding_commander_name: 'commander_name',
    onboarding_returning_phone: 'returning_phone',
    onboarding_returning_otp: 'returning_otp',
    onboarding_model_arena: 'model_arena',
    onboarding_intent_demo: 'intent_demo',
    onboarding_three_p_intro: 'three_p_intro',
    onboarding_invite: 'invite',
    onboarding_planet_overview: 'planet_overview',
    onboarding_complete: 'complete',
  };
  return id ? rev[id] ?? 'landing' : 'landing';
}

type IntentPayload = { type: string; payload?: unknown };

export function transitionMirrorPhase(phase: MirrorPhase, intent: IntentPayload): MirrorPhase {
  const { type, payload } = intent;
  switch (phase) {
    case 'landing':
      if (type === 'SubmitArrivalType') {
        return payload === 'returning' ? 'returning_phone' : 'mode_select';
      }
      break;
    case 'mode_select':
      if (type === 'SubmitInterfaceMode') return 'commander_name';
      break;
    case 'commander_name':
      if (type === 'SubmitCommanderName') return 'returning_phone';
      break;
    case 'returning_phone':
      if (type === 'SubmitPhoneNumber') return 'returning_otp';
      break;
    case 'returning_otp':
      if (type === 'SubmitOTP') {
        const otp = String(payload ?? '');
        const ok =
          otp === CHECKME_EXTERNAL_OTP_MARKER || (/^\d{6}$/.test(otp) && /^\d+$/.test(otp));
        if (ok) return 'planet_overview';
      }
      if (type === 'GoBack') return 'returning_phone';
      break;
    case 'planet_overview':
      if (type === 'CompleteOnboarding') return 'complete';
      return phase;
    case 'complete':
      break;
    default:
      break;
  }
  return phase;
}
