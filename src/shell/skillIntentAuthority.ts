import type { DesktopSubPath } from './intentManager';
import type { InterimShellAuthority } from './shellAuthority';

export type SkillToolClass = 'read' | 'write' | 'execute' | 'network' | 'browser' | 'database' | 'shell' | 'mcp' | 'unknown';
export type SkillAuthorityLevel = 'guest' | 'primary' | 'developer' | 'operator' | 'blocked';
export type SkillAuthorityDecisionStatus = 'allowed' | 'denied' | 'blocked' | 'unverified';

export type SkillAuthorityProfile = {
  profileId: string;
  shellState: string;
  role: string;
  scope: string;
  authorityLevel: SkillAuthorityLevel;
  desktopSubPath: DesktopSubPath | null;
  allowedSkillPatterns: string[];
  allowedToolClasses: SkillToolClass[];
  deniedToolClasses: SkillToolClass[];
  systemPromptRequirements: string[];
  evidenceRequired: string;
};

export type SkillIntentAuthorityInput = {
  activeSurfaceMode: 'guest' | 'primary' | 'developer' | 'operator' | 'coding_agent' | 'skill_registry';
  authStatus: 'guest' | 'authenticated';
  desktopSubPath: DesktopSubPath | null;
  agentRole: string;
  requestedSkill?: string | null;
  requestedTools?: string[];
  systemPrompt?: string | null;
  skillAllowedTools?: string[];
  interimAuthority?: InterimShellAuthority;
};

export type SkillIntentAuthorityDecision = {
  ok: boolean;
  decision: SkillAuthorityDecisionStatus;
  profileId: string;
  allowedTools: string[];
  deniedTools: string[];
  reason: string;
  evidenceRequired: string;
};

export const SKILL_RELATED_SHELL_ACTION_IDS = new Set([
  'open_skill_registry',
  'open_vcu_cursor_pack',
  'open_vibe_code_lab',
]);

export const DEFAULT_SKILL_AUTHORITY_PROFILES: SkillAuthorityProfile[] = [
  {
    profileId: 'shell-guest-readonly',
    shellState: 'guest',
    role: 'visitor',
    scope: 'public learning and account entry only',
    authorityLevel: 'guest',
    desktopSubPath: null,
    allowedSkillPatterns: ['public.*', 'vcu.intro'],
    allowedToolClasses: ['read'],
    deniedToolClasses: ['write', 'execute', 'database', 'shell', 'network', 'browser', 'mcp'],
    systemPromptRequirements: ['must disclose platform loyalty', 'must not claim user account authority'],
    evidenceRequired: 'Account verification or explicit shell transition before privileged skills are exposed.',
  },
  {
    profileId: 'shell-primary-user',
    shellState: 'primary',
    role: 'authenticated_user',
    scope: 'ordinary user-facing shell actions',
    authorityLevel: 'primary',
    desktopSubPath: null,
    allowedSkillPatterns: ['workspace.read.*', 'vcu.*', 'skill.registry.read'],
    allowedToolClasses: ['read', 'browser'],
    deniedToolClasses: ['database', 'shell', 'execute', 'mcp'],
    systemPromptRequirements: ['must act in signed-in user interest', 'must disclose bounded shell state'],
    evidenceRequired: 'Authenticated shell session and skill-specific allowed-tools metadata.',
  },
  {
    profileId: 'shell-developer-bounded',
    shellState: 'developer',
    role: 'developer_operator',
    scope: 'code review, local validation, and approved skill installation planning',
    authorityLevel: 'developer',
    desktopSubPath: 'CODING' as DesktopSubPath,
    allowedSkillPatterns: ['rust.*', 'skillshub.*', 'skills.*', 'cursor.*'],
    allowedToolClasses: ['read', 'write', 'execute', 'shell', 'network'],
    deniedToolClasses: ['database'],
    systemPromptRequirements: ['must match developer role', 'must use least privilege', 'must dry-run before write-capable skill deployment when available'],
    evidenceRequired: 'Interim developer authority plus real command output for any install/link/validation claim.',
  },
  {
    profileId: 'shell-operator-governed',
    shellState: 'operator',
    role: 'operator',
    scope: 'diagnostics, registry administration, and approved deployment evidence',
    authorityLevel: 'operator',
    desktopSubPath: 'SYSTEM_SETTINGS' as DesktopSubPath,
    allowedSkillPatterns: ['admin.*', 'skillshub.*', 'skills.*', 'supabase.registry.*'],
    allowedToolClasses: ['read', 'write', 'execute', 'shell', 'database', 'network', 'mcp'],
    deniedToolClasses: [],
    systemPromptRequirements: ['must match operator role', 'must record evidence', 'must not store secrets in public rows'],
    evidenceRequired: 'Operator authority and real command/database evidence; destructive actions require explicit user approval.',
  },
  {
    profileId: 'shell-skill-registry',
    shellState: 'skill_registry',
    role: 'skill_curator',
    scope: 'discover, inspect, validate, and link skills by allowed-tools metadata',
    authorityLevel: 'developer',
    desktopSubPath: 'LEARNING' as DesktopSubPath,
    allowedSkillPatterns: ['skillshub.*', 'skills.*', 'rust-skills.*'],
    allowedToolClasses: ['read', 'network', 'shell'],
    deniedToolClasses: ['database'],
    systemPromptRequirements: ['must check allowed-tools before granting access', 'must not claim install/link state without command evidence'],
    evidenceRequired: 'skillshub info/list/agents/link output or blocked/unverified status.',
  },
];

