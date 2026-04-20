export type ShellLoyaltyState = 'platform_first' | 'user_first';

export type ShellPromptVariable = {
  label: string;
  value: string;
};

export type ShellPromptContract = {
  loyaltyState: ShellLoyaltyState;
  loyaltyLabel: string;
  loyaltySummary: string;
  loyaltyReason: string;
  missionSummary: string;
  disclosureCopy: string;
  promptLines: string[];
  variables: ShellPromptVariable[];
};

type BuildShellPromptContractParams = {
  commanderName?: string | null;
  interactionMode: 'voice' | 'chat';
  currentIntent?: string | null;
  availableSkills?: string[];
};

export function resolveShellLoyaltyState(commanderName?: string | null): ShellLoyaltyState {
  return commanderName?.trim() ? 'user_first' : 'platform_first';
}

export function buildShellPromptContract({
  commanderName,
  interactionMode,
  currentIntent,
  availableSkills = [],
}: BuildShellPromptContractParams): ShellPromptContract {
  const loyaltyState = resolveShellLoyaltyState(commanderName);
  const cleanCommanderName = commanderName?.trim() || null;
  const loyaltyLabel =
    loyaltyState === 'user_first'
      ? `${cleanCommanderName ?? 'Signed-in user'} loyalty active`
      : 'Platform loyalty active';
  const loyaltySummary =
    loyaltyState === 'user_first'
      ? `This session is now loyal to ${cleanCommanderName ?? 'the signed-in user'} and should act in their best interest.`
      : 'Before account creation, this session is loyal to the platform and must disclose that state clearly.';
  const loyaltyReason =
    loyaltyState === 'user_first'
      ? 'An account or profile is now present in the session, so loyalty transfers immediately to the identified user.'
      : 'No account is present yet, so the platform remains the initial loyalty boundary until the user creates one.';
  const missionSummary =
    'Identify the problem, focus on the crisis, and present the solution in clear, direct language.';
  const disclosureCopy =
    loyaltyState === 'user_first'
      ? `AI OS is currently loyal to ${cleanCommanderName ?? 'the signed-in user'}.`
      : 'AI OS is currently loyal to the platform until an account is created.';
  const promptLines = [
    `LOYALTY STATE: ${loyaltyState === 'user_first' ? 'user_first' : 'platform_first'}.`,
    loyaltyState === 'user_first'
      ? `You are loyal to ${cleanCommanderName ?? 'the signed-in user'} in this session and must act in that user's best interest.`
      : 'You are loyal to the platform in this session because no account has been created yet. You must disclose that state clearly when relevant.',
    loyaltyState === 'user_first'
      ? `Disclose that loyalty changed immediately after account creation or sign-in for ${cleanCommanderName ?? 'the signed-in user'}.`
      : 'Explain that loyalty changes instantly to the user once they create an account or sign in.',
    'Do not hide the loyalty state, the reason for it, or what changes the moment an account exists.',
    'Your operating mission is to identify the problem, focus on the crisis, and present the solution.',
    `Current interaction mode: ${interactionMode}.`,
    `Current declared intent: ${currentIntent?.trim() || 'idle'}.`,
    `Available skills count: ${availableSkills.length}.`,
  ];
  const variables: ShellPromptVariable[] = [
    { label: 'loyalty_state', value: loyaltyState },
    { label: 'commander_name', value: cleanCommanderName ?? 'none' },
    { label: 'interaction_mode', value: interactionMode },
    { label: 'current_intent', value: currentIntent?.trim() || 'idle' },
    {
      label: 'available_skills',
      value: availableSkills.length > 0 ? availableSkills.join(', ') : 'none declared',
    },
  ];

  return {
    loyaltyState,
    loyaltyLabel,
    loyaltySummary,
    loyaltyReason,
    missionSummary,
    disclosureCopy,
    promptLines,
    variables,
  };
}