export function inferSkillToolClass(tool: string): SkillToolClass {
  const t = tool.trim().toLowerCase();
  if (!t) return 'unknown';
  if (['readfile', 'glob', 'rg', 'semanticsearch'].includes(t)) return 'read';
  if (['applypatch', 'editnotebook', 'delete'].includes(t)) return 'write';
  if (['shell', 'terminal', 'bash', 'cargo', 'skillshub', 'skills'].includes(t)) return 'shell';
  if (['webfetch', 'websearch', 'fetch', 'curl', 'git'].includes(t)) return 'network';
  if (['browser', 'browser_snapshot', 'browser_navigate'].some((name) => t.includes(name))) return 'browser';
  if (['supabase', 'psql', 'database', 'sql'].some((name) => t.includes(name))) return 'database';
  if (t.includes('mcp')) return 'mcp';
  if (['node', 'npm', 'tsx', 'python'].includes(t)) return 'execute';
  return 'unknown';
}

function selectProfile(input: SkillIntentAuthorityInput): SkillAuthorityProfile {
  if (input.activeSurfaceMode === 'skill_registry') {
    return DEFAULT_SKILL_AUTHORITY_PROFILES.find((profile) => profile.profileId === 'shell-skill-registry')!;
  }
  if (input.activeSurfaceMode === 'operator') {
    return DEFAULT_SKILL_AUTHORITY_PROFILES.find((profile) => profile.profileId === 'shell-operator-governed')!;
  }
  if (input.activeSurfaceMode === 'developer' || input.activeSurfaceMode === 'coding_agent') {
    return DEFAULT_SKILL_AUTHORITY_PROFILES.find((profile) => profile.profileId === 'shell-developer-bounded')!;
  }
  if (input.authStatus === 'guest') {
    return DEFAULT_SKILL_AUTHORITY_PROFILES.find((profile) => profile.profileId === 'shell-guest-readonly')!;
  }
  return DEFAULT_SKILL_AUTHORITY_PROFILES.find((profile) => profile.profileId === 'shell-primary-user')!;
}

function promptMatchesRole(systemPrompt: string | null | undefined, role: string): boolean {
  if (!systemPrompt?.trim()) return false;
  const prompt = systemPrompt.toLowerCase();
  const roleTerms = role.toLowerCase().split(/[_\s-]+/).filter(Boolean);
  return roleTerms.some((term) => prompt.includes(term));
}

export function evaluateSkillIntentAuthority(input: SkillIntentAuthorityInput): SkillIntentAuthorityDecision {
  const profile = selectProfile(input);
  const requestedTools = input.requestedTools ?? [];
  const skillAllowedTools = input.skillAllowedTools ?? [];
  const deniedTools: string[] = [];
  const allowedTools: string[] = [];

  if (profile.authorityLevel === 'developer' && input.interimAuthority && !input.interimAuthority.developerEligible) {
    return {
      ok: false,
      decision: 'blocked',
      profileId: profile.profileId,
      allowedTools: [],
      deniedTools: requestedTools,
      reason: 'Developer-level skill authority requires interim developer or operator shell authority.',
      evidenceRequired: profile.evidenceRequired,
    };
  }

  if (profile.authorityLevel === 'operator' && input.interimAuthority && !input.interimAuthority.operatorEligible) {
    return {
      ok: false,
      decision: 'blocked',
      profileId: profile.profileId,
      allowedTools: [],
      deniedTools: requestedTools,
      reason: 'Operator-level skill authority requires interim operator shell authority.',
      evidenceRequired: profile.evidenceRequired,
    };
  }

  for (const tool of requestedTools) {
    const toolClass = inferSkillToolClass(tool);
    const explicitSkillAllow = skillAllowedTools.length === 0 || skillAllowedTools.some((allowed) => allowed.toLowerCase() === tool.toLowerCase());
    if (profile.deniedToolClasses.includes(toolClass) || !profile.allowedToolClasses.includes(toolClass) || !explicitSkillAllow) {
      deniedTools.push(tool);
    } else {
      allowedTools.push(tool);
    }
  }

  if (deniedTools.length > 0) {
    return {
      ok: false,
      decision: 'denied',
      profileId: profile.profileId,
      allowedTools,
      deniedTools,
      reason: `Requested tools exceed role/scope authority for ${profile.role}.`,
      evidenceRequired: profile.evidenceRequired,
    };
  }

  const promptNeeded = requestedTools.length > 0 || Boolean(input.requestedSkill);
  if (promptNeeded && input.systemPrompt && !promptMatchesRole(input.systemPrompt, profile.role)) {
    return {
      ok: false,
      decision: 'denied',
      profileId: profile.profileId,
      allowedTools,
      deniedTools: requestedTools,
      reason: `System prompt does not match the required role journey for ${profile.role}.`,
      evidenceRequired: profile.evidenceRequired,
    };
  }

  return {
    ok: true,
    decision: requestedTools.length === 0 ? 'unverified' : 'allowed',
    profileId: profile.profileId,
    allowedTools,
    deniedTools: [],
    reason: requestedTools.length === 0
      ? 'No tool request was evaluated; expose registry read state only until a concrete skill/tool request is made.'
      : `Requested tools fit ${profile.role} authority and skill allowed-tools metadata.`,
    evidenceRequired: profile.evidenceRequired,
  };
}

export function evaluateShellSkillActionAuthority(params: {
  actionId: string;
  authStatus: 'guest' | 'authenticated';
  interimAuthority: InterimShellAuthority;
}): SkillIntentAuthorityDecision {
  if (!SKILL_RELATED_SHELL_ACTION_IDS.has(params.actionId)) {
    return {
      ok: true,
      decision: 'allowed',
      profileId: 'not-skill-related',
      allowedTools: [],
      deniedTools: [],
      reason: 'Shell action is not skill-authority related.',
      evidenceRequired: 'None.',
    };
  }

  const activeSurfaceMode = params.actionId === 'open_skill_registry' ? 'skill_registry' : 'coding_agent';
  return evaluateSkillIntentAuthority({
    activeSurfaceMode,
    authStatus: params.authStatus,
    desktopSubPath: activeSurfaceMode === 'skill_registry' ? ('LEARNING' as DesktopSubPath) : ('CODING' as DesktopSubPath),
    agentRole: activeSurfaceMode === 'skill_registry' ? 'skill_curator' : 'developer_operator',
    requestedSkill: params.actionId,
    requestedTools: params.actionId === 'open_skill_registry' ? [] : ['ReadFile'],
    interimAuthority: params.interimAuthority,
  });
}
